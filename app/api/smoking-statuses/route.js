import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { restaurantIds } = await request.json();

    if (
      !Array.isArray(restaurantIds) ||
      restaurantIds.length === 0
    ) {
      return NextResponse.json({
        statuses: {},
      });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseSecretKey =
      process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseSecretKey) {
      return NextResponse.json(
        { error: "Supabaseの接続設定がありません" },
        { status: 500 }
      );
    }

    const ids = restaurantIds
      .map((id) => String(id))
      .filter(Boolean)
      .slice(0, 100);

    if (ids.length === 0) {
      return NextResponse.json({
        statuses: {},
      });
    }

    const escapedIds = ids.map(
      (id) =>
        `"${id
          .replace(/\\/g, "\\\\")
          .replace(/"/g, '\\"')}"`
    );

    const params = new URLSearchParams({
      restaurant_id: `in.(${escapedIds.join(",")})`,
      select:
        "restaurant_id,smoking_status,created_at",
      order: "created_at.desc",
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

      console.error(
        "Supabase statuses read failed:",
        detail
      );

      return NextResponse.json(
        { error: "喫煙情報を取得できませんでした" },
        { status: 500 }
      );
    }

    const reports = await response.json();

    const statuses = {};

    for (const report of reports) {
      const restaurantId = String(
        report.restaurant_id
      );

      if (!statuses[restaurantId]) {
        statuses[restaurantId] = {
          latestCreatedAt: report.created_at,
          latestStatus: report.smoking_status,
        };
      }
    }

    return NextResponse.json({
      statuses,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "喫煙情報を取得できませんでした" },
      { status: 500 }
    );
  }
}
