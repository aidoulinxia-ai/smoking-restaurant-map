import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const ACCESS_COOKIE = "smoke-map-access-token";
const REFRESH_COOKIE = "smoke-map-refresh-token";

function cookieOptions(maxAge) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  };
}

async function getUser(
  supabaseUrl,
  supabaseSecretKey,
  accessToken
) {
  if (!accessToken) {
    return null;
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
    return null;
  }

  return response.json();
}

function makeUser(user) {
  return {
    id: user.id,
    email: user.email || "",
    nickname:
      user.user_metadata?.nickname || "ユーザー",
  };
}

export async function GET() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseSecretKey =
      process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseSecretKey) {
      return NextResponse.json(
        {
          loggedIn: false,
          error: "Supabaseの接続設定がありません",
        },
        { status: 500 }
      );
    }

    const cookieStore = await cookies();

    const accessToken = cookieStore.get(
      ACCESS_COOKIE
    )?.value;

    const refreshToken = cookieStore.get(
      REFRESH_COOKIE
    )?.value;

    const currentUser = await getUser(
      supabaseUrl,
      supabaseSecretKey,
      accessToken
    );

    if (currentUser) {
      return NextResponse.json({
        loggedIn: true,
        user: makeUser(currentUser),
      });
    }

    if (!refreshToken) {
      return NextResponse.json({
        loggedIn: false,
      });
    }

    const refreshResponse = await fetch(
      `${supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
      {
        method: "POST",
        headers: {
          apikey: supabaseSecretKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refresh_token: refreshToken,
        }),
        cache: "no-store",
      }
    );

    if (!refreshResponse.ok) {
      const response = NextResponse.json({
        loggedIn: false,
      });

      response.cookies.set(
        ACCESS_COOKIE,
        "",
        cookieOptions(0)
      );

      response.cookies.set(
        REFRESH_COOKIE,
        "",
        cookieOptions(0)
      );

      return response;
    }

    const session =
      await refreshResponse.json();

    const refreshedUser = await getUser(
      supabaseUrl,
      supabaseSecretKey,
      session.access_token
    );

    if (!refreshedUser) {
      return NextResponse.json({
        loggedIn: false,
      });
    }

    const response = NextResponse.json({
      loggedIn: true,
      user: makeUser(refreshedUser),
    });

    response.cookies.set(
      ACCESS_COOKIE,
      session.access_token,
      cookieOptions(session.expires_in || 3600)
    );

    if (session.refresh_token) {
      response.cookies.set(
        REFRESH_COOKIE,
        session.refresh_token,
        cookieOptions(60 * 60 * 24 * 30)
      );
    }

    return response;
  } catch (error) {
    console.error("Auth check failed:", error);

    return NextResponse.json(
      {
        loggedIn: false,
        error: "ログイン情報を確認できませんでした",
      },
      { status: 500 }
    );
  }
}
