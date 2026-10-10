
import { NextResponse } from "next/server";

const DAILY_API_LIMIT = 100;

async function reserveGoogleApiRequest() {
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
          p_count: 1,
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
    console.error(
      "Google API利用枠エラー:",
      error
    );

    return false;
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const area = searchParams.get("area")?.trim();

    if (!area) {
      return NextResponse.json(
        {
          error: "エリア名を入力してください",
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "Google Places APIキーがありません",
        },
        { status: 500 }
      );
    }

    // Google APIを呼び出す前に
    // Supabaseで利用枠を1回分確保する
    const reserved =
      await reserveGoogleApiRequest();

    if (!reserved) {
      return NextResponse.json(
        {
          error:
            "Google APIの利用上限に達したか、利用枠を確認できませんでした",
          limitReached: true,
        },
        { status: 429 }
      );
    }

    // Google Places APIで場所を検索
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
        {
          error: "エリアを検索できませんでした",
        },
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
        {
          error: "エリアが見つかりませんでした",
        },
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
    console.error(
      "エリア検索エラー:",
      error
    );

    return NextResponse.json(
      {
        error: "エリア検索に失敗しました",
      },
      { status: 500 }
    );
  }
}
