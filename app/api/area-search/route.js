
import { NextResponse } from "next/server";

const DAILY_API_LIMIT = 100;
const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000;

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

async function getCachedArea(searchQuery) {
  const { url, key } = getSupabaseConfig();

  if (!url || !key) {
    throw new Error("Supabase接続設定がありません");
  }

  const response = await fetch(
    `${url}/rest/v1/area_search_cache?search_query=eq.${encodeURIComponent(searchQuery)}&select=*`,
    {
      headers: getHeaders(key),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `エリアキャッシュ取得失敗: ${response.status}`
    );
  }

  const rows = await response.json();
  return rows[0] || null;
}

async function saveCachedArea(searchQuery, result) {
  const { url, key } = getSupabaseConfig();

  if (!url || !key) return false;

  try {
    const response = await fetch(
      `${url}/rest/v1/area_search_cache?on_conflict=search_query`,
      {
        method: "POST",
        headers: {
          ...getHeaders(key),
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify({
          search_query: searchQuery,
          area: result.area,
          address: result.address,
          lat: result.lat,
          lng: result.lng,
          updated_at: new Date().toISOString(),
        }),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error(
        "エリアキャッシュ保存失敗:",
        response.status,
        await response.text()
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("エリアキャッシュ保存エラー:", error);
    return false;
  }
}

async function reserveGoogleApiRequest() {
  const { url, key } = getSupabaseConfig();

  if (!url || !key) return false;

  try {
    const response = await fetch(
      `${url}/rest/v1/rpc/reserve_google_api_requests`,
      {
        method: "POST",
        headers: getHeaders(key),
        body: JSON.stringify({
          p_count: 1,
          p_limit: DAILY_API_LIMIT,
        }),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error(
        "Google API利用枠確保失敗:",
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

    const searchQuery = area
      .normalize("NFKC")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();

    let cached;

    try {
      cached = await getCachedArea(searchQuery);
    } catch (error) {
      console.error(error);

      return NextResponse.json(
        { error: "エリア検索を一時的に利用できません" },
        { status: 503 }
      );
    }

    if (cached) {
      const cachedTime = Date.parse(cached.updated_at);

      if (
        Number.isFinite(cachedTime) &&
        Date.now() - cachedTime < CACHE_DURATION
      ) {
        return NextResponse.json({
          area: cached.area,
          address: cached.address,
          lat: cached.lat,
          lng: cached.lng,
        });
      }
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Google Places APIキーがありません" },
        { status: 500 }
      );
    }

    const reserved = await reserveGoogleApiRequest();

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
      console.error(
        "Google Places area search failed:",
        await response.text()
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

    const result = {
      area: place.displayName?.text || area,
      address: place.formattedAddress || "",
      lat: place.location.latitude,
      lng: place.location.longitude,
    };

    await saveCachedArea(searchQuery, result);

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "エリア検索に失敗しました" },
      { status: 500 }
    );
  }
}
