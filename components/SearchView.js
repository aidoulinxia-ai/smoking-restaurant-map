"use client";

export default function SearchView({
  areaQuery,
  setAreaQuery,
  keywordQuery,
  setKeywordQuery,
  onSearchByArea,
  onSearchCurrentLocation,
  loading,
  error,
  filters,
  selectedFilter,
  onToggleFilter,
  restaurants,
  sortedRestaurants,
  searchAreaName,
  searchKeyword,
  searchMode,
  sortType,
  setSortType,
  resultsMapUrl,
  getRestaurantDistance,
  formatDistance,
  formatTimeAgo,
  onOpenRestaurant,
}) {
  return (
    <>
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
          onSubmit={onSearchByArea}
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
      </section>

      <section className="filterSection">
        <p className="filterTitle">吸い方を選ぶ</p>

        <div className="filterGrid">
          {filters.map((filter) => (
            <button
              key={filter.id}
              className="filterCard"
              onClick={() => onToggleFilter(filter.id)}
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
          onClick={onSearchCurrentLocation}
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

              {searchKeyword
                ? ` × 🔍 ${searchKeyword}`
                : ""}
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
              <option value="distance">
                📍 近い順
              </option>

              <option value="price">
                💰 安い順
              </option>

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
                boxShadow:
                  "0 8px 24px rgba(0,0,0,0.08)",
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
            const distance =
              getRestaurantDistance(restaurant);

            return (
              <button
                className="trustBox"
                key={restaurant.id}
                onClick={() =>
                  onOpenRestaurant(restaurant)
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
                    📍{" "}
                    {searchMode === "area" &&
                    searchAreaName
                      ? `${searchAreaName}から `
                      : ""}
                    {formatDistance(distance)}
                    <br />

                    {restaurant.genre ||
                      "ジャンル情報なし"}
                    <br />

                    🚬{" "}
                    {restaurant.smoking ||
                      "喫煙情報なし"}
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
                          restaurant.googleUserRatingCount ||
                          0
                        }件）`
                      : "Google評価なし"}
                    <br />

                    💰{" "}
                    {restaurant.budget ||
                      "予算情報なし"}
                    <br />

                    {restaurant.address ||
                      "住所情報なし"}
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
    </>
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
          onChange={(event) =>
            setValue(event.target.value)
          }
          placeholder={placeholder}
          aria-label={label}
          style={{
            width: "100%",
            minHeight: "56px",
            padding: value
              ? "0 52px 0 16px"
              : "0 16px",
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
