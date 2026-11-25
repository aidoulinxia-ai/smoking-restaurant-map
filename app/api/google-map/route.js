import { NextResponse } from "next/server";

const SERVICE_KEY = "google_maps_embed";

async function reserveExternalServiceUsage() {
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
      `${supabaseUrl}/rest/v1/rpc/reserve_external_service_usage`,
      {
        method: "POST",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_service_key: SERVICE_KEY,
          p_count: 1,
        }),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error(
        "Google Maps Embed利用枠の確保に失敗:",
        response.status,
        await response.text()
      );

      return false;
    }

    return (await response.json()) === true;
  } catch (error) {
    console.error(
      "Google Maps Embed利用枠エラー:",
      error
    );

    return false;
  }
}

function mapUnavailableResponse() {
  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />
  <style>
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
    }

    body {
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;
      font-family: sans-serif;
      color: #555;
      text-align: center;
    }

    .message {
      padding: 24px;
      line-height: 1.8;
      font-size: 14px;
    }

    .title {
      font-weight: bold;
      font-size: 16px;
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <div class="message">
    <div class="title">
      現在、地図を表示できません
    </div>
    店舗情報は引き続き<br />
    ご確認いただけます。
  </div>
</body>
</html>
  `;

  return new NextResponse(html, {
    status: 429,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (
    !lat ||
    !lng ||
    !Number.isFinite(Number(lat)) ||
    !Number.isFinite(Number(lng)) ||
    Math.abs(Number(lat)) > 90 ||
    Math.abs(Number(lng)) > 180
  ) {
    return NextResponse.json(
      { error: "有効な位置情報が必要です" },
      { status: 400 }
    );
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Google Maps APIキーがありません" },
      { status: 500 }
    );
  }

  const reserved =
    await reserveExternalServiceUsage();

  if (!reserved) {
    return mapUnavailableResponse();
  }

  const url =
    `https://www.google.com/maps/embed/v1/place` +
    `?key=${encodeURIComponent(apiKey)}` +
    `&q=${encodeURIComponent(`${lat},${lng}`)}` +
    `&zoom=17`;

  const response = NextResponse.redirect(url);

  response.headers.set(
    "Cache-Control",
    "no-store"
  );

  return response;
}
