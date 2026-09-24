"use client";

import { useEffect, useMemo, useState } from "react";

const HISTORY_STORAGE_KEY = "smoke-map-history";
const HISTORY_LIMIT = 20;
const FAVORITES_STORAGE_KEY = "smoke-map-favorites";

export default function Home() {
  const [locationStatus, setLocationStatus] =
    useState("現在地から探す");
  const [userLocation, setUserLocation] = useState(null);
  const [areaQuery, setAreaQuery] = useState("");
  const [keywordQuery, setKeywordQuery] = useState("");
  const [searchAreaName, setSearchAreaName] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchMode, setSearchMode] = useState("current");
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] =
    useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [sortType, setSortType] = useState("distance");
  const [reportResult, setReportResult] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  const [smokingStatus, setSmokingStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [viewMode, setViewMode] = useState("search");
  const [history, setHistory] = useState([]);
  const [favorites, setFavorites] = useState([]);

  const filters = [
    {
      id: "paper",
      icon: "🚬",
      label: "紙巻きOK",
    },
    {
      id: "heated",
      icon: "🔥",
      label: "加熱式OK",
    },
    {
      id: "seat",
      icon: "🪑",
      label: "席で吸える",
    },
    {
      id: "room",
      icon: "🚪",
      label: "喫煙室あり",
    },
  ];

  useEffect(() => {
    try {
      const savedHistory = window.localStorage.getItem(
        HISTORY_STORAGE_KEY
      );

      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory);

        if (Array.isArray(parsedHistory)) {
          setHistory(parsedHistory);
        }
      }

      const savedFavorites = window.localStorage.getItem(
        FAVORITES_STORAGE_KEY
      );

      if (savedFavorites) {
        const parsedFavorites = JSON.parse(savedFavorites);

        if (Array.isArray(parsedFavorites)) {
          setFavorites(parsedFavorites);
        }
      }
    } catch (error) {
      console.error("保存データの読み込みに失敗しました", error);
    }
  }, []);

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

  function saveHistory(nextHistory) {
    setHistory(nextHistory);

    try {
      window.localStorage.setItem(
        HISTORY_STORAGE_KEY,
        JSON.stringify(nextHistory)
      );
    } catch (error) {
      console.error("履歴の保存に失敗しました", error);
    }
  }

  function addRestaurantToHistory(restaurant) {
    if (!restaurant?.id) {
      return;
    }

    setHistory((currentHistory) => {
      const nextHistory = [
        {
          ...restaurant,
          viewedAt: new Date().toISOString(),
        },
        ...currentHistory.filter(
          (item) => String(item.id) !== String(restaurant.id)
        ),
      ].slice(0, HISTORY_LIMIT);

      try {
        window.localStorage.setItem(
          HISTORY_STORAGE_KEY,
          JSON.stringify(nextHistory)
        );
      } catch (error) {
        console.error("履歴の保存に失敗しました", error);
      }

      return nextHistory;
    });
  }

  function clearHistory() {
    saveHistory([]);
  }

  function saveFavorites(nextFavorites) {
    setFavorites(nextFavorites);

    try {
      window.localStorage.setItem(
        FAVORITES_STORAGE_KEY,
        JSON.stringify(nextFavorites)
      );
    } catch (error) {
      console.error("お気に入りの保存に失敗しました", error);
    }
  }

  function isFavorite(restaurantId) {
    return favorites.some(
      (restaurant) =>
        String(restaurant.id) === String(restaurantId)
    );
  }

  function toggleFavorite(restaurant) {
    if (!restaurant?.id) {
      return;
    }

    if (isFavorite(restaurant.id)) {
      saveFavorites(
        favorites.filter(
          (item) => String(item.id) !== String(restaurant.id)
        )
      );

      return;
    }

    saveFavorites([
      {
        ...restaurant,
        favoritedAt: new Date().toISOString(),
      },
      ...favorites,
    ]);
  }

  function showSearch() {
    setViewMode("search");
    setSelectedRestaurant(null);
    setReportResult("");
    setReportError("");
    setSmokingStatus(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function showFavorites() {
    setSelectedRestaurant(null);
    setViewMode("favorites");
    setReportResult("");
    setReportError("");
    setSmokingStatus(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function showHistory() {
    setSelectedRestaurant(null);
    setViewMode("history");
    setReportResult("");
    setReportError("");
    setSmokingStatus(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

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

    if (
      selectedFilter === "paper" ||
      selectedFilter === "seat"
    ) {
      return restaurant.smokingType === "smoking_candidate";
    }

    if (selectedFilter === "heated") {
      return (
        restaurant.smokingType === "heated_candidate" ||
        restaurant.smokingType === "smoking_candidate"
      );
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
      Math.sin(latitudeDifference / 2) ** 2 +
      Math.cos(latitude1) *
        Math.cos(latitude2) *
        Math.sin(longitudeDifference / 2) ** 2;

    return (
      earthRadius *
      2 *
      Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    );
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

    return numbers?.length ? Number(numbers[0]) : Infinity;
  }

  function getSmokingFreshnessValue(restaurant) {
    if (!restaurant.latestSmokingReportAt) {
      return 0;
    }

    const time = new Date(
      restaurant.latestSmokingReportAt
    ).getTime();

    return Number.isFinite(time) ? time : 0;
  }

  function getRatingValue(restaurant) {
    const rating = Number(restaurant.googleRating);

    return Number.isFinite(rating) ? rating : -1;
  }

  const sortedRestaurants = useMemo(() => {
    const copiedRestaurants = [...restaurants];

    if (sortType === "price") {
      return copiedRestaurants.sort(
        (a, b) =>
          getBudgetValue(a.budget) - getBudgetValue(b.budget)
      );
    }

    if (sortType === "freshness") {
      return copiedRestaurants.sort(
        (a, b) =>
          getSmokingFreshnessValue(b) -
          getSmokingFreshnessValue(a)
      );
    }

    if (sortType === "rating") {
      return copiedRestaurants.sort((a, b) => {
        const ratingDifference =
          getRatingValue(b) - getRatingValue(a);

        if (ratingDifference !== 0) {
          return ratingDifference;
        }

        return (
          Number(b.googleUserRatingCount || 0) -
          Number(a.googleUserRatingCount || 0)
        );
      });
    }

    return copiedRestaurants.sort(
      (a, b) =>
        getRestaurantDistance(a) - getRestaurantDistance(b)
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
    } catch (error) {
      console.error(error);

      return restaurantList.map((restaurant) => ({
        ...restaurant,
        latestSmokingReportAt: null,
        latestSmokingReportStatus: null,
      }));
    }
  }

  async function loadGoogleRatings(restaurantList) {
    if (restaurantList.length === 0) {
      return restaurantList;
    }

    try {
      const response = await fetch("/api/google-ratings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          restaurants: restaurantList.map((restaurant) => ({
            id: restaurant.id,
            name: restaurant.name,
            address: restaurant.address,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Google評価を取得できませんでした"
        );
      }

      const ratings = data.ratings || {};

      return restaurantList.map((restaurant) => {
        const rating = ratings[String(restaurant.id)];

        return {
          ...restaurant,
          googlePlaceId: rating?.placeId || null,
          googleRating:
            typeof rating?.rating === "number"
              ? rating.rating
              : null,
          googleUserRatingCount:
            typeof rating?.userRatingCount === "number"
              ? rating.userRatingCount
              : 0,
        };
      });
    } catch (error) {
      console.error(error);

      return restaurantList.map((restaurant) => ({
        ...restaurant,
        googlePlaceId: null,
        googleRating: null,
        googleUserRatingCount: 0,
      }));
    }
  }

  async function loadRestaurantsAtLocation(
    lat,
    lng,
    emptyMessage,
    keyword = ""
  ) {
    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
    });

    if (keyword.trim()) {
      params.set("keyword", keyword.trim());
    }

    const response = await fetch(
      `/api/restaurants?${params.toString()}`
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

    const [restaurantsWithStatuses, restaurantsWithRatings] =
      await Promise.all([
        loadSmokingStatuses(filteredRestaurants),
        loadGoogleRatings(filteredRestaurants),
      ]);

    const ratingMap = Object.fromEntries(
      restaurantsWithRatings.map((restaurant) => [
        String(restaurant.id),
        restaurant,
      ])
    );

    const completedRestaurants = restaurantsWithStatuses.map(
      (restaurant) => {
        const ratingRestaurant =
          ratingMap[String(restaurant.id)];

        return {
          ...restaurant,
          googlePlaceId:
            ratingRestaurant?.googlePlaceId || null,
          googleRating:
            ratingRestaurant?.googleRating ?? null,
          googleUserRatingCount:
            ratingRestaurant?.googleUserRatingCount || 0,
        };
      }
    );

    setRestaurants(completedRestaurants);

    if (filteredRestaurants.length === 0) {
      setError(
        selectedFilter === "all"
          ? emptyMessage
          : "選択した条件に合う候補店が見つかりませんでした"
      );
    }
  }

  function searchRestaurants() {
    if (!navigator.geolocation) {
      setError("この端末では現在地を取得できません");
      return;
    }

    setViewMode("search");
    setLoading(true);
    setError("");
    setRestaurants([]);
    setSelectedRestaurant(null);
    setSearchAreaName("");
    setSearchMode("current");

    const keyword = keywordQuery.trim();

    setSearchKeyword(keyword);
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

          await loadRestaurantsAtLocation(
            lat,
            lng,
            keyword
              ? `現在地周辺に「${keyword}」の喫煙候補店が見つかりませんでした`
              : "現在地周辺に喫煙可能な候補店が見つかりませんでした",
            keyword
          );
        } catch (error) {
          setError(error.message);
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

  async function searchByArea(event) {
    event?.preventDefault();

    const query = areaQuery.trim();
    const keyword = keywordQuery.trim();

    if (!query) {
      setError("エリアを入力してください");
      return;
    }

    setViewMode("search");
    setLoading(true);
    setError("");
    setRestaurants([]);
    setSelectedRestaurant(null);
    setSearchMode("area");
    setSearchKeyword(keyword);

    try {
      const areaResponse = await fetch(
        `/api/area-search?area=${encodeURIComponent(query)}`
      );

      const areaData = await areaResponse.json();

      if (!areaResponse.ok) {
        throw new Error(
          areaData.error || "エリアを検索できませんでした"
        );
      }

      const lat = Number(areaData.lat);
      const lng = Number(areaData.lng);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error(
          "エリアの位置情報を取得できませんでした"
        );
      }

      const areaName = areaData.area || query;

      setUserLocation({
        lat,
        lng,
      });

      setSearchAreaName(areaName);
      setLocationStatus(`${areaName} 周辺`);

      await loadRestaurantsAtLocation(
        lat,
        lng,
        keyword
          ? `${areaName}周辺に「${keyword}」の喫煙候補店が見つかりませんでした`
          : `${areaName}周辺に喫煙可能な候補店が見つかりませんでした`,
        keyword
      );
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
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
    } catch (error) {
      console.error(error);
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

    addRestaurantToHistory(restaurant);
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

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
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
    } catch (error) {
      setReportError(error.message);
    } finally {
      setReportLoading(false);
    }
  }

  function formatTimeAgo(dateString) {
    if (!dateString) {
      return "";
    }

    const date = new Date(dateString);
    const difference = Date.now() - date.getTime();

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
      return "🚬 紙巻きが吸えた";
    }

    if (status === "heated_only") {
      return "🔥 加熱式だけ吸えた";
    }

    if (status === "not_allowed") {
      return "🚭 吸えなかった";
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

    const mapRestaurants = restaurants.map((restaurant) => ({
      id: restaurant.id,
      name: restaurant.name,
      lat: restaurant.lat,
      lng: restaurant.lng,
    }));

    return (
      `/api/results-map` +
      `?lat=${encodeURIComponent(userLocation.lat)}` +
      `&lng=${encodeURIComponent(userLocation.lng)}` +
      `&showCurrentLocation=${
        searchMode === "current" ? "true" : "false"
      }` +
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

  function renderBottomNav(activeMode) {
    return (
      <nav className="bottomNav">
        <button
          className={
            activeMode === "search" ? "navActive" : ""
          }
          onClick={showSearch}
        >
          <span>⌖</span>
          <small>探す</small>
        </button>

        <button
          className={
            activeMode === "favorites" ? "navActive" : ""
          }
          onClick={showFavorites}
        >
          <span>♡</span>
          <small>お気に入り</small>
        </button>

        <button
          className={
            activeMode === "history" ? "navActive" : ""
          }
          onClick={showHistory}
        >
          <span>☷</span>
          <small>履歴</small>
        </button>

        <button>
          <span>○</span>
          <small>マイページ</small>
        </button>
      </nav>
    );
  }

  if (selectedRestaurant) {
    const mapUrl = getMapUrl(selectedRestaurant);
    const directionsUrl = getDirectionsUrl(selectedRestaurant);
    const selectedIsFavorite = isFavorite(
      selectedRestaurant.id
    );

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
            <span>{smokingTypeText(selectedRestaurant)}</span>
          </div>

          <h1>{selectedRestaurant.name}</h1>

          <p className="description">
            {selectedRestaurant.genre || "ジャンル情報なし"}
          </p>

          <button
            onClick={() => toggleFavorite(selectedRestaurant)}
            style={{
              minHeight: "48px",
              padding: "0 18px",
              border: selectedIsFavorite
                ? "1px solid #151515"
                : "1px solid #dddddd",
              borderRadius: "14px",
              background: selectedIsFavorite
                ? "#151515"
                : "#ffffff",
              color: selectedIsFavorite
                ? "#ffffff"
                : "#151515",
              fontWeight: "800",
            }}
          >
            {selectedIsFavorite
              ? "♥ お気に入り済み"
              : "♡ お気に入りに追加"}
          </button>
        </section>

        <section className="filterSection">
          {selectedRestaurant.googleRating !== null &&
            selectedRestaurant.googleRating !== undefined && (
              <div className="trustBox">
                <div>
                  <strong>⭐ Google評価</strong>

                  <p>
                    ⭐{" "}
                    {Number(
                      selectedRestaurant.googleRating
                    ).toFixed(1)}
                    {" ・ "}
                    {selectedRestaurant.googleUserRatingCount || 0}
                    件の評価
                  </p>
                </div>
              </div>
            )}

          <div className="trustBox">
            <div className="trustIcon">✓</div>

            <div>
              <strong>掲載情報</strong>

              <p>
                {selectedRestaurant.smoking || "喫煙情報なし"}
              </p>
            </div>
          </div>

          <div className="trustBox">
            <div>
              <strong>💬 みんなの報告</strong>

              {statusLoading ? (
                <p>確認中...</p>
              ) : smokingStatus?.total > 0 &&
                smokingStatus.latestReport ? (
                <p>
                  最終報告：
                  {formatTimeAgo(
                    smokingStatus.latestReport.created_at
                  )}
                  <br />
                  {latestReportText(
                    smokingStatus.latestReport.smoking_status
                  )}
                  <br />
                  直近{smokingStatus.total}件中
                  {smokingStatus.smokedCount}件が「吸えた」と報告
                </p>
              ) : (
                <p>
                  まだみんなからの報告はありません。
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
                  最新の報告として保存しました。
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

        {renderBottomNav(viewMode)}
      </main>
    );
  }

  if (viewMode === "favorites") {
    return (
      <main className="home">
        <header className="header">
          <div className="logo">SMOKE MAP</div>

          <button
            className="menuButton"
            onClick={showSearch}
            aria-label="戻る"
          >
            ←
          </button>
        </header>

        <section className="hero">
          <div className="location">
            <span>♡</span>
            <span>保存したお店</span>
          </div>

          <h1>お気に入り</h1>

          <p className="description">
            気になるお店を保存して、
            <br />
            いつでもすぐに見直せます。
          </p>
        </section>

        <section className="filterSection">
          {favorites.length === 0 ? (
            <div className="trustBox">
              <div>
                <strong>まだお気に入りはありません</strong>

                <p>
                  店舗詳細の「♡ お気に入りに追加」から保存できます。
                </p>
              </div>
            </div>
          ) : (
            <>
              <p className="filterTitle">
                保存したお店（{favorites.length}件）
              </p>

              {favorites.map((restaurant) => (
                <div
                  className="trustBox"
                  key={restaurant.id}
                  style={{
                    position: "relative",
                  }}
                >
                  <button
                    onClick={() => openRestaurant(restaurant)}
                    style={{
                      flex: 1,
                      padding: 0,
                      border: 0,
                      background: "transparent",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <strong>{restaurant.name}</strong>

                    <p>
                      {restaurant.genre || "ジャンル情報なし"}
                      <br />
                      🚬 {restaurant.smoking || "喫煙情報なし"}
                      <br />
                      ⭐{" "}
                      {restaurant.googleRating != null
                        ? `${Number(
                            restaurant.googleRating
                          ).toFixed(1)}（${
                            restaurant.googleUserRatingCount || 0
                          }件）`
                        : "Google評価なし"}
                      <br />
                      💰 {restaurant.budget || "予算情報なし"}
                      <br />
                      {restaurant.address || "住所情報なし"}
                    </p>
                  </button>

                  <button
                    onClick={() => toggleFavorite(restaurant)}
                    aria-label="お気に入りから削除"
                    style={{
                      flex: "0 0 42px",
                      width: "42px",
                      height: "42px",
                      border: "1px solid #dddddd",
                      borderRadius: "12px",
                      background: "#ffffff",
                      fontSize: "20px",
                    }}
                  >
                    ♥
                  </button>
                </div>
              ))}
            </>
          )}
        </section>

        {renderBottomNav("favorites")}
      </main>
    );
  }

  if (viewMode === "history") {
    return (
      <main className="home">
        <header className="header">
          <div className="logo">SMOKE MAP</div>

          <button
            className="menuButton"
            onClick={showSearch}
            aria-label="戻る"
          >
            ←
          </button>
        </header>

        <section className="hero">
          <div className="location">
            <span>☷</span>
            <span>最近見たお店</span>
          </div>

          <h1>閲覧履歴</h1>

          <p className="description">
            最近チェックしたお店を
            <br />
            すぐに見直せます。
          </p>
        </section>

        <section className="filterSection">
          {history.length === 0 ? (
            <div className="trustBox">
              <div>
                <strong>まだ履歴はありません</strong>

                <p>
                  お店の詳細を見ると、ここに自動で保存されます。
                </p>
              </div>
            </div>
          ) : (
            <>
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
                  最近見たお店（{history.length}件）
                </p>

                <button
                  onClick={clearHistory}
                  style={{
                    border: "1px solid #dddddd",
                    borderRadius: "12px",
                    background: "#ffffff",
                    padding: "10px 12px",
                    color: "#737373",
                    fontSize: "12px",
                    fontWeight: "700",
                  }}
                >
                  履歴を削除
                </button>
              </div>

              {history.map((restaurant) => (
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
                      {restaurant.genre || "ジャンル情報なし"}
                      <br />
                      🚬 {restaurant.smoking || "喫煙情報なし"}
                      <br />
                      ⭐{" "}
                      {restaurant.googleRating != null
                        ? `${Number(
                            restaurant.googleRating
                          ).toFixed(1)}（${
                            restaurant.googleUserRatingCount || 0
                          }件）`
                        : "Google評価なし"}
                      <br />
                      🕒{" "}
                      {restaurant.viewedAt
                        ? `${formatTimeAgo(
                            restaurant.viewedAt
                          )}に閲覧`
                        : ""}
                      <br />
                      {restaurant.address || "住所情報なし"}
                    </p>
                  </div>
                </button>
              ))}
            </>
          )}
        </section>

        {renderBottomNav("history")}
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

        <form
          onSubmit={searchByArea}
          style={{
            display: "grid",
            gap: "14px",
            marginTop: "24px",
          }}
        >
          <SearchInput
            label="エリア"
            value={areaQuery}
            setValue={setAreaQuery}
            placeholder="新宿・池袋・渋谷など"
          />

          <SearchInput
            label="店名・ジャンル"
            value={keywordQuery}
            setValue={setKeywordQuery}
            placeholder="焼肉・居酒屋・鳥貴族など"
          />

          <button
            type="submit"
            className="searchButton"
            disabled={loading}
          >
            <span>🔍</span>
            {loading ? "検索中..." : "この条件で探す"}
          </button>
        </form>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            margin: "20px 0",
            color: "#a0a0a0",
            fontSize: "12px",
          }}
        >
          <div
            style={{
              flex: 1,
              height: "1px",
              background: "#e8e8e8",
            }}
          />

          <span>または</span>

          <div
            style={{
              flex: 1,
              height: "1px",
              background: "#e8e8e8",
            }}
          />
        </div>

        <button
          className="location"
          onClick={searchRestaurants}
          disabled={loading}
          style={{
            marginBottom: 0,
          }}
        >
          <span>📍</span>
          <span>{locationStatus}</span>
        </button>
      </section>

      <section className="filterSection">
        <p className="filterTitle">吸い方を選ぶ</p>

        <div className="filterGrid">
          {filters.map((filter) => (
            <button
              key={filter.id}
              className="filterCard"
              onClick={() => toggleFilter(filter.id)}
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
              <span className="filterIcon">{filter.icon}</span>
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
          <span>📍</span>

          {loading
            ? "お店を検索中..."
            : keywordQuery.trim()
              ? `現在地から「${keywordQuery.trim()}」を探す`
              : "現在地から探す"}
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
          {(searchAreaName || searchKeyword) && (
            <p
              style={{
                margin: "0 0 12px",
                color: "#737373",
                fontSize: "13px",
                fontWeight: "700",
              }}
            >
              {searchAreaName
                ? `📍 ${searchAreaName} 周辺`
                : "📍 現在地周辺"}

              {searchKeyword ? ` × 🔍 ${searchKeyword}` : ""}
            </p>
          )}

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
                maxWidth: "220px",
                padding: "0 10px",
                border: "1px solid #dddddd",
                borderRadius: "12px",
                background: "#ffffff",
                color: "#151515",
                fontSize: "13px",
                fontWeight: "700",
              }}
            >
              <option value="distance">📍 近い順</option>
              <option value="price">💰 安い順</option>
              <option value="freshness">
                💬 報告が新しい順
              </option>
              <option value="rating">
                ⭐ Google評価が高い順
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

          {sortedRestaurants.map((restaurant) => {
            const distance = getRestaurantDistance(restaurant);

            return (
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
                    📍{" "}
                    {searchMode === "area" && searchAreaName
                      ? `${searchAreaName}から `
                      : ""}
                    {formatDistance(distance)}
                    <br />
                    {restaurant.genre || "ジャンル情報なし"}
                    <br />
                    🚬 {restaurant.smoking || "喫煙情報なし"}
                    <br />
                    {restaurant.latestSmokingReportAt
                      ? `💬 みんなの報告 ${formatTimeAgo(
                          restaurant.latestSmokingReportAt
                        )}`
                      : "💬 みんなの報告なし"}
                    <br />
                    ⭐{" "}
                    {restaurant.googleRating != null
                      ? `${Number(
                          restaurant.googleRating
                        ).toFixed(1)}（${
                          restaurant.googleUserRatingCount || 0
                        }件）`
                      : "Google評価なし"}
                    <br />
                    💰 {restaurant.budget || "予算情報なし"}
                    <br />
                    {restaurant.address || "住所情報なし"}
                  </p>
                </div>
              </button>
            );
          })}
        </section>
      )}

      <section className="trustBox">
        <div className="trustIcon">✓</div>

        <div>
          <strong>新しい報告を優先</strong>

          <p>
            掲載情報とみんなの報告から、今の喫煙状況を確認できます。
          </p>
        </div>
      </section>

      {renderBottomNav("search")}
    </main>
  );
}

function SearchInput({
  label,
  value,
  setValue,
  placeholder,
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          marginBottom: "7px",
          fontSize: "13px",
          fontWeight: "800",
        }}
      >
        {label}
      </label>

      <div
        style={{
          position: "relative",
        }}
      >
        <input
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          aria-label={label}
          style={{
            width: "100%",
            minHeight: "56px",
            padding: value ? "0 52px 0 16px" : "0 16px",
            border: "1px solid #dddddd",
            borderRadius: "16px",
            background: "#ffffff",
            color: "#151515",
            fontSize: "16px",
            outline: "none",
          }}
        />

        {value && (
          <button
            type="button"
            onClick={() => setValue("")}
            aria-label={`${label}を消去`}
            style={{
              position: "absolute",
              top: "50%",
              right: "10px",
              transform: "translateY(-50%)",
              width: "36px",
              height: "36px",
              padding: 0,
              border: 0,
              borderRadius: "50%",
              background: "#f0f0f0",
              color: "#666666",
              fontSize: "20px",
              lineHeight: 1,
              display: "grid",
              placeItems: "center",
            }}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
