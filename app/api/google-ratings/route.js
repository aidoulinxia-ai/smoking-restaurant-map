
import { NextResponse } from "next/server";

const CACHE_DURATION = 24 * 60 * 60 * 1000;
const DAILY_API_LIMIT = 100;
const ratingCache = new Map();

async function reserveGoogleApiRequests(count) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase接続設定がありません");
    return false;
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/rpc/reserve_google_api_requests`,
      {
        method: "POST",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
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
    const uncachedRestaurants = [];
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

      if (cached && now - cached.timestamp < CACHE_DURATION) {
        ratings[restaurantId] = cached.rating;
      } else {
        uncachedRestaurants.push({
          restaurant,
          restaurantId,
          textQuery,
        });
      }
    }

    if (uncachedRestaurants.length === 0) {
      return NextResponse.json({ ratings });
    }

    // Google APIを呼ぶ前に、Supabaseで利用枠を確保する。
    // 失敗した場合はGoogle APIを呼ばない。
    const reserved = await reserveGoogleApiRequests(
      uncachedRestaurants.length
    );

    if (!reserved) {
      return NextResponse.json({
        ratings,
        limitReached: true,
      });
    }

    await Promise.all(
      uncachedRestaurants.map(
        async ({ restaurant, restaurantId, textQuery }) => {
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
                restaurant.name,
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

            ratings[restaurantId] = rating;

            ratingCache.set(textQuery, {
              rating,
              timestamp: Date.now(),
            });
          } catch (error) {
            console.error(
              "Google rating failed:",
              restaurant.name,
              error
            );
          }
        }
      )
    );

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
