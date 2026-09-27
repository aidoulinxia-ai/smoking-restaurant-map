import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    const cleanEmail = String(email || "")
      .trim()
      .toLowerCase();

    if (!cleanEmail || !password) {
      return NextResponse.json(
        {
          error:
            "メールアドレスとパスワードを入力してください",
        },
        { status: 400 }
      );
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

    const supabaseResponse = await fetch(
      `${supabaseUrl}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          apikey: supabaseSecretKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: cleanEmail,
          password,
        }),
        cache: "no-store",
      }
    );

    const data = await supabaseResponse.json();

    if (!supabaseResponse.ok) {
      console.error(
        "Supabase login failed:",
        data
      );

      return NextResponse.json(
        {
          error:
            data?.msg ||
            data?.message ||
            "ログインできませんでした",
        },
        { status: 401 }
      );
    }

    if (!data.access_token || !data.refresh_token) {
      return NextResponse.json(
        {
          error:
            "ログイン情報を取得できませんでした",
        },
        { status: 500 }
      );
    }

    const response = NextResponse.json({
      ok: true,
      user: {
        id: data.user?.id || null,
        email: data.user?.email || cleanEmail,
        nickname:
          data.user?.user_metadata?.nickname || "",
      },
    });

    response.cookies.set(
      "smoke-map-access-token",
      data.access_token,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: data.expires_in || 3600,
      }
    );

    response.cookies.set(
      "smoke-map-refresh-token",
      data.refresh_token,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      }
    );

    return response;
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "ログインできませんでした",
      },
      { status: 500 }
    );
  }
}
