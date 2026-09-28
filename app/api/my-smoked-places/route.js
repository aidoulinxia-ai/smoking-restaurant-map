import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const ACCESS_COOKIE = "smoke-map-access-token";

export async function GET() {
  try {
    const supabaseUrl =
      process.env.SUPABASE_URL;
    const supabaseSecretKey =
      process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseSecretKey) {
      return NextResponse.json(
        {
          error:
            "Supabaseの接続設定がありません",
        },
        { status: 500 }
      );
    }

    const cookieStore = await cookies();

    const accessToken = cookieStore.get(
      ACCESS_COOKIE
    )?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: "ログインが必要です" },
        { status: 401 }
      );
    }

    const userResponse = await fetch(
      `${supabaseUrl}/auth/v1/user`,
      {
        headers: {
          apikey: supabaseSecretKey,
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

    if (!userResponse.ok) {
      return NextResponse.json(
        { error: "ログインが必要です" },
        { status: 401 }
      );
    }

    const user = await userResponse.json();

    if (!user?.id) {
      return NextResponse.json(
        { error: "ログインが必要です" },
        { status: 401 }
      );
    }

    const params = new URLSearchParams({
      user_id: `eq.${user.id}`,
      select:
        "id,restaurant_id,restaurant_name,smoking_status,created_at",
      order: "created_at.desc",
      limit: "500",
    });

    const reportsResponse = await fetch(
      `${supabaseUrl}/rest/v1/smoking_reports?${params.toString()}`,
      {
        headers: {
          apikey: supabaseSecretKey,
          Authorization: `Bearer ${supabaseSecretKey}`,
        },
        cache: "no-store",
      }
    );

    if (!reportsResponse.ok) {
      const detail =
        await reportsResponse.text();

      console.error(
        "My smoked places read failed:",
        detail
      );

      return NextResponse.json(
        {
          error:
            "吸えた店を取得できませんでした",
        },
        { status: 500 }
      );
    }

    const reports =
      await reportsResponse.json();

    const latestByRestaurant = new Map();

    for (const report of reports) {
      const restaurantId = String(
        report.restaurant_id
      );

      if (
        !latestByRestaurant.has(
          restaurantId
        )
      ) {
        latestByRestaurant.set(
          restaurantId,
          report
        );
      }
    }

    const places = Array.from(
      latestByRestaurant.values()
    )
      .filter(
        (report) =>
          report.smoking_status ===
            "paper_ok" ||
          report.smoking_status ===
            "heated_only"
      )
      .map((report) => ({
        restaurantId:
          report.restaurant_id,
        restaurantName:
          report.restaurant_name,
        smokingStatus:
          report.smoking_status,
        reportedAt:
          report.created_at,
      }));

    return NextResponse.json({
      places,
      total: places.length,
    });
  } catch (error) {
    console.error(
      "My smoked places API failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "吸えた店を取得できませんでした",
      },
      { status: 500 }
    );
  }
}
