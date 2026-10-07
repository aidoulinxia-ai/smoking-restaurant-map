import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const ACCESS_COOKIE = "smoke-map-access-token";

async function getAuthenticatedUser(
  supabaseUrl,
  supabaseSecretKey
) {
  const cookieStore = await cookies();

  const accessToken = cookieStore.get(
    ACCESS_COOKIE
  )?.value;

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

  const user = await response.json();

  return user?.id ? user : null;
}

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

    const user = await getAuthenticatedUser(
      supabaseUrl,
      supabaseSecretKey
    );

    if (!user) {
      return NextResponse.json(
        { error: "ログインが必要です" },
        { status: 401 }
      );
    }

    const params = new URLSearchParams({
      id: `eq.${user.id}`,
      select: "smoking_preference",
      limit: "1",
    });

    const response = await fetch(
      `${supabaseUrl}/rest/v1/profiles?${params.toString()}`,
      {
        headers: {
          apikey: supabaseSecretKey,
          Authorization:
            `Bearer ${supabaseSecretKey}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const detail = await response.text();

      console.error(
        "Smoking preference read failed:",
        detail
      );

      return NextResponse.json(
        {
          error:
            "喫煙設定を取得できませんでした",
        },
        { status: 500 }
      );
    }

    const profiles = await response.json();

    return NextResponse.json({
      smokingPreference:
        profiles?.[0]?.smoking_preference ||
        null,
    });
  } catch (error) {
    console.error(
      "Smoking preference GET failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "喫煙設定を取得できませんでした",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
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

    const user = await getAuthenticatedUser(
      supabaseUrl,
      supabaseSecretKey
    );

    if (!user) {
      return NextResponse.json(
        { error: "ログインが必要です" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const smokingPreference =
      body?.smokingPreference;

    const allowedPreferences = [
      "paper",
      "heated",
      "both",
    ];

    if (
      !allowedPreferences.includes(
        smokingPreference
      )
    ) {
      return NextResponse.json(
        {
          error:
            "喫煙設定が正しくありません",
        },
        { status: 400 }
      );
    }

    const params = new URLSearchParams({
      id: `eq.${user.id}`,
    });

    const response = await fetch(
      `${supabaseUrl}/rest/v1/profiles?${params.toString()}`,
      {
        method: "PATCH",
        headers: {
          apikey: supabaseSecretKey,
          Authorization:
            `Bearer ${supabaseSecretKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          smoking_preference:
            smokingPreference,
          updated_at:
            new Date().toISOString(),
        }),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const detail = await response.text();

      console.error(
        "Smoking preference update failed:",
        detail
      );

      return NextResponse.json(
        {
          error:
            "喫煙設定を保存できませんでした",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      smokingPreference,
    });
  } catch (error) {
    console.error(
      "Smoking preference PUT failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "喫煙設定を保存できませんでした",
      },
      { status: 500 }
    );
  }
}

