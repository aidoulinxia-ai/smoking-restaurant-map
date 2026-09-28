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
      user_id: `eq.${user.id}`,
      select:
        "restaurant_id,restaurant_name,restaurant_data,created_at",
      order: "created_at.desc",
    });

    const response = await fetch(
      `${supabaseUrl}/rest/v1/favorites?${params.toString()}`,
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
        "Favorites read failed:",
        detail
      );

      return NextResponse.json(
        {
          error:
            "お気に入りを取得できませんでした",
        },
        { status: 500 }
      );
    }

    const rows = await response.json();

    const favorites = rows
      .map((row) => row.restaurant_data)
      .filter(Boolean);

    return NextResponse.json({
      favorites,
    });
  } catch (error) {
    console.error(
      "Favorites GET failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "お気に入りを取得できませんでした",
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
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

    const restaurant = body?.restaurant;

    if (
      !restaurant?.id ||
      !restaurant?.name
    ) {
      return NextResponse.json(
        {
          error:
            "店舗情報が不足しています",
        },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/favorites?on_conflict=user_id,restaurant_id`,
      {
        method: "POST",
        headers: {
          apikey: supabaseSecretKey,
          Authorization:
            `Bearer ${supabaseSecretKey}`,
          "Content-Type": "application/json",
          Prefer:
            "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify({
          user_id: user.id,
          restaurant_id: String(
            restaurant.id
          ),
          restaurant_name: String(
            restaurant.name
          ),
          restaurant_data: restaurant,
        }),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const detail = await response.text();

      console.error(
        "Favorite save failed:",
        detail
      );

      return NextResponse.json(
        {
          error:
            "お気に入りを保存できませんでした",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Favorites POST failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "お気に入りを保存できませんでした",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
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

    const { searchParams } =
      new URL(request.url);

    const restaurantId =
      searchParams.get("restaurantId");

    if (!restaurantId) {
      return NextResponse.json(
        {
          error:
            "店舗IDが必要です",
        },
        { status: 400 }
      );
    }

    const params = new URLSearchParams({
      user_id: `eq.${user.id}`,
      restaurant_id:
        `eq.${restaurantId}`,
    });

    const response = await fetch(
      `${supabaseUrl}/rest/v1/favorites?${params.toString()}`,
      {
        method: "DELETE",
        headers: {
          apikey: supabaseSecretKey,
          Authorization:
            `Bearer ${supabaseSecretKey}`,
          Prefer: "return=minimal",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const detail = await response.text();

      console.error(
        "Favorite delete failed:",
        detail
      );

      return NextResponse.json(
        {
          error:
            "お気に入りを削除できませんでした",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Favorites DELETE failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "お気に入りを削除できませんでした",
      },
      { status: 500 }
    );
  }
}
