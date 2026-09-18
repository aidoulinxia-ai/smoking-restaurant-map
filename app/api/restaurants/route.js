import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");

    if (!lat || !lng) {
      return NextResponse.json(
        { error: "現在地が必要です" },
        { status: 400 }
      );
    }

    const apiKey = process.env.HOTPEPPER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "APIキーが設定されていません" },
        { status: 500 }
      );
    }

    const params = new URLSearchParams({
      key: apiKey,
      lat,
      lng,
      range: "3",
      count: "30",
      format: "json",
    });

    const response = await fetch(
      `https://webservice.recruit.co.jp/hotpepper/gourmet/v1/?${params.toString()}`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error("Hot Pepper APIの取得に失敗しました");
    }

    const data = await response.json();

    const restaurants =
      data.results?.shop?.map((shop) => ({
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
        smoking: shop.non_smoking || "",
        urls: shop.urls?.pc || "",
      })) || [];

    return NextResponse.json({
      count: restaurants.length,
      restaurants,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "店舗情報を取得できませんでした" },
      { status: 500 }
    );
  }
}
