"use client";

import { useState } from "react";

export default function Home() {
  const [locationStatus, setLocationStatus] = useState("現在地から探す");
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function searchRestaurants() {
    if (!navigator.geolocation) {
      setError("この端末では現在地を取得できません");
      return;
    }

    setLoading(true);
    setError("");
    setLocationStatus("現在地を取得中...");

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
            setError("現在地周辺に喫煙可能な候補店が見つかりませんでした");
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

        <button className="searchButton" onClick={searchRestaurants}>
          <span>🔍</span>
          {loading ? "近くのお店を検索中..." : "今すぐ吸える店を探す"}
        </button>

        {error && <p>{error}</p>}
      </section>

      {restaurants.length > 0 && (
        <section className="filterSection">
          <p className="filterTitle">
            喫煙可能な候補（{restaurants.length}件）
          </p>

          <div>
            {restaurants.map((restaurant) => (
              <div className="trustBox" key={restaurant.id}>
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
              </div>
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
