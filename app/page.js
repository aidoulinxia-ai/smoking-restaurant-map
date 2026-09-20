"use client";

import { useState } from "react";

export default function Home() {
  const [locationStatus, setLocationStatus] = useState("現在地から探す");
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [reportResult, setReportResult] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");

  const [smokingStatus, setSmokingStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  function searchRestaurants() {
    if (!navigator.geolocation) {
      setError("この端末では現在地を取得できません");
      return;
    }

    setLoading(true);
    setError("");
    setLocationStatus("現在地を取得中...");
    setSelectedRestaurant(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          setLocationStatus("現在地を取得しました");

          const response = await fetch(
            `/api/restaurants?lat=${lat}&lng=${lng}`
          );

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "店舗検索に失敗しました");
          }

          const smokingRestaurants = (data.restaurants || []).filter(
            (restaurant) =>
              restaurant.smoking &&
              !restaurant.smoking.includes("全面禁煙")
          );

          setRestaurants(smokingRestaurants);

          if (smokingRestaurants.length === 0) {
            setError(
              "現在地周辺に喫煙可能な候補店が見つかりませんでした"
            );
          }
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      },
      () => {
        setLocationStatus("現在地の利用を許可してください");
        setError("現在地を取得できませんでした");
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }

  async function loadSmokingStatus(restaurantId) {
    setStatusLoading(true);
    setSmokingStatus(null);

    try {
      const response = await fetch(
        `/api/smoking-status?restaurantId=${encodeURIComponent(
          restaurantId
        )}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "最新情報を取得できませんでした"
        );
      }

      setSmokingStatus(data);
    } catch (err) {
      console.error(err);
      setSmokingStatus(null);
    } finally {
      setStatusLoading(false);
    }
  }

  function openRestaurant(restaurant) {
    setSelectedRestaurant(restaurant);
    setReportResult("");
    setReportError("");
    setSmokingStatus(null);

    loadSmokingStatus(restaurant.id);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function closeRestaurant() {
    setSelectedRestaurant(null);
    setReportResult("");
    setReportError("");
    setSmokingStatus(null);
  }

  async function submitSmokingReport(smokingStatusValue) {
    if (!selectedRestaurant || reportLoading) {
      return;
    }

    setReportLoading(true);
    setReportError("");

    try {
      const response = await fetch("/api/smoking-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          restaurantId: selectedRestaurant.id,
          restaurantName: selectedRestaurant.name,
          smokingStatus: smokingStatusValue,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "報告を保存できませんでした");
      }

      setReportResult(smokingStatusValue);

      await loadSmokingStatus(selectedRestaurant.id);
    } catch (err) {
      setReportError(err.message);
    } finally {
      setReportLoading(false);
    }
  }

  function formatTimeAgo(dateString) {
    if (!dateString) {
      return "";
    }

    const date = new Date(dateString);
    const now = new Date();
    const difference = now.getTime() - date.getTime();

    if (difference < 0) {
      return "たった今";
    }

    const minutes = Math.floor(difference / 60000);
    const hours = Math.floor(difference / 3600000);
    const days = Math.floor(difference / 86400000);

    if (minutes < 1) {
      return "たった今";
    }

    if (minutes < 60) {
      return `${minutes}分前`;
    }

    if (hours < 24) {
      return `${hours}時間前`;
    }

    if (days < 30) {
      return `${days}日前`;
    }

    return date.toLocaleDateString("ja-JP");
  }

  function latestReportText(status) {
    if (status === "paper_ok") {
      return "紙巻きが吸えた";
    }

    if (status === "heated_only") {
      return "加熱式だけ吸えた";
    }

    if (status === "not_allowed") {
      return "吸えなかった";
    }

    return "情報なし";
  }

  if (selectedRestaurant) {
    return (
      <main className="home">
        <header className="header">
          <div className="logo">SMOKE MAP</div>

          <button
            className="menuButton"
            onClick={closeRestaurant}
            aria-label="戻る"
          >
            ←
          </button>
        </header>

        <section className="hero">
          <div className="location">
            <span>🚬</span>
            <span>喫煙候補店</span>
          </div>

          <h1>{selectedRestaurant.name}</h1>

          <p className="description">
            {selectedRestaurant.genre || "ジャンル情報なし"}
          </p>
        </section>

        <section className="filterSection">
          <div className="trustBox">
            <div className="trustIcon">✓</div>

            <div>
              <strong>掲載されている喫煙情報</strong>
              <p>{selectedRestaurant.smoking || "喫煙情報なし"}</p>
            </div>
          </div>

          <div className="trustBox">
            <div>
              <strong>最近のユーザー確認</strong>

              {statusLoading ? (
                <p>確認中...</p>
              ) : smokingStatus &&
                smokingStatus.total > 0 &&
                smokingStatus.latestReport ? (
                <p>
                  最終確認：
                  {formatTimeAgo(
                    smokingStatus.latestReport.created_at
                  )}
                  <br />
                  最新報告：
                  {latestReportText(
                    smokingStatus.latestReport.smoking_status
                  )}
                  <br />
                  直近{smokingStatus.total}件中
                  {smokingStatus.smokedCount}件で吸えた
                </p>
              ) : (
                <p>
                  まだユーザーからの確認はありません。
                  <br />
                  最初の報告をお願いします。
                </p>
              )}
            </div>
          </div>

          <div className="trustBox">
            <div>
              <strong>住所</strong>
              <p>{selectedRestaurant.address || "情報なし"}</p>
            </div>
          </div>

          <div className="trustBox">
            <div>
              <strong>営業時間</strong>
              <p>{selectedRestaurant.open || "情報なし"}</p>
            </div>
          </div>

          <div className="trustBox">
            <div>
              <strong>予算</strong>
              <p>{selectedRestaurant.budget || "情報なし"}</p>
            </div>
          </div>

          <div
            style={{
              marginTop: "30px",
              marginBottom: "30px",
              padding: "22px",
              borderRadius: "18px",
              background: "#f5f5f5",
            }}
          >
            <strong
              style={{
                display: "block",
                marginBottom: "6px",
                fontSize: "18px",
              }}
            >
              今日、ここで吸えた？
            </strong>

            <p
              style={{
                margin: "0 0 18px",
                color: "#737373",
                fontSize: "13px",
              }}
            >
              最新の喫煙状況をみんなで共有
            </p>

            {!reportResult ? (
              <div
                style={{
                  display: "grid",
                  gap: "10px",
                }}
              >
                <button
                  className="filterCard"
                  style={{
                    width: "100%",
                    minHeight: "60px",
                  }}
                  disabled={reportLoading}
                  onClick={() => submitSmokingReport("paper_ok")}
                >
                  <span>🚬 紙巻き吸えた</span>
                </button>

                <button
                  className="filterCard"
                  style={{
                    width: "100%",
                    minHeight: "60px",
                  }}
                  disabled={reportLoading}
                  onClick={() => submitSmokingReport("heated_only")}
                >
                  <span>🔥 加熱式だけ吸えた</span>
                </button>

                <button
                  className="filterCard"
                  style={{
                    width: "100%",
                    minHeight: "60px",
                  }}
                  disabled={reportLoading}
                  onClick={() => submitSmokingReport("not_allowed")}
                >
                  <span>🚭 吸えなかった</span>
                </button>

                {reportLoading && (
                  <p
                    style={{
                      margin: "5px 0 0",
                      color: "#737373",
                      fontSize: "13px",
                    }}
                  >
                    保存中...
                  </p>
                )}

                {reportError && (
                  <p
                    style={{
                      margin: "5px 0 0",
                      color: "#b00020",
                      fontSize: "13px",
                    }}
                  >
                    {reportError}
                  </p>
                )}
              </div>
            ) : (
              <div
                style={{
                  padding: "18px",
                  borderRadius: "14px",
                  background: "#ffffff",
                  textAlign: "center",
                }}
              >
                <strong>✓ 報告ありがとう</strong>

                <p
                  style={{
                    margin: "8px 0 0",
                    color: "#737373",
                    fontSize: "13px",
                  }}
                >
                  最新の喫煙情報として保存しました。
                </p>
              </div>
            )}
          </div>

          {selectedRestaurant.urls && (
            <a
              className="searchButton"
              href={selectedRestaurant.urls}
              target="_blank"
              rel="noopener noreferrer"
            >
              予約・店舗情報を見る
            </a>
          )}
        </section>

        <nav className="bottomNav">
          <button
            className="navActive"
            onClick={closeRestaurant}
          >
            <span>←</span>
            <small>戻る</small>
          </button>

          <button>
            <span>♡</span>
            <small>お気に入り</small>
          </button>

          <button>
            <span>☷</span>
            <small>履歴</small>
          </button>

          <button>
            <span>○</span>
            <small>マイページ</small>
          </button>
        </nav>
      </main>
    );
  }

  return (
    <main className="home">
      <header className="header">
        <div className="logo">SMOKE MAP</div>

        <button className="menuButton" aria-label="メニュー">
          ☰
        </button>
      </header>

      <section className="hero">
        <button className="location" onClick={searchRestaurants}>
          <span>📍</span>
          <span>{locationStatus}</span>
        </button>

        <h1>
          今、本当に吸える店が
          <br />
          3秒で分かる。
        </h1>

        <p className="description">
          紙巻き・加熱式・喫煙室など、
          <br />
          あなたの条件に合う飲食店を探せます。
        </p>

        <button
          className="searchButton"
          onClick={searchRestaurants}
          disabled={loading}
        >
          <span>🔍</span>
          {loading
            ? "近くのお店を検索中..."
            : "今すぐ吸える店を探す"}
        </button>

        {error && <p>{error}</p>}
      </section>

      {restaurants.length > 0 && (
        <section className="filterSection">
          <p className="filterTitle">
            喫煙候補（{restaurants.length}件）
          </p>

          <div>
            {restaurants.map((restaurant) => (
              <button
                className="trustBox"
                key={restaurant.id}
                onClick={() => openRestaurant(restaurant)}
                style={{
                  width: "calc(100% - 44px)",
                  border: "none",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div>
                  <strong>{restaurant.name}</strong>

                  <p>
                    {restaurant.genre}
                    <br />
                    🚬 {restaurant.smoking}
                    <br />
                    {restaurant.address}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {restaurants.length === 0 && !loading && !error && (
        <>
          <section className="filterSection">
            <p className="filterTitle">吸い方から探す</p>

            <div className="filterGrid">
              <button className="filterCard">
                <span className="filterIcon">🚬</span>
                <span>紙巻きOK</span>
              </button>

              <button className="filterCard">
                <span className="filterIcon">🔥</span>
                <span>加熱式OK</span>
              </button>

              <button className="filterCard">
                <span className="filterIcon">🪑</span>
                <span>席で吸える</span>
              </button>

              <button className="filterCard">
                <span className="filterIcon">🚪</span>
                <span>喫煙室あり</span>
              </button>
            </div>
          </section>

          <section className="trustBox">
            <div className="trustIcon">✓</div>

            <div>
              <strong>新しい喫煙情報を優先</strong>
              <p>
                公式情報と最近のユーザー確認から、
                今の喫煙状況を確認できます。
              </p>
            </div>
          </section>
        </>
      )}

      <nav className="bottomNav">
        <button className="navActive">
          <span>⌖</span>
          <small>探す</small>
        </button>

        <button>
          <span>♡</span>
          <small>お気に入り</small>
        </button>

        <button>
          <span>☷</span>
          <small>履歴</small>
        </button>

        <button>
          <span>○</span>
          <small>マイページ</small>
        </button>
      </nav>
    </main>
  );
}
