import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Google Maps APIキーがありません" },
      { status: 500 }
    );
  }

  const userLat = Number(searchParams.get("lat"));
  const userLng = Number(searchParams.get("lng"));
  const restaurantsParam = searchParams.get("restaurants");

  if (
    !Number.isFinite(userLat) ||
    !Number.isFinite(userLng)
  ) {
    return NextResponse.json(
      { error: "現在地が必要です" },
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
    .slice(0, 30);

  if (validRestaurants.length === 0) {
    return NextResponse.json(
      { error: "地図に表示できる店舗がありません" },
      { status: 400 }
    );
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

    const userLocation = {
      lat: ${userLat},
      lng: ${userLng}
    };

    function initMap() {
      const map = new google.maps.Map(
        document.getElementById("map"),
        {
          center: userLocation,
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false
        }
      );

      const bounds = new google.maps.LatLngBounds();

      const userMarker = new google.maps.Marker({
        position: userLocation,
        map,
        title: "現在地",
        zIndex: 1000,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: "#4285F4",
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 3
        }
      });

      bounds.extend(userLocation);

      restaurants.forEach((restaurant) => {
        const position = {
          lat: restaurant.lat,
          lng: restaurant.lng
        };

        const marker = new google.maps.Marker({
          position,
          map,
          title: restaurant.name
        });

        bounds.extend(position);

        marker.addListener("click", () => {
          window.parent.postMessage(
            {
              type: "SMOKE_MAP_RESTAURANT",
              restaurantId: restaurant.id
            },
            window.location.origin
          );
        });
      });

      if (restaurants.length > 0) {
        map.fitBounds(bounds, 50);
      }
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
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
