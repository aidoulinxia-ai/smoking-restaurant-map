
import { NextResponse } from "next/server";

const CACHE_DURATION = 24 * 60 * 60 * 1000;
const ratingCache = new Map();

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
    const now = Date.now();

    await Promise.all(
      targetRestaurants.map(async (restaurant) => {
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
          return;
        }

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
            const detail = await response.text();
            console.error(
              "Google Places search failed:",
              restaurant.name,
              detail
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
      })
    );

    return NextResponse.json({ ratings });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Google評価を取得できませんでした" },
      { status: 500 }
    );
  }
}
