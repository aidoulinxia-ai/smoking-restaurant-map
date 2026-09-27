import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();

    const accessToken = cookieStore.get(
      "smoke-map-access-token"
    )?.value;

    if (!accessToken) {
      return NextResponse.json({
        loggedIn: false,
        user: null,
      });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseSecretKey =
      process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseSecretKey) {
      return NextResponse.json(
        {
          error: "Supabaseの接続設定がありません",
        },
        { status: 500 }
      );
    }

    const response = await fetch(
      `${supabaseUrl}/auth/v1/user`,
      {
        headers: {
          apikey: supabaseSecretKey,
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return NextResponse.json({
        loggedIn: false,
        user: null,
      });
    }

    const user = await response.json();

    return NextResponse.json({
      loggedIn: true,
      user: {
        id: user.id,
        email: user.email || "",
        nickname:
          user.user_metadata?.nickname || "",
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          "ログイン情報を確認できませんでした",
      },
      { status: 500 }
    );
  }
}
