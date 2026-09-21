"use client";

import { useEffect, useMemo, useState } from "react";

export default function Home() {
  const [locationStatus, setLocationStatus] = useState("現在地から探す");
  const [userLocation, setUserLocation] = useState(null);

  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");

  const [sortType, setSortType] = useState("distance");

  const [reportResult, setReportResult] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");

  const [smokingStatus, setSmokingStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const filters = [
    { id: "paper", icon: "🚬", label: "紙巻きOK" },
    { id: "heated", icon: "🔥", label: "加熱式OK" },
    { id: "seat", icon: "🪑", label: "席で吸える" },
    { id: "room", icon: "🚪", label: "喫煙室あり" },
  ];

  useEffect(() => {
    function handleMapMessage(event) {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data?.type !== "SMOKE_MAP_RESTAURANT") {
        return;
      }

      const restaurant = restaurants.find(
        (item) =>
          String(item.id) === String(event.data.restaurantId)
      );

      if (restaurant) {
        openRestaurant(restaurant);
      }
    }

    window.addEventListener("message", handleMapMessage);

    return () => {
      window.removeEventListener("message", handleMapMessage);
    };
  }, [restaurants]);

  function toggleFilter(filterId) {
    setSelectedFilter((current) =>
      current === filterId ? "all" : filterId
    );
  }

  function matchesFilter(restaurant) {
    if (restaurant.smokingType === "non_smoking") {
      return false;
    }

    if (selectedFilter === "all") {
      return (
        restaurant.smokingType !== "non_smoking" &&
        restaurant.smokingType !== "unknown"
      );
    }

    if (selectedFilter === "paper") {
      return restaurant.smokingType === "smoking_candidate";
    }

    if (selectedFilter === "heated") {
      return (
        restaurant.smokingType === "heated_candidate" ||
        restaurant.smokingType === "smoking_candidate"
      );
    }

    if (selectedFilter === "seat") {
      return restaurant.smokingType === "smoking_candidate";
    }

    if (selectedFilter === "room") {
      return restaurant.smokingType === "smoking_room";
    }

    return false;
  }

  function calculateDistance(lat1, lng1, lat2, lng2) {
    const toRadians = (value) => (value * Math.PI) / 180;

    const earthRadius = 6371000;

    const latitude1 = toRadians(lat1);
    const latitude2 = toRadians(lat2);
    const latitudeDifference = toRadians(lat2 - lat1);
    const longitudeDifference = toRadians(lng2 - lng1);

    const a =
      Math.sin(latitudeDifference / 2) *
        Math.sin(latitudeDifference / 2) +
      Math.cos(latitude1) *
        Math.cos(latitude2) *
        Math.sin(longitudeDifference / 2) *
        Math.sin(longitudeDifference / 2);

    const c =
      2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadius * c;
  }

  function getRestaurantDistance(restaurant) {
    if (!userLocation) {
      return Infinity;
    }

    const lat = Number(restaurant.lat);
    const lng = Number(restaurant.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return Infinity;
    }

    return calculateDistance(
      Number(userLocation.lat),
      Number(userLocation.lng),
      lat,
      lng
    );
  }

  function formatDistance(distance) {
    if (!Number.isFinite(distance)) {
      return "";
    }

    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    }

    return `${(distance / 1000).toFixed(1)}km`;
  }

  function getBudgetValue(budgetText) {
    if (!budgetText) {
      return Infinity;
    }

    const numbers = String(budgetText)
      .replace(/,/g, "")
      .match(/\d+/g);

    if (!numbers || numbers.length === 0) {
      return Infinity;
    }

    return Number(numbers[0]);
  }

  function getSmokingFreshnessValue(restaurant) {
    if (!restaurant.latestSmokingReportAt) {
      return 0;
    }

    const time = new Date(
      restaurant.latestSmokingReportAt
    ).getTime();

    if (!Number.isFinite(time)) {
      return 0;
    }

    return time;
  }

  const sortedRestaurants = useMemo(() => {
    const copiedRestaurants = [...restaurants];

    if (sortType === "price") {
      return copiedRestaurants.sort(
        (a, b) =>
          getBudgetValue(a.budget) -
          getBudgetValue(b.budget)
      );
    }

    if (sortType === "freshness") {
      return copiedRestaurants.sort(
        (a, b) =>
          getSmokingFreshnessValue(b) -
          getSmokingFreshnessValue(a)
      );
    }

    return copiedRestaurants.sort(
      (a, b) =>
        getRestaurantDistance(a) -
        getRestaurantDistance(b)
    );
  }, [restaurants, sortType, userLocation]);

  async function loadSmokingStatuses(restaurantList) {
    if (restaurantList.length === 0) {
      return restaurantList;
    }

    try {
      const response = await fetch("/api/smoking-statuses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          restaurantIds: restaurantList.map(
            (restaurant) => restaurant.id
          ),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "喫煙情報を取得できませんでした"
        );
      }

      const statuses = data.statuses || {};

      return restaurantList.map((restaurant) => {
        const status = statuses[String(restaurant.id)];

        return {
          ...restaurant,
          latestSmokingReportAt:
            status?.latestCreatedAt || null,
          latestSmokingReportStatus:
            status?.latestStatus || null,
        };
      });
    } catch (err) {
      console.error(err);

      return restaurantList.map((restaurant) => ({
        ...restaurant,
        latestSmokingReportAt: null,
        latestSmokingReportStatus: null,
      }));
    }
  }

  function searchRestaurants() {
    if (!navigator.geolocation) {
      setError("この端末では現在地を取得できません");
      return;
    }

    setLoading(true);
    setError("");
    setRestaurants([]);
    setSelectedRestaurant(null);
    setLocationStatus("現在地を取得中...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          setUserLocation({
            lat,
            lng,
          });

          setLocationStatus("現在地を取得しました");

          const response = await fetch(
            `/api/restaurants?lat=${lat}&lng=${lng}`
          );

          const data = await response.json();

          if (!response.ok) {
            throw new Error(
              data.error || "店舗検索に失敗しました"
            );
          }

          const filteredRestaurants = (
            data.restaurants || []
          ).filter(matchesFilter);

          const restaurantsWithStatuses =
            await loadSmokingStatuses(
              filteredRestaurants
            );

          setRestaurants(restaurantsWithStatuses);

          if (filteredRestaurants.length === 0) {
            setError(
              selectedFilter === "all"
                ? "現在地周辺に喫煙可能な候補店が見つかりませんでした"
                : "選択した条件に合う候補店が見つかりませんでした"
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
        throw new Error(
          data.error || "報告を保存できませんでした"
        );
      }

      setReportResult(smokingStatusValue);
      await loadSmokingStatus(selectedRestaurant.id);

      setRestaurants((currentRestaurants) =>
        currentRestaurants.map((restaurant) =>
          String(restaurant.id) ===
          String(selectedRestaurant.id)
            ? {
                ...restaurant,
                latestSmokingReportAt:
                  new Date().toISOString(),
                latestSmokingReportStatus:
                  smokingStatusValue,
              }
            : restaurant
        )
      );
    } catch (err) {
      setReportError(err.message);
    } finally {
      setReportLoading(false);
    }
  }

  function formatTimeAgo(dateString) {
    if (!dateString) return "";

    const date = new Date(dateString);
    const now = new Date();
    const difference = now.getTime() - date.getTime();

    if (difference < 0) return "たった今";

    const minutes = Math.floor(difference / 60000);
    const hours = Math.floor(difference / 3600000);
    const days = Math.floor(difference / 86400000);

    if (minutes < 1) return "たった今";
    if (minutes < 60) return `${minutes}分前`;
    if (hours < 24) return `${hours}時間前`;
    if (days < 30) return `${days}日前`;

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

  function smokingTypeText(restaurant) {
    if (restaurant.smokingType === "smoking_candidate") {
      return "喫煙可能候補";
    }

    if (restaurant.smokingType === "heated_candidate") {
      return "加熱式たばこ候補";
    }

    if (restaurant.smokingType === "smoking_room") {
      return "喫煙室あり";
    }

    return "喫煙情報あり";
  }

  function getMapUrl(restaurant) {
    const lat = Number(restaurant.lat);
    const lng = Number(restaurant.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return "";
    }

    return `/api/google-map?lat=${encodeURIComponent(
      lat
    )}&lng=${encodeURIComponent(lng)}`;
  }

  function getResultsMapUrl() {
    if (restaurants.length === 0 || !userLocation) {
      return "";
    }

    const mapRestaurants = restaurants.map(
      (restaurant) => ({
        id: restaurant.id,
        name: restaurant.name,
        lat: restaurant.lat,
        lng: restaurant.lng,
      })
    );

    return (
      `/api/results-map` +
      `?lat=${encodeURIComponent(userLocation.lat)}` +
      `&lng=${encodeURIComponent(userLocation.lng)}` +
      `&restaurants=${encodeURIComponent(
        JSON.stringify(mapRestaurants)
      )}`
    );
  }

  function getDirectionsUrl(restaurant) {
    const lat = Number(restaurant.lat);
    const lng = Number(restaurant.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return "";
    }

    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      `${lat},${lng}`
    )}`;
  }

  if (selectedRestaurant) {
    const mapUrl = getMapUrl(selectedRestaurant);
    const directionsUrl =
      getDirectionsUrl(selectedRestaurant);

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
            <span>
              {smokingTypeText(selectedRestaurant)}
            </span>
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

              <p>
                {selectedRestaurant.smoking || "喫煙情報なし"}
              </p>
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

          {mapUrl && (
            <div
              style={{
                marginBottom: "24px",
                overflow: "hidden",
                borderRadius: "20px",
                border: "1px solid #e4e4e4",
                background: "#ffffff",
                boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
              }}
            >
              <iframe
                title={`${selectedRestaurant.name}のGoogleマップ`}
                src={mapUrl}
                width="100%"
                height="320"
                style={{
                  display: "block",
                  border: 0,
                }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />

              <div
                style={{
                  padding: "16px",
                  background: "#ffffff",
                }}
              >
                <strong
                  style={{
                    display: "block",
                    fontSize: "15px",
                    marginBottom: "5px",
                  }}
                >
                  📍 {selectedRestaurant.name}
                </strong>

                <p
                  style={{
                    margin: "0 0 14px",
                    color: "#737373",
                    fontSize: "12px",
                    lineHeight: "1.6",
                  }}
                >
                  {selectedRestaurant.address || "住所情報なし"}
                </p>

                {directionsUrl && (
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      minHeight: "50px",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "14px",
                      background: "#151515",
                      color: "#ffffff",
                      fontWeight: "800",
                      textDecoration: "none",
                    }}
                  >
                    📍 Googleマップで経路を見る
                  </a>
                )}
              </div>
            </div>
          )}

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
                  onClick={() =>
                    submitSmokingReport("paper_ok")
                  }
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
                  onClick={() =>
                    submitSmokingReport("heated_only")
                  }
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
                  onClick={() =>
                    submitSmokingReport("not_allowed")
                  }
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

  const resultsMapUrl = getResultsMapUrl();

  return (
    <main className="home">
      <header className="header">
        <div className="logo">SMOKE MAP</div>

        <button
          className="menuButton"
          aria-label="メニュー"
        >
          ☰
        </button>
      </header>

      <section className="hero">
        <button
          className="location"
          onClick={searchRestaurants}
        >
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
      </section>

      <section className="filterSection">
        <p className="filterTitle">吸い方を選ぶ</p>

        <div className="filterGrid">
          {filters.map((filter) => (
            <button
              key={filter.id}
              className="filterCard"
              onClick={() =>
                toggleFilter(filter.id)
              }
              style={
                selectedFilter === filter.id
                  ? {
                      background: "#151515",
                      color: "#ffffff",
                      borderColor: "#151515",
                    }
                  : undefined
              }
            >
              <span className="filterIcon">
                {filter.icon}
              </span>

              <span>{filter.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section
        style={{
          padding: "0 22px 30px",
        }}
      >
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

        {error && (
          <p
            style={{
              marginTop: "15px",
              color: "#737373",
              fontSize: "13px",
            }}
          >
            {error}
          </p>
        )}
      </section>

      {restaurants.length > 0 && (
        <section className="filterSection">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              marginBottom: "14px",
            }}
          >
            <p
              className="filterTitle"
              style={{
                margin: 0,
              }}
            >
              喫煙候補（{restaurants.length}件）
            </p>

            <select
              value={sortType}
              onChange={(event) =>
                setSortType(event.target.value)
              }
              aria-label="並び替え"
              style={{
                minHeight: "42px",
                maxWidth: "210px",
                padding: "0 10px",
                border: "1px solid #dddddd",
                borderRadius: "12px",
                background: "#ffffff",
                color: "#151515",
                fontSize: "13px",
                fontWeight: "700",
              }}
            >
              <option value="distance">
                📍 近い順
              </option>

              <option value="price">
                💰 安い順
              </option>

              <option value="freshness">
                🚬 喫煙情報が新しい順
              </option>
            </select>
          </div>

          {resultsMapUrl && (
            <div
              style={{
                marginBottom: "24px",
                overflow: "hidden",
                borderRadius: "20px",
                border: "1px solid #e4e4e4",
                background: "#ffffff",
                boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
              }}
            >
              <iframe
                title="喫煙候補店舗マップ"
                src={resultsMapUrl}
                width="100%"
                height="360"
                style={{
                  display: "block",
                  border: 0,
                }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          )}

          <div>
            {sortedRestaurants.map(
              (restaurant) => {
                const distance =
                  getRestaurantDistance(restaurant);

                return (
                  <button
                    className="trustBox"
                    key={restaurant.id}
                    onClick={() =>
                      openRestaurant(restaurant)
                    }
                    style={{
                      width: "calc(100% - 44px)",
                      border: "none",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <div>
                      <strong>
                        {restaurant.name}
                      </strong>

                      <p>
                        📍 {formatDistance(distance)}
                        <br />
                        {restaurant.genre}
                        <br />
                        🚬 {restaurant.smoking}
                        <br />
                        🕒{" "}
                        {restaurant.latestSmokingReportAt
                          ? `ユーザー確認 ${formatTimeAgo(
                              restaurant.latestSmokingReportAt
                            )}`
                          : "ユーザー確認なし"}
                        <br />
                        💰{" "}
                        {restaurant.budget ||
                          "予算情報なし"}
                        <br />
                        {restaurant.address}
                      </p>
                    </div>
                  </button>
                );
              }
            )}
          </div>
        </section>
      )}

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
