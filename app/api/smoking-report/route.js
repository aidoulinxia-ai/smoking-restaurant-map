import { NextResponse } from "next/server";

const allowedStatuses = new Set([
  "paper_ok",
  "heated_only",
  "not_allowed",
]);

export async function POST(request) {
  try {
    const {
      restaurantId,
      restaurantName,
      smokingStatus,
    } = await request.json();

    if (
      !restaurantId ||
      !restaurantName ||
      !allowedStatuses.has(smokingStatus)
    ) {
      return NextResponse.json(
        { error: "入力内容が不正です" },
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
      `${supabaseUrl}/rest/v1/smoking_reports`,
      {
        method: "POST",
        headers: {
          apikey: supabaseSecretKey,
          Authorization: `Bearer ${supabaseSecretKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          restaurant_id: String(restaurantId),
          restaurant_name: restaurantName,
          smoking_status: smokingStatus,
        }),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      console.error("Supabase insert failed:", detail);

      return NextResponse.json(
        { error: "報告を保存できませんでした" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "報告を保存できませんでした" },
      { status: 500 }
    );
  }
}
