"use client";

import { useEffect, useState } from "react";
import AuthView from "./AuthView";

export default function MyPageView({
  favoritesCount,
  historyCount,
  onOpenFavorites,
  onOpenHistory,
  onOpenMySmokedPlaces,
  onOpenMyReports,
  authLoading,
  currentUser,
  onAuthSuccess,
  onLogout,
}) {
  const [smokingPreference, setSmokingPreference] =
    useState("");

  const [preferenceLoading, setPreferenceLoading] =
    useState(false);

  const [preferenceSaving, setPreferenceSaving] =
    useState(false);

  const [preferenceMessage, setPreferenceMessage] =
    useState("");

  useEffect(() => {
    if (!currentUser) {
      setSmokingPreference("");
      setPreferenceMessage("");
      return;
    }

    let cancelled = false;

    async function loadSmokingPreference() {
      setPreferenceLoading(true);
      setPreferenceMessage("");

      try {
        const refreshResponse = await fetch(
          "/api/auth/me",
          {
            cache: "no-store",
          }
        );

        if (!refreshResponse.ok) {
          throw new Error(
            "ログイン情報を確認できませんでした"
          );
        }

        const response = await fetch(
          "/api/smoking-preference",
          {
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "喫煙設定を取得できませんでした"
          );
        }

        if (!cancelled) {
          setSmokingPreference(
            data?.smokingPreference || ""
          );
        }
      } catch (error) {
        if (!cancelled) {
          setPreferenceMessage(
            error?.message ||
              "喫煙設定を取得できませんでした"
          );
        }
      } finally {
        if (!cancelled) {
          setPreferenceLoading(false);
        }
      }
    }

    loadSmokingPreference();

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  async function saveSmokingPreference(value) {
    if (preferenceSaving) {
      return;
    }

    const previousValue = smokingPreference;

    setSmokingPreference(value);
    setPreferenceSaving(true);
    setPreferenceMessage("");

    try {
      const refreshResponse = await fetch(
        "/api/auth/me",
        {
          cache: "no-store",
        }
      );

      if (!refreshResponse.ok) {
        throw new Error(
          "ログイン情報を確認できませんでした"
        );
      }

      const response = await fetch(
        "/api/smoking-preference",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            smokingPreference: value,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "喫煙設定を保存できませんでした"
        );
      }

      setSmokingPreference(
        data?.smokingPreference || value
      );

      setPreferenceMessage("保存しました");
    } catch (error) {
      setSmokingPreference(previousValue);

      setPreferenceMessage(
        error?.message ||
          "喫煙設定を保存できませんでした"
      );
    } finally {
      setPreferenceSaving(false);
    }
  }

  return (
    <>
      <header className="header">
        <div className="logo">SMOKE MAP</div>
      </header>

      <section className="hero">
        <div className="location">
          <span>○</span>
          <span>MY PAGE</span>
        </div>

        <h1>マイページ</h1>

        <p className="description">
          {currentUser
            ? `${
                currentUser.nickname || "ユーザー"
              }さんのSMOKE MAP`
            : "お気に入りや履歴をまとめて確認できます。"}
        </p>
      </section>

      <section className="filterSection">
        <p className="filterTitle">
          あなたのデータ
        </p>

        <div className="filterGrid">
          <button
            className="filterCard"
            onClick={onOpenFavorites}
          >
            <span className="filterIcon">
              ♡
            </span>

            <span>
              お気に入り
              <br />
              {favoritesCount}件
            </span>
          </button>

          <button
            className="filterCard"
            onClick={onOpenHistory}
          >
            <span className="filterIcon">
              ☷
            </span>

            <span>
              閲覧履歴
              <br />
              {historyCount}件
            </span>
          </button>

          {currentUser && (
            <button
              className="filterCard"
              onClick={onOpenMySmokedPlaces}
            >
              <span className="filterIcon">
                📍
              </span>

              <span>
                自分が
                <br />
                吸えた店
              </span>
            </button>
          )}

          {currentUser && (
            <button
              className="filterCard"
              onClick={onOpenMyReports}
            >
              <span className="filterIcon">
                💬
              </span>

              <span>
                自分の
                <br />
                喫煙報告
              </span>
            </button>
          )}
        </div>
      </section>

      {authLoading ? (
        <section className="filterSection">
          <div className="trustBox">
            <div>
              <strong>
                ログイン情報を確認中...
              </strong>
            </div>
          </div>
        </section>
      ) : currentUser ? (
        <>
          <section className="filterSection">
            <p className="filterTitle">
              喫煙設定
            </p>

            <div
              className="trustBox"
              style={{
                marginLeft: 0,
                marginRight: 0,
                display: "block",
              }}
            >
              <div>
                <strong>
                  普段吸うたばこ
                </strong>

                <p>
                  検索をあなた向けにするための設定です。
                </p>
              </div>

              {preferenceLoading ? (
                <p>設定を読み込み中...</p>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: "10px",
                    marginTop: "14px",
                  }}
                >
                  <button
                    type="button"
                    disabled={preferenceSaving}
                    onClick={() =>
                      saveSmokingPreference(
                        "paper"
                      )
                    }
                    style={{
                      width: "100%",
                      minHeight: "50px",
                      border:
                        smokingPreference ===
                        "paper"
                          ? "2px solid #151515"
                          : "1px solid #dddddd",
                      borderRadius: "12px",
                      background:
                        smokingPreference ===
                        "paper"
                          ? "#f2f2f2"
                          : "#ffffff",
                      color: "#151515",
                      fontWeight: "800",
                    }}
                  >
                    🚬 紙巻き
                  </button>

                  <button
                    type="button"
                    disabled={preferenceSaving}
                    onClick={() =>
                      saveSmokingPreference(
                        "heated"
                      )
                    }
                    style={{
                      width: "100%",
                      minHeight: "50px",
                      border:
                        smokingPreference ===
                        "heated"
                          ? "2px solid #151515"
                          : "1px solid #dddddd",
                      borderRadius: "12px",
                      background:
                        smokingPreference ===
                        "heated"
                          ? "#f2f2f2"
                          : "#ffffff",
                      color: "#151515",
                      fontWeight: "800",
                    }}
                  >
                    🔥 加熱式
                  </button>

                  <button
                    type="button"
                    disabled={preferenceSaving}
                    onClick={() =>
                      saveSmokingPreference(
                        "both"
                      )
                    }
                    style={{
                      width: "100%",
                      minHeight: "50px",
                      border:
                        smokingPreference ===
                        "both"
                          ? "2px solid #151515"
                          : "1px solid #dddddd",
                      borderRadius: "12px",
                      background:
                        smokingPreference ===
                        "both"
                          ? "#f2f2f2"
                          : "#ffffff",
                      color: "#151515",
                      fontWeight: "800",
                    }}
                  >
                    🚬🔥 どちらも
                  </button>
                </div>
              )}

              {preferenceMessage && (
                <p
                  style={{
                    marginTop: "10px",
                    fontSize: "13px",
                  }}
                >
                  {preferenceMessage}
                </p>
              )}
            </div>
          </section>

          <section className="filterSection">
            <p className="filterTitle">
              アカウント
            </p>

            <div
              className="trustBox"
              style={{
                marginLeft: 0,
                marginRight: 0,
              }}
            >
              <div>
                <strong>
                  {currentUser.nickname ||
                    "ユーザー"}
                </strong>

                <p>
                  {currentUser.email || ""}
                  <br />
                  ログイン中
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onLogout}
              style={{
                width: "100%",
                minHeight: "52px",
                border:
                  "1px solid #dddddd",
                borderRadius: "14px",
                background: "#ffffff",
                color: "#151515",
                fontWeight: "800",
              }}
            >
              ログアウト
            </button>
          </section>
        </>
      ) : (
        <AuthView
          onAuthSuccess={onAuthSuccess}
        />
      )}

      <section className="filterSection">
        <p className="filterTitle">
          SMOKE MAP
        </p>

        <div className="trustBox">
          <div>
            <strong>Premium</strong>

            <p>
              より便利な検索機能などを追加予定です。
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
