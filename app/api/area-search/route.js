import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const area = searchParams.get("area")?.trim();

    if (!area) {
      return NextResponse.json(
        { error: "エリア名を入力してください" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Google Places APIキーがありません" },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "places.displayName,places.formattedAddress,places.location",
        },
        body: JSON.stringify({
          textQuery: `${area} 日本`,
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
        "Google Places area search failed:",
        detail
      );

      return NextResponse.json(
        { error: "エリアを検索できませんでした" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const place = data.places?.[0];

    if (
      !place ||
      typeof place.location?.latitude !== "number" ||
      typeof place.location?.longitude !== "number"
    ) {
      return NextResponse.json(
        { error: "エリアが見つかりませんでした" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      area: place.displayName?.text || area,
      address: place.formattedAddress || "",
      lat: place.location.latitude,
      lng: place.location.longitude,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "エリア検索に失敗しました" },
      { status: 500 }
    );
  }
}
