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
      limit: "100",
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
        "My reports read failed:",
        detail
      );

      return NextResponse.json(
        {
          error:
            "報告履歴を取得できませんでした",
        },
        { status: 500 }
      );
    }

    const reports =
      await reportsResponse.json();

    return NextResponse.json({
      reports,
      total: reports.length,
    });
  } catch (error) {
    console.error(
      "My reports API failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "報告履歴を取得できませんでした",
      },
      { status: 500 }
    );
  }
}
