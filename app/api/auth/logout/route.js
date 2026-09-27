import { NextResponse } from "next/server";

export async function POST() {
  try {
    const response = NextResponse.json({
      ok: true,
    });

    response.cookies.set(
      "smoke-map-access-token",
      "",
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      }
    );

    response.cookies.set(
      "smoke-map-refresh-token",
      "",
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      }
    );

    return response;
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "ログアウトできませんでした",
      },
      { status: 500 }
    );
  }
}
