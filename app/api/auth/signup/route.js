import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { email, password, nickname } =
      await request.json();

    const cleanEmail = String(email || "")
      .trim()
      .toLowerCase();

    const cleanNickname = String(nickname || "").trim();

    if (!cleanEmail) {
      return NextResponse.json(
        { error: "メールアドレスを入力してください" },
        { status: 400 }
      );
    }

    if (!cleanEmail.includes("@")) {
      return NextResponse.json(
        { error: "メールアドレスを確認してください" },
        { status: 400 }
      );
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "パスワードは8文字以上にしてください" },
        { status: 400 }
      );
    }

    if (
      cleanNickname.length < 1 ||
      cleanNickname.length > 20
    ) {
      return NextResponse.json(
        { error: "ニックネームは1〜20文字にしてください" },
        { status: 400 }
      );
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

    const response = await fetch(
      `${supabaseUrl}/auth/v1/signup`,
      {
        method: "POST",
        headers: {
          apikey: supabaseSecretKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: cleanEmail,
          password,
          data: {
            nickname: cleanNickname,
          },
        }),
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Supabase signup failed:", data);

      return NextResponse.json(
        {
          error:
            data?.msg ||
            data?.message ||
            "アカウントを作成できませんでした",
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      ok: true,
      userId: data.user?.id || null,
      emailConfirmationRequired: !data.access_token,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "アカウントを作成できませんでした" },
      { status: 500 }
    );
  }
}
