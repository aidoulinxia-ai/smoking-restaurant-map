import { NextResponse } from "next/server";

function getSmokingType(smokingText) {
  if (!smokingText) {
    return "unknown";
  }

  if (smokingText.includes("全面禁煙")) {
    return "non_smoking";
  }

  if (
    smokingText.includes("加熱式") ||
    smokingText.includes("加熱式たばこ")
  ) {
    return "heated_candidate";
  }

  if (
    smokingText.includes("喫煙室") ||
    smokingText.includes("喫煙専用室")
  ) {
    return "smoking_room";
  }

  if (
    smokingText.includes("禁煙席なし") ||
    smokingText.includes("全席喫煙可")
  ) {
    return "smoking_candidate";
  }

  return "unknown";
}

function formatRestaurant(shop) {
  const smokingText =
    shop.non_smoking || "";

  return {
    id: shop.id,
    name: shop.name,
    address: shop.address,
    lat: shop.lat,
    lng: shop.lng,
    genre: shop.genre?.name || "",
    budget: shop.budget?.name || "",
    photo: shop.photo?.mobile?.l || "",
    open: shop.open || "",
    access: shop.access || "",
    smoking: smokingText,
    smokingType:
      getSmokingType(smokingText),
    urls: shop.urls?.pc || "",
  };
}

export async function GET(request) {
  try {
    const { searchParams } =
      new URL(request.url);

    const lat =
      searchParams.get("lat");

    const lng =
      searchParams.get("lng");

    const id =
      searchParams.get("id")?.trim() || "";

    const keyword =
      searchParams.get("keyword")?.trim() || "";

    const apiKey =
      process.env.HOTPEPPER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "APIキーが設定されていません",
        },
        { status: 500 }
      );
    }

    /*
      店舗IDが指定された場合は、
      Hot Pepperからその店舗を直接取得する。
    */
    if (id) {
      const params =
        new URLSearchParams({
          key: apiKey,
          id,
          count: "1",
          format: "json",
        });

      const response = await fetch(
        `https://webservice.recruit.co.jp/hotpepper/gourmet/v1/?${params.toString()}`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Hot Pepper APIの取得に失敗しました"
        );
      }

      const data =
        await response.json();

      const shop =
        data.results?.shop?.[0];

      if (!shop) {
        return NextResponse.json(
          {
            error:
              "店舗情報が見つかりませんでした",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        restaurant:
          formatRestaurant(shop),
      });
    }

    /*
      ここから下は今まで通りの
      現在地・エリア検索。
    */
    if (!lat || !lng) {
      return NextResponse.json(
        {
          error:
            "検索地点が必要です",
        },
        { status: 400 }
      );
    }

    const params =
      new URLSearchParams({
        key: apiKey,
        lat,
        lng,
        range: "5",
        count: "100",
        format: "json",
      });

    if (keyword) {
      params.set(
        "keyword",
        keyword
      );
    }

    const response = await fetch(
      `https://webservice.recruit.co.jp/hotpepper/gourmet/v1/?${params.toString()}`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(
        "Hot Pepper APIの取得に失敗しました"
      );
    }

    const data =
      await response.json();

    const restaurants =
      data.results?.shop?.map(
        formatRestaurant
      ) || [];

    const smokingSummary =
      restaurants.reduce(
        (summary, restaurant) => {
          const type =
            restaurant.smokingType;

          summary[type] =
            (summary[type] || 0) + 1;

          return summary;
        },
        {}
      );

    return NextResponse.json({
      count: restaurants.length,
      keyword,
      smokingSummary,
      restaurants,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          "店舗情報を取得できませんでした",
      },
      { status: 500 }
    );
  }
}
