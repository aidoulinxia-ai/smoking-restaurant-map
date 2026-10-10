
import { NextResponse } from "next/server";

const CACHE_DURATION = 24 * 60 * 60 * 1000;
const DAILY_API_LIMIT = 100;
const ratingCache = new Map();

function getSupabaseConfig() {
  return {
    url: process.env.SUPABASE_URL,
    key:
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SECRET_KEY,
  };
}

function getHeaders(key) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

async function getStoredRatings(queries) {
  const { url, key } = getSupabaseConfig();

  if (!url || !key) {
    throw new Error("Supabase接続設定がありません");
  }

  const results = new Map();

  for (let i = 0; i < queries.length; i += 20) {
    const batch = queries.slice(i, i + 20);

    const filter = batch
      .map(
        (query) =>
          `text_query.eq.${encodeURIComponent(query)}`
      )
      .join(",");

    const response = await fetch(
      `${url}/rest/v1/google_ratings_cache?select=*&or=(${filter})`,
      {
        headers: getHeaders(key),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(
        `キャッシュ取得失敗: ${response.status}`
      );
    }

    const rows = await response.json();

    for (const row of rows) {
      results.set(row.text_query, row);
    }
  }

  return results;
}

async function saveRating(textQuery, rating) {
  const { url, key } = getSupabaseConfig();

  if (!url || !key) {
    return false;
  }

  try {
    const response = await fetch(
      `${url}/rest/v1/google_ratings_cache?on_conflict=text_query`,
      {
        method: "POST",
        headers: {
          ...getHeaders(key),
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify({
          text_query: textQuery,
          place_id: rating.placeId,
          rating: rating.rating,
          user_rating_count: rating.userRatingCount,
          updated_at: new Date().toISOString(),
        }),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error(
        "評価キャッシュ保存失敗:",
        response.status,
        await response.text()
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("評価キャッシュ保存エラー:", error);
    return false;
  }
}

async function reserveGoogleApiRequests(count) {
  const { url, key } = getSupabaseConfig();

  if (!url || !key) {
    console.error("Supabase接続設定がありません");
    return false;
  }

  try {
    const response = await fetch(
      `${url}/rest/v1/rpc/reserve_google_api_requests`,
      {
        method: "POST",
        headers: getHeaders(key),
        body: JSON.stringify({
          p_count: count,
          p_limit: DAILY_API_LIMIT,
        }),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error(
        "Google API利用枠の確保に失敗:",
        response.status,
        await response.text()
      );
      return false;
    }

    return (await response.json()) === true;
  } catch (error) {
    console.error("Google API利用枠エラー:", error);
    return false;
  }
}

export async function POST(request) {
  try {
    const { restaurants } = await request.json();

    if (!Array.isArray(restaurants) || restaurants.length === 0) {
      return NextResponse.json({ ratings: {} });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Google Places APIキーがありません" },
        { status: 500 }
      );
    }

    const targetRestaurants = restaurants
      .filter(
        (restaurant) =>
          restaurant &&
          restaurant.id &&
          restaurant.name
      )
      .slice(0, 20);

    const ratings = {};
    const pending = [];
    const now = Date.now();

    for (const restaurant of targetRestaurants) {
      const restaurantId = String(restaurant.id);

      const textQuery = [
        restaurant.name,
        restaurant.address,
      ]
        .filter(Boolean)
        .join(" ");

      const cached = ratingCache.get(textQuery);

      if (
        cached &&
        now - cached.timestamp < CACHE_DURATION
      ) {
        ratings[restaurantId] = cached.rating;
      } else {
        pending.push({
          restaurant,
          restaurantId,
          textQuery,
        });
      }
    }

    if (pending.length === 0) {
      return NextResponse.json({ ratings });
    }

    let storedRatings;

    try {
      storedRatings = await getStoredRatings(
        [...new Set(pending.map((item) => item.textQuery))]
      );
    } catch (error) {
      console.error("評価キャッシュ確認失敗:", error);

      return NextResponse.json({
        ratings,
        cacheUnavailable: true,
      });
    }

    const uncachedRestaurants = [];

    for (const item of pending) {
      const stored = storedRatings.get(item.textQuery);

      if (
        stored &&
        Number.isFinite(
          Date.parse(stored.updated_at)
        ) &&
        now - Date.parse(stored.updated_at) <
          CACHE_DURATION
      ) {
        const rating = {
          placeId: stored.place_id || null,
          rating:
            typeof stored.rating === "number"
              ? stored.rating
              : null,
          userRatingCount:
            typeof stored.user_rating_count === "number"
              ? stored.user_rating_count
              : 0,
        };

        ratings[item.restaurantId] = rating;

        ratingCache.set(item.textQuery, {
          rating,
          timestamp: Date.parse(stored.updated_at),
        });
      } else {
        uncachedRestaurants.push(item);
      }
    }

    if (uncachedRestaurants.length === 0) {
      return NextResponse.json({
        ratings,
        limitReached: false,
      });
    }

    const uniqueQueries = [
      ...new Set(
        uncachedRestaurants.map((item) => item.textQuery)
      ),
    ];

    const reserved = await reserveGoogleApiRequests(
      uniqueQueries.length
    );

    if (!reserved) {
      return NextResponse.json({
        ratings,
        limitReached: true,
      });
    }

    const fetchedRatings = new Map();

    await Promise.all(
      uniqueQueries.map(async (textQuery) => {
        try {
          const response = await fetch(
            "https://places.googleapis.com/v1/places:searchText",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": apiKey,
                "X-Goog-FieldMask":
                  "places.id,places.rating,places.userRatingCount",
              },
              body: JSON.stringify({
                textQuery,
                languageCode: "ja",
                regionCode: "JP",
                maxResultCount: 1,
              }),
              cache: "no-store",
            }
          );

          if (!response.ok) {
            console.error(
              "Google Places search failed:",
              textQuery,
              await response.text()
            );
            return;
          }

          const data = await response.json();
          const place = data.places?.[0];

          if (!place) return;

          const rating = {
            placeId: place.id || null,
            rating:
              typeof place.rating === "number"
                ? place.rating
                : null,
            userRatingCount:
              typeof place.userRatingCount === "number"
                ? place.userRatingCount
                : 0,
          };

          fetchedRatings.set(textQuery, rating);

          const timestamp = Date.now();

          ratingCache.set(textQuery, {
            rating,
            timestamp,
          });

          await saveRating(textQuery, rating);
        } catch (error) {
          console.error(
            "Google rating failed:",
            textQuery,
            error
          );
        }
      })
    );

    for (const item of uncachedRestaurants) {
      const rating = fetchedRatings.get(item.textQuery);

      if (rating) {
        ratings[item.restaurantId] = rating;
      }
    }

    return NextResponse.json({
      ratings,
      limitReached: false,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Google評価を取得できませんでした" },
      { status: 500 }
    );
  }
}
