import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurantId");

    if (!restaurantId) {
      return NextResponse.json(
        { error: "店舗IDが必要です" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseSecretKey) {
      return NextResponse.json(
        { error: "Supabaseの接続設定がありません" },
        { status: 500 }
      );
    }

    const params = new URLSearchParams({
      restaurant_id: `eq.${restaurantId}`,
      select: "smoking_status,created_at",
      order: "created_at.desc",
      limit: "20",
    });

    const response = await fetch(
      `${supabaseUrl}/rest/v1/smoking_reports?${params.toString()}`,
      {
        headers: {
          apikey: supabaseSecretKey,
          Authorization: `Bearer ${supabaseSecretKey}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      console.error("Supabase read failed:", detail);

      return NextResponse.json(
        { error: "喫煙情報を取得できませんでした" },
        { status: 500 }
      );
    }

    const reports = await response.json();

    const latestReport = reports[0] || null;
    const smokedCount = reports.filter(
      (report) =>
        report.smoking_status === "paper_ok" ||
        report.smoking_status === "heated_only"
    ).length;

    return NextResponse.json({
      total: reports.length,
      smokedCount,
      latestReport,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "喫煙情報を取得できませんでした" },
      { status: 500 }
    );
  }
}
