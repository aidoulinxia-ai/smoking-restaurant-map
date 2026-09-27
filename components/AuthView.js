"use client";

import { useState } from "react";

export default function AuthView({
  onAuthSuccess,
}) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const isSignup = mode === "signup";

      const response = await fetch(
        isSignup
          ? "/api/auth/signup"
          : "/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            isSignup
              ? {
                  email,
                  password,
                  nickname,
                }
              : {
                  email,
                  password,
                }
          ),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            (isSignup
              ? "アカウントを作成できませんでした"
              : "ログインできませんでした")
        );
      }

      if (
        isSignup &&
        data.emailConfirmationRequired
      ) {
        setMessage(
          "確認メールを送りました。メール内のリンクを開いてからログインしてください。"
        );

        setMode("login");
        setPassword("");
        return;
      }

      if (isSignup) {
        setMessage(
          "アカウントを作成しました。ログインしてください。"
        );

        setMode("login");
        setPassword("");
        return;
      }

      if (onAuthSuccess) {
        await onAuthSuccess(data.user);
      }
    } catch (error) {
      setError(
        error?.message ||
          "処理に失敗しました"
      );
    } finally {
      setLoading(false);
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setError("");
    setMessage("");
  }

  return (
    <section className="filterSection">
      <p className="filterTitle">
        {mode === "login"
          ? "ログイン"
          : "アカウント作成"}
      </p>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gap: "12px",
        }}
      >
        {mode === "signup" && (
          <input
            type="text"
            value={nickname}
            onChange={(event) =>
              setNickname(event.target.value)
            }
            placeholder="ニックネーム"
            autoComplete="nickname"
            maxLength={20}
            required
            style={{
              width: "100%",
              minHeight: "54px",
              padding: "0 16px",
              border: "1px solid #dddddd",
              borderRadius: "14px",
              background: "#ffffff",
              fontSize: "16px",
            }}
          />
        )}

        <input
          type="email"
          value={email}
          onChange={(event) =>
            setEmail(event.target.value)
          }
          placeholder="メールアドレス"
          autoComplete="email"
          required
          style={{
            width: "100%",
            minHeight: "54px",
            padding: "0 16px",
            border: "1px solid #dddddd",
            borderRadius: "14px",
            background: "#ffffff",
            fontSize: "16px",
          }}
        />

        <input
          type="password"
          value={password}
          onChange={(event) =>
            setPassword(event.target.value)
          }
          placeholder="パスワード（8文字以上）"
          autoComplete={
            mode === "login"
              ? "current-password"
              : "new-password"
          }
          minLength={8}
          required
          style={{
            width: "100%",
            minHeight: "54px",
            padding: "0 16px",
            border: "1px solid #dddddd",
            borderRadius: "14px",
            background: "#ffffff",
            fontSize: "16px",
          }}
        />

        {error && (
          <p
            style={{
              margin: 0,
              color: "#b00020",
              fontSize: "13px",
              lineHeight: "1.6",
            }}
          >
            {error}
          </p>
        )}

        {message && (
          <p
            style={{
              margin: 0,
              color: "#555555",
              fontSize: "13px",
              lineHeight: "1.6",
            }}
          >
            {message}
          </p>
        )}

        <button
          type="submit"
          className="searchButton"
          disabled={loading}
        >
          {loading
            ? "処理中..."
            : mode === "login"
            ? "ログイン"
            : "アカウントを作成"}
        </button>
      </form>

      <button
        type="button"
        onClick={() =>
          changeMode(
            mode === "login"
              ? "signup"
              : "login"
          )
        }
        style={{
          width: "100%",
          marginTop: "14px",
          padding: "12px",
          border: 0,
          background: "transparent",
          color: "#555555",
          fontWeight: "700",
        }}
      >
        {mode === "login"
          ? "アカウントを持っていない方はこちら"
          : "すでにアカウントを持っている方はこちら"}
      </button>
    </section>
  );
}
