"use client";

import { useState } from "react";

export default function Home() {
  const [locationStatus, setLocationStatus] = useState("現在地から探す");

  function getCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("現在地を取得できません");
      return;
    }

    setLocationStatus("現在地を取得中...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        console.log("latitude:", latitude);
        console.log("longitude:", longitude);

        setLocationStatus("現在地を取得しました");
      },
      () => {
        setLocationStatus("現在地の利用を許可してください");
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
        <button className="location" onClick={getCurrentLocation}>
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

        <button className="searchButton" onClick={getCurrentLocation}>
          <span>🔍</span>
          今すぐ吸える店を探す
        </button>
      </section>

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
