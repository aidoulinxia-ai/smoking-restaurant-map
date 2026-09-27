"use client";

import { useEffect, useMemo, useState } from "react";
import BottomNav from "../components/BottomNav";
import FavoritesView from "../components/FavoritesView";
import HistoryView from "../components/HistoryView";
import RestaurantDetail from "../components/RestaurantDetail";
import SearchView from "../components/SearchView";
import MyPageView from "../components/MyPageView";

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
      console.error(
        "保存データの読み込みに失敗しました",
        error
      );
    }
  }, []);

  useEffect(() => {
    function handleMapMessage(event) {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (
        event.data?.type !== "SMOKE_MAP_RESTAURANT"
      ) {
        return;
      }

      const restaurant = restaurants.find(
        (item) =>
          String(item.id) ===
          String(event.data.restaurantId)
      );

      if (restaurant) {
        openRestaurant(restaurant);
      }
    }

    window.addEventListener(
      "message",
      handleMapMessage
    );

    return () => {
      window.removeEventListener(
        "message",
        handleMapMessage
      );
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
      console.error(
        "履歴の保存に失敗しました",
        error
      );
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
          (item) =>
            String(item.id) !==
            String(restaurant.id)
        ),
      ].slice(0, HISTORY_LIMIT);

      try {
        window.localStorage.setItem(
          HISTORY_STORAGE_KEY,
          JSON.stringify(nextHistory)
        );
      } catch (error) {
        console.error(
          "履歴の保存に失敗しました",
          error
        );
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
      console.error(
        "お気に入りの保存に失敗しました",
        error
      );
    }
  }

  function isFavorite(restaurantId) {
    return favorites.some(
      (restaurant) =>
        String(restaurant.id) ===
        String(restaurantId)
    );
  }

  function toggleFavorite(restaurant) {
    if (!restaurant?.id) {
      return;
    }

    if (isFavorite(restaurant.id)) {
      saveFavorites(
        favorites.filter(
          (item) =>
            String(item.id) !==
            String(restaurant.id)
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

  function scrollToTop() {
    window.scrollTo(0, 0);
  }

  function showSearch() {
    setViewMode("search");
    setSelectedRestaurant(null);
    setReportResult("");
    setReportError("");
    setSmokingStatus(null);
    scrollToTop();
  }

  function showFavorites() {
    setSelectedRestaurant(null);
    setViewMode("favorites");
    setReportResult("");
    setReportError("");
    setSmokingStatus(null);
    scrollToTop();
  }

  function showHistory() {
    setSelectedRestaurant(null);
    setViewMode("history");
    setReportResult("");
    setReportError("");
    setSmokingStatus(null);
    scrollToTop();
  }

  function showMyPage() {
    setSelectedRestaurant(null);
    setViewMode("mypage");
    setReportResult("");
    setReportError("");
    setSmokingStatus(null);
    scrollToTop();
  }

  function toggleFilter(filterId) {
    setSelectedFilter((current) =>
      current === filterId ? "all" : filterId
    );
  }

  function matchesFilter(restaurant) {
    if (
      restaurant.smokingType === "non_smoking"
    ) {
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
      return (
        restaurant.smokingType === "smoking_candidate"
      );
    }

    if (selectedFilter === "heated") {
      return (
        restaurant.smokingType === "heated_candidate" ||
        restaurant.smokingType === "smoking_candidate"
      );
    }

    if (selectedFilter === "room") {
      return (
        restaurant.smokingType === "smoking_room"
      );
    }

    return false;
  }

  function calculateDistance(
    lat1,
    lng1,
    lat2,
    lng2
  ) {
    const toRadians = (value) =>
      (value * Math.PI) / 180;

    const earthRadius = 6371000;

    const latitude1 = toRadians(lat1);
    const latitude2 = toRadians(lat2);

    const latitudeDifference =
      toRadians(lat2 - lat1);

    const longitudeDifference =
      toRadians(lng2 - lng1);

    const a =
      Math.sin(latitudeDifference / 2) ** 2 +
      Math.cos(latitude1) *
        Math.cos(latitude2) *
        Math.sin(longitudeDifference / 2) ** 2;

    return (
      earthRadius *
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
      )
    );
  }

  function getRestaurantDistance(restaurant) {
    if (!userLocation) {
      return Infinity;
    }

    const lat = Number(restaurant.lat);
    const lng = Number(restaurant.lng);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
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

    return numbers?.length
      ? Number(numbers[0])
      : Infinity;
  }

  function getSmokingFreshnessValue(
    restaurant
  ) {
    if (!restaurant.latestSmokingReportAt) {
      return 0;
    }

    const time = new Date(
      restaurant.latestSmokingReportAt
    ).getTime();

    return Number.isFinite(time) ? time : 0;
  }

  function getRatingValue(restaurant) {
    const rating = Number(
      restaurant.googleRating
    );

    return Number.isFinite(rating) ? rating : -1;
  }

  const sortedRestaurants = useMemo(() => {
    const copiedRestaurants = [
      ...restaurants,
    ];

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

    if (sortType === "rating") {
      return copiedRestaurants.sort(
        (a, b) => {
          const ratingDifference =
            getRatingValue(b) -
            getRatingValue(a);

          if (ratingDifference !== 0) {
            return ratingDifference;
          }

          return (
            Number(
              b.googleUserRatingCount || 0
            ) -
            Number(
              a.googleUserRatingCount || 0
            )
          );
        }
      );
    }

    return copiedRestaurants.sort(
      (a, b) =>
        getRestaurantDistance(a) -
        getRestaurantDistance(b)
    );
  }, [
    restaurants,
    sortType,
    userLocation,
  ]);

  async function loadSmokingStatuses(
    restaurantList
  ) {
    if (restaurantList.length === 0) {
      return restaurantList;
    }

    try {
      const response = await fetch(
        "/api/smoking-statuses",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            restaurantIds:
              restaurantList.map(
                (restaurant) =>
                  restaurant.id
              ),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "喫煙情報を取得できませんでした"
        );
      }

      const statuses =
        data.statuses || {};

      return restaurantList.map(
        (restaurant) => {
          const status =
            statuses[
              String(restaurant.id)
            ];

          return {
            ...restaurant,
            latestSmokingReportAt:
              status?.latestCreatedAt ||
              null,
            latestSmokingReportStatus:
              status?.latestStatus ||
              null,
          };
        }
      );
    } catch (error) {
      console.error(error);

      return restaurantList.map(
        (restaurant) => ({
          ...restaurant,
          latestSmokingReportAt: null,
          latestSmokingReportStatus: null,
        })
      );
    }
  }

  async function loadGoogleRatings(
    restaurantList
  ) {
    if (restaurantList.length === 0) {
      return restaurantList;
    }

    try {
      const response = await fetch(
        "/api/google-ratings",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            restaurants:
              restaurantList.map(
                (restaurant) => ({
                  id: restaurant.id,
                  name: restaurant.name,
                  address:
                    restaurant.address,
                })
              ),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Google評価を取得できませんでした"
        );
      }

      const ratings =
        data.ratings || {};

      return restaurantList.map(
        (restaurant) => {
          const rating =
            ratings[
              String(restaurant.id)
            ];

          return {
            ...restaurant,
            googlePlaceId:
              rating?.placeId || null,
            googleRating:
              typeof rating?.rating ===
              "number"
                ? rating.rating
                : null,
            googleUserRatingCount:
              typeof rating?.userRatingCount ===
              "number"
                ? rating.userRatingCount
                : 0,
          };
        }
      );
    } catch (error) {
      console.error(error);

      return restaurantList.map(
        (restaurant) => ({
          ...restaurant,
          googlePlaceId: null,
          googleRating: null,
          googleUserRatingCount: 0,
        })
      );
    }
  }

  async function loadRestaurantsAtLocation(
    lat,
    lng,
    emptyMessage,
    keyword = ""
  ) {
    const params =
      new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
      });

    if (keyword.trim()) {
      params.set(
        "keyword",
        keyword.trim()
      );
    }

    const response = await fetch(
      `/api/restaurants?${params.toString()}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          "店舗検索に失敗しました"
      );
    }

    const filteredRestaurants = (
      data.restaurants || []
    ).filter(matchesFilter);

    const [
      restaurantsWithStatuses,
      restaurantsWithRatings,
    ] = await Promise.all([
      loadSmokingStatuses(
        filteredRestaurants
      ),
      loadGoogleRatings(
        filteredRestaurants
      ),
    ]);

    const ratingMap =
      Object.fromEntries(
        restaurantsWithRatings.map(
          (restaurant) => [
            String(restaurant.id),
            restaurant,
          ]
        )
      );

    const completedRestaurants =
      restaurantsWithStatuses.map(
        (restaurant) => {
          const ratingRestaurant =
            ratingMap[
              String(restaurant.id)
            ];

          return {
            ...restaurant,
            googlePlaceId:
              ratingRestaurant?.googlePlaceId ||
              null,
            googleRating:
              ratingRestaurant?.googleRating ??
              null,
            googleUserRatingCount:
              ratingRestaurant?.googleUserRatingCount ||
              0,
          };
        }
      );

    setRestaurants(
      completedRestaurants
    );

    if (
      filteredRestaurants.length === 0
    ) {
      setError(
        selectedFilter === "all"
          ? emptyMessage
          : "選択した条件に合う候補店が見つかりませんでした"
      );
    }
  }

  function searchRestaurants() {
    if (!navigator.geolocation) {
      setError(
        "この端末では現在地を取得できません"
      );
      return;
    }

    setViewMode("search");
    setLoading(true);
    setError("");
    setRestaurants([]);
    setSelectedRestaurant(null);
    setSearchAreaName("");
    setSearchMode("current");

    const keyword =
      keywordQuery.trim();

    setSearchKeyword(keyword);
    setLocationStatus(
      "現在地を取得中..."
    );

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat =
            position.coords.latitude;

          const lng =
            position.coords.longitude;

          setUserLocation({
            lat,
            lng,
          });

          setLocationStatus(
            "現在地を取得しました"
          );

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
        setLocationStatus(
          "現在地の利用を許可してください"
        );

        setError(
          "現在地を取得できませんでした"
        );

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

    const query =
      areaQuery.trim();

    const keyword =
      keywordQuery.trim();

    if (!query) {
      setError(
        "エリアを入力してください"
      );
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
      const areaResponse =
        await fetch(
          `/api/area-search?area=${encodeURIComponent(
            query
          )}`
        );

      const areaData =
        await areaResponse.json();

      if (!areaResponse.ok) {
        throw new Error(
          areaData.error ||
            "エリアを検索できませんでした"
        );
      }

      const lat = Number(
        areaData.lat
      );

      const lng = Number(
        areaData.lng
      );

      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng)
      ) {
        throw new Error(
          "エリアの位置情報を取得できませんでした"
        );
      }

      const areaName =
        areaData.area || query;

      setUserLocation({
        lat,
        lng,
      });

      setSearchAreaName(
        areaName
      );

      setLocationStatus(
        `${areaName} 周辺`
      );

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

  async function loadSmokingStatus(
    restaurantId
  ) {
    setStatusLoading(true);
    setSmokingStatus(null);

    try {
      const response = await fetch(
        `/api/smoking-status?restaurantId=${encodeURIComponent(
          restaurantId
        )}`
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "最新情報を取得できませんでした"
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

  function openRestaurant(
    restaurant
  ) {
    setSelectedRestaurant(
      restaurant
    );

    setReportResult("");
    setReportError("");
    setSmokingStatus(null);

    addRestaurantToHistory(
      restaurant
    );

    loadSmokingStatus(
      restaurant.id
    );

    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
    });
  }

  function closeRestaurant() {
    setSelectedRestaurant(null);
    setReportResult("");
    setReportError("");
    setSmokingStatus(null);
    scrollToTop();
  }

  async function submitSmokingReport(
    smokingStatusValue
  ) {
    if (
      !selectedRestaurant ||
      reportLoading
    ) {
      return;
    }

    setReportLoading(true);
    setReportError("");

    try {
      const response = await fetch(
        "/api/smoking-report",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            restaurantId:
              selectedRestaurant.id,
            restaurantName:
              selectedRestaurant.name,
            smokingStatus:
              smokingStatusValue,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "報告を保存できませんでした"
        );
      }

      setReportResult(
        smokingStatusValue
      );

      await loadSmokingStatus(
        selectedRestaurant.id
      );

      setRestaurants(
        (currentRestaurants) =>
          currentRestaurants.map(
            (restaurant) =>
              String(
                restaurant.id
              ) ===
              String(
                selectedRestaurant.id
              )
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
      setReportError(
        error.message
      );
    } finally {
      setReportLoading(false);
    }
  }

  function formatTimeAgo(
    dateString
  ) {
    if (!dateString) {
      return "";
    }

    const date =
      new Date(dateString);

    const difference =
      Date.now() -
      date.getTime();

    if (difference < 0) {
      return "たった今";
    }

    const minutes =
      Math.floor(
        difference / 60000
      );

    const hours =
      Math.floor(
        difference / 3600000
      );

    const days =
      Math.floor(
        difference / 86400000
      );

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

    return date.toLocaleDateString(
      "ja-JP"
    );
  }

  function latestReportText(
    status
  ) {
    if (status === "paper_ok") {
      return "🚬 紙巻きが吸えた";
    }

    if (
      status === "heated_only"
    ) {
      return "🔥 加熱式だけ吸えた";
    }

    if (
      status === "not_allowed"
    ) {
      return "🚭 吸えなかった";
    }

    return "情報なし";
  }

  function smokingTypeText(
    restaurant
  ) {
    if (
      restaurant.smokingType ===
      "smoking_candidate"
    ) {
      return "喫煙可能候補";
    }

    if (
      restaurant.smokingType ===
      "heated_candidate"
    ) {
      return "加熱式たばこ候補";
    }

    if (
      restaurant.smokingType ===
      "smoking_room"
    ) {
      return "喫煙室あり";
    }

    return "喫煙情報あり";
  }

  function getMapUrl(
    restaurant
  ) {
    const lat = Number(
      restaurant.lat
    );

    const lng = Number(
      restaurant.lng
    );

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return "";
    }

    return `/api/google-map?lat=${encodeURIComponent(
      lat
    )}&lng=${encodeURIComponent(
      lng
    )}`;
  }

  function getResultsMapUrl() {
    if (
      restaurants.length === 0 ||
      !userLocation
    ) {
      return "";
    }

    const mapRestaurants =
      restaurants.map(
        (restaurant) => ({
          id: restaurant.id,
          name: restaurant.name,
          lat: restaurant.lat,
          lng: restaurant.lng,
        })
      );

    return (
      `/api/results-map` +
      `?lat=${encodeURIComponent(
        userLocation.lat
      )}` +
      `&lng=${encodeURIComponent(
        userLocation.lng
      )}` +
      `&showCurrentLocation=${
        searchMode === "current"
          ? "true"
          : "false"
      }` +
      `&restaurants=${encodeURIComponent(
        JSON.stringify(
          mapRestaurants
        )
      )}`
    );
  }

  function getDirectionsUrl(
    restaurant
  ) {
    const lat = Number(
      restaurant.lat
    );

    const lng = Number(
      restaurant.lng
    );

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return "";
    }

    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      `${lat},${lng}`
    )}`;
  }

  const bottomNavProps = {
    onSearch: showSearch,
    onFavorites: showFavorites,
    onHistory: showHistory,
    onMyPage: showMyPage,
  };

  if (selectedRestaurant) {
    const mapUrl =
      getMapUrl(
        selectedRestaurant
      );

    const directionsUrl =
      getDirectionsUrl(
        selectedRestaurant
      );

    return (
      <main className="home">
        <RestaurantDetail
          restaurant={
            selectedRestaurant
          }
          isFavorite={isFavorite(
            selectedRestaurant.id
          )}
          onToggleFavorite={
            toggleFavorite
          }
          onClose={
            closeRestaurant
          }
          mapUrl={mapUrl}
          directionsUrl={
            directionsUrl
          }
          smokingStatus={
            smokingStatus
          }
          statusLoading={
            statusLoading
          }
          formatTimeAgo={
            formatTimeAgo
          }
          latestReportText={
            latestReportText
          }
          smokingTypeText={
            smokingTypeText
          }
          reportResult={
            reportResult
          }
          reportLoading={
            reportLoading
          }
          reportError={
            reportError
          }
          onSubmitSmokingReport={
            submitSmokingReport
          }
        />

        <BottomNav
          activeMode={viewMode}
          {...bottomNavProps}
        />
      </main>
    );
  }

  if (
    viewMode === "favorites"
  ) {
    return (
      <main className="home">
        <header className="header">
          <div className="logo">
            SMOKE MAP
          </div>

          <button
            className="menuButton"
            onClick={showSearch}
            aria-label="戻る"
          >
            ←
          </button>
        </header>

        <FavoritesView
          favorites={favorites}
          onOpenRestaurant={
            openRestaurant
          }
          onToggleFavorite={
            toggleFavorite
          }
        />

        <BottomNav
          activeMode="favorites"
          {...bottomNavProps}
        />
      </main>
    );
  }

  if (
    viewMode === "history"
  ) {
    return (
      <main className="home">
        <header className="header">
          <div className="logo">
            SMOKE MAP
          </div>

          <button
            className="menuButton"
            onClick={showSearch}
            aria-label="戻る"
          >
            ←
          </button>
        </header>

        <HistoryView
          history={history}
          onOpenRestaurant={
            openRestaurant
          }
          onClearHistory={
            clearHistory
          }
          formatTimeAgo={
            formatTimeAgo
          }
        />

        <BottomNav
          activeMode="history"
          {...bottomNavProps}
        />
      </main>
    );
  }

  if (
    viewMode === "mypage"
  ) {
    return (
      <main className="home">
        <MyPageView
          favoritesCount={
            favorites.length
          }
          historyCount={
            history.length
          }
          onOpenFavorites={
            showFavorites
          }
          onOpenHistory={
            showHistory
          }
        />

        <BottomNav
          activeMode="mypage"
          {...bottomNavProps}
        />
      </main>
    );
  }

  const resultsMapUrl =
    getResultsMapUrl();

  return (
    <main className="home">
      <SearchView
        areaQuery={areaQuery}
        setAreaQuery={setAreaQuery}
        keywordQuery={
          keywordQuery
        }
        setKeywordQuery={
          setKeywordQuery
        }
        onSearchByArea={
          searchByArea
        }
        onSearchCurrentLocation={
          searchRestaurants
        }
        loading={loading}
        error={error}
        filters={filters}
        selectedFilter={
          selectedFilter
        }
        onToggleFilter={
          toggleFilter
        }
        restaurants={
          restaurants
        }
        sortedRestaurants={
          sortedRestaurants
        }
        searchAreaName={
          searchAreaName
        }
        searchKeyword={
          searchKeyword
        }
        searchMode={
          searchMode
        }
        sortType={sortType}
        setSortType={
          setSortType
        }
        resultsMapUrl={
          resultsMapUrl
        }
        getRestaurantDistance={
          getRestaurantDistance
        }
        formatDistance={
          formatDistance
        }
        formatTimeAgo={
          formatTimeAgo
        }
        onOpenRestaurant={
          openRestaurant
        }
      />

      <BottomNav
        activeMode="search"
        {...bottomNavProps}
      />
    </main>
  );
}
