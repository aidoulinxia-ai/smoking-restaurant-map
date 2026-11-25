import { NextResponse } from "next/server";

const SERVICE_KEY = "google_maps_js";

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
        "Google Maps利用枠の確保に失敗:",
        response.status,
        await response.text()
      );

      return false;
    }

    return (await response.json()) === true;
  } catch (error) {
    console.error(
      "Google Maps利用枠エラー:",
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
    店舗一覧から引き続き<br />
    お店をお探しいただけます。
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

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Google Maps APIキーがありません" },
      { status: 500 }
    );
  }

  const centerLat = Number(searchParams.get("lat"));
  const centerLng = Number(searchParams.get("lng"));
  const restaurantsParam =
    searchParams.get("restaurants");

  const showCurrentLocation =
    searchParams.get("showCurrentLocation") !== "false";

  if (
    !Number.isFinite(centerLat) ||
    !Number.isFinite(centerLng)
  ) {
    return NextResponse.json(
      { error: "検索地点が必要です" },
      { status: 400 }
    );
  }

  if (!restaurantsParam) {
    return NextResponse.json(
      { error: "店舗情報が必要です" },
      { status: 400 }
    );
  }

  let restaurants;

  try {
    restaurants = JSON.parse(restaurantsParam);
  } catch {
    return NextResponse.json(
      { error: "店舗情報が不正です" },
      { status: 400 }
    );
  }

  if (!Array.isArray(restaurants)) {
    return NextResponse.json(
      { error: "店舗情報が不正です" },
      { status: 400 }
    );
  }

  const validRestaurants = restaurants
    .filter(
      (restaurant) =>
        restaurant &&
        typeof restaurant === "object"
    )
    .map((restaurant) => ({
      id: String(restaurant.id || ""),
      name: String(restaurant.name || ""),
      lat: Number(restaurant.lat),
      lng: Number(restaurant.lng),
    }))
    .filter(
      (restaurant) =>
        restaurant.id &&
        Number.isFinite(restaurant.lat) &&
        Number.isFinite(restaurant.lng)
    )
    .slice(0, 100);

  if (validRestaurants.length === 0) {
    return NextResponse.json(
      {
        error:
          "地図に表示できる店舗がありません",
      },
      { status: 400 }
    );
  }

  const reserved =
    await reserveExternalServiceUsage();

  if (!reserved) {
    return mapUnavailableResponse();
  }

  const safeRestaurants = JSON.stringify(
    validRestaurants
  ).replace(/</g, "\\u003c");

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
    html,
    body,
    #map {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
    }
  </style>
</head>

<body>
  <div id="map"></div>

  <script>
    const restaurants = ${safeRestaurants};

    const searchCenter = {
      lat: ${centerLat},
      lng: ${centerLng}
    };

    const showCurrentLocation = ${showCurrentLocation};

    function initMap() {
      const map = new google.maps.Map(
        document.getElementById("map"),
        {
          center: searchCenter,
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false
        }
      );

      const bounds =
        new google.maps.LatLngBounds();

      if (showCurrentLocation) {
        new google.maps.Marker({
          position: searchCenter,
          map: map,
          title: "現在地",
          zIndex: 9999,
          icon: {
            path:
              google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#4285F4",
            fillOpacity: 1,
            strokeColor: "#FFFFFF",
            strokeOpacity: 1,
            strokeWeight: 4
          }
        });
      }

      bounds.extend(searchCenter);

      restaurants.forEach(
        (restaurant) => {
          const position = {
            lat: restaurant.lat,
            lng: restaurant.lng
          };

          const marker =
            new google.maps.Marker({
              position: position,
              map: map,
              title: restaurant.name
            });

          bounds.extend(position);

          marker.addListener(
            "click",
            () => {
              window.parent.postMessage(
                {
                  type:
                    "SMOKE_MAP_RESTAURANT",
                  restaurantId:
                    restaurant.id
                },
                window.location.origin
              );
            }
          );
        }
      );

      map.fitBounds(bounds, 50);
    }
  </script>

  <script
    async
    src="https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&callback=initMap">
  </script>
</body>
</html>
  `;

  return new NextResponse(html, {
    headers: {
      "Content-Type":
        "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
