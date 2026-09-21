import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json(
      { error: "位置情報が必要です" },
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

  const url =
    `https://www.google.com/maps/embed/v1/place` +
    `?key=${apiKey}` +
    `&q=${encodeURIComponent(`${lat},${lng}`)}` +
    `&zoom=17`;

  return NextResponse.redirect(url);
}
