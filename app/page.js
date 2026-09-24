"use client";

import { useEffect, useMemo, useState } from "react";

const HISTORY_STORAGE_KEY = "smoke-map-history";
const HISTORY_LIMIT = 20;
const FAVORITES_STORAGE_KEY = "smoke-map-favorites";

export default function Home() {
  const [locationStatus, setLocationStatus] =
    useState("現在地から探す");

  const [userLocation, setUserLocation] =
    useState(null);

  const [areaQuery, setAreaQuery] =
    useState("");

  const [keywordQuery, setKeywordQuery] =
    useState("");

  const [searchAreaName, setSearchAreaName] =
    useState("");

  const [searchKeyword, setSearchKeyword] =
    useState("");

  const [searchMode, setSearchMode] =
    useState("current");

  const [restaurants, setRestaurants] =
    useState([]);

  const [
    selectedRestaurant,
    setSelectedRestaurant,
  ] = useState(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [selectedFilter, setSelectedFilter] =
    useState("all");

  const [sortType, setSortType] =
    useState("distance");

  const [reportResult, setReportResult] =
    useState("");

  const [reportLoading, setReportLoading] =
    useState(false);

  const [reportError, setReportError] =
    useState("");

  const [smokingStatus, setSmokingStatus] =
    useState(null);

  const [statusLoading, setStatusLoading] =
    useState(false);

  const [viewMode, setViewMode] =
    useState("search");

  const [history, setHistory] =
    useState([]);

  const [favorites, setFavorites] =
    useState([]);

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
      const savedHistory =
        window.localStorage.getItem(
          HISTORY_STORAGE_KEY
        );

      if (savedHistory) {
        const parsedHistory =
          JSON.parse(savedHistory);

        if (Array.isArray(parsedHistory)) {
          setHistory(parsedHistory);
        }
      }

      const savedFavorites =
        window.localStorage.getItem(
          FAVORITES_STORAGE_KEY
        );

      if (savedFavorites) {
        const parsedFavorites =
          JSON.parse(savedFavorites);

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
      if (
        event.origin !==
        window.location.origin
      ) {
        return;
      }

      if (
        event.data?.type !==
        "SMOKE_MAP_RESTAURANT"
      ) {
        return;
      }

      const restaurant =
        restaurants.find(
          (item) =>
            String(item.id) ===
            String(
              event.data.restaurantId
            )
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

  function addRestaurantToHistory(
    restaurant
  ) {
    if (!restaurant?.id) {
      return;
    }

    const historyRestaurant = {
      ...restaurant,
      viewedAt:
        new Date().toISOString(),
    };

    setHistory((currentHistory) => {
      const withoutSameRestaurant =
        currentHistory.filter(
          (item) =>
            String(item.id) !==
            String(restaurant.id)
        );

      const nextHistory = [
        historyRestaurant,
        ...withoutSameRestaurant,
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

  function saveFavorites(
    nextFavorites
  ) {
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
      const nextFavorites =
        favorites.filter(
          (item) =>
            String(item.id) !==
            String(restaurant.id)
        );

      saveFavorites(nextFavorites);
      return;
    }

    const favoriteRestaurant = {
      ...restaurant,
      favoritedAt:
        new Date().toISOString(),
    };

    saveFavorites([
      favoriteRestaurant,
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
      current === filterId
        ? "all"
        : filterId
    );
  }

  function matchesFilter(restaurant) {
    if (
      restaurant.smokingType ===
      "non_smoking"
    ) {
      return false;
    }

    if (selectedFilter === "all") {
      return (
        restaurant.smokingType !==
          "non_smoking" &&
        restaurant.smokingType !==
          "unknown"
      );
    }

    if (selectedFilter === "paper") {
      return (
        restaurant.smokingType ===
        "smoking_candidate"
      );
    }

    if (selectedFilter === "heated") {
      return (
        restaurant.smokingType ===
          "heated_candidate" ||
        restaurant.smokingType ===
          "smoking_candidate"
      );
    }

    if (selectedFilter === "seat") {
      return (
        restaurant.smokingType ===
        "smoking_candidate"
      );
    }

    if (selectedFilter === "room") {
      return (
        restaurant.smokingType ===
        "smoking_room"
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

    const latitude1 =
      toRadians(lat1);

    const latitude2 =
      toRadians(lat2);

    const latitudeDifference =
      toRadians(lat2 - lat1);

    const longitudeDifference =
      toRadians(lng2 - lng1);

    const a =
      Math.sin(
        latitudeDifference / 2
      ) *
        Math.sin(
          latitudeDifference / 2
        ) +
      Math.cos(latitude1) *
        Math.cos(latitude2) *
        Math.sin(
          longitudeDifference / 2
        ) *
        Math.sin(
          longitudeDifference / 2
        );

    const c =
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
      );

    return earthRadius * c;
  }

  function getRestaurantDistance(
    restaurant
  ) {
    if (!userLocation) {
      return Infinity;
    }

    const lat =
      Number(restaurant.lat);

    const lng =
      Number(restaurant.lng);

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
    if (
      !Number.isFinite(distance)
    ) {
      return "";
    }

    if (distance < 1000) {
      return `${Math.round(
        distance
      )}m`;
    }

    return `${(
      distance / 1000
    ).toFixed(1)}km`;
  }

  function getBudgetValue(
    budgetText
  ) {
    if (!budgetText) {
      return Infinity;
    }

    const numbers =
      String(budgetText)
        .replace(/,/g, "")
        .match(/\d+/g);

    if (
      !numbers ||
      numbers.length === 0
    ) {
      return Infinity;
    }

    return Number(numbers[0]);
  }

  function getSmokingFreshnessValue(
    restaurant
  ) {
    if (
      !restaurant.latestSmokingReportAt
    ) {
      return 0;
    }

    const time =
      new Date(
        restaurant.latestSmokingReportAt
      ).getTime();

    if (!Number.isFinite(time)) {
      return 0;
    }

    return time;
  }

  function getRatingValue(
    restaurant
  ) {
    const rating =
      Number(
        restaurant.googleRating
      );

    if (
      !Number.isFinite(rating)
    ) {
      return -1;
    }

    return rating;
  }

  const sortedRestaurants =
    useMemo(() => {
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

      if (
        sortType === "freshness"
      ) {
        return copiedRestaurants.sort(
          (a, b) =>
            getSmokingFreshnessValue(
              b
            ) -
            getSmokingFreshnessValue(
              a
            )
        );
      }

      if (sortType === "rating") {
        return copiedRestaurants.sort(
          (a, b) => {
            const ratingDifference =
              getRatingValue(b) -
              getRatingValue(a);

            if (
              ratingDifference !== 0
            ) {
              return ratingDifference;
            }

            return (
              Number(
                b.googleUserRatingCount ||
                  0
              ) -
              Number(
                a.googleUserRatingCount ||
                  0
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
    if (
      restaurantList.length === 0
    ) {
      return restaurantList;
    }

    try {
      const response =
        await fetch(
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

      const data =
        await response.json();

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
              String(
                restaurant.id
              )
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
    } catch (err) {
      console.error(err);

      return restaurantList.map(
        (restaurant) => ({
          ...restaurant,
          latestSmokingReportAt:
            null,
          latestSmokingReportStatus:
            null,
        })
      );
    }
  }

  async function loadGoogleRatings(
    restaurantList
  ) {
    if (
      restaurantList.length === 0
    ) {
      return restaurantList;
    }

    try {
      const response =
        await fetch(
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
                    id:
                      restaurant.id,
                    name:
                      restaurant.name,
                    address:
                      restaurant.address,
                  })
                ),
            }),
          }
        );

      const data =
        await response.json();

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
              String(
                restaurant.id
              )
            ];

          return {
            ...restaurant,
            googlePlaceId:
              rating?.placeId ||
              null,
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
    } catch (err) {
      console.error(err);

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

    const response =
      await fetch(
        `/api/restaurants?${params.toString()}`
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          "店舗検索に失敗しました"
      );
    }

    const filteredRestaurants =
      (data.restaurants || []).filter(
        matchesFilter
      );

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
              String(
                restaurant.id
              )
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
      filteredRestaurants.length ===
      0
    ) {
      setError(
        selectedFilter === "all"
          ? emptyMessage
          : "選択した条件に合う候補店が見つかりませんでした"
      );
    }
  }

  function searchRestaurants() {
    if (
      !navigator.geolocation
    ) {
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
        } catch (err) {
          setError(err.message);
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

  async function searchByArea(
    event
  ) {
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

      const lat =
        Number(areaData.lat);

      const lng =
        Number(areaData.lng);

      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng)
      ) {
        throw new Error(
          "エリアの位置情報を取得できませんでした"
        );
      }

      setUserLocation({
        lat,
        lng,
      });

      setSearchAreaName(
        areaData.area || query
      );

      setLocationStatus(
        `${
          areaData.area || query
        } 周辺`
      );

      await loadRestaurantsAtLocation(
        lat,
        lng,
        keyword
          ? `${
              areaData.area || query
            }周辺に「${keyword}」の喫煙候補店が見つかりませんでした`
          : `${
              areaData.area || query
            }
