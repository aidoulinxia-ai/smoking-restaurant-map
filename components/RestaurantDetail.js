"use client";

export default function RestaurantDetail({
  restaurant,
  isFavorite,
  onToggleFavorite,
  onClose,
  mapUrl,
  directionsUrl,
  smokingStatus,
  statusLoading,
  formatTimeAgo,
  latestReportText,
  smokingTypeText,
  reportResult,
  reportLoading,
  reportError,
  onSubmitSmokingReport,
}) {
  return (
    <>
      <header className="header">
        <div className="logo">SMOKE MAP</div>

        <button
          className="menuButton"
          onClick={onClose}
          aria-label="戻る"
        >
          ←
        </button>
      </header>

      <section className="hero">
        <div className="location">
          <span>🚬</span>
          <span>{smokingTypeText(restaurant)}</span>
        </div>

        <h1>{restaurant.name}</h1>

        <p className="description">
          {restaurant.genre || "ジャンル情報なし"}
        </p>

        <button
          onClick={() => onToggleFavorite(restaurant)}
          style={{
            minHeight: "48px",
            padding: "0 18px",
            border: isFavorite
              ? "1px solid #151515"
              : "1px solid #dddddd",
            borderRadius: "14px",
            background: isFavorite
              ? "#151515"
              : "#ffffff",
            color: isFavorite
              ? "#ffffff"
              : "#151515",
            fontWeight: "800",
          }}
        >
          {isFavorite
            ? "♥ お気に入り済み"
            : "♡ お気に入りに追加"}
        </button>
      </section>

      <section className="filterSection">
        {restaurant.googleRating !== null &&
          restaurant.googleRating !== undefined && (
            <div className="trustBox">
              <div>
                <strong>⭐ Google評価</strong>

                <p>
                  ⭐{" "}
                  {Number(
                    restaurant.googleRating
                  ).toFixed(1)}
                  {" ・ "}
                  {restaurant.googleUserRatingCount || 0}
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
              {restaurant.smoking || "喫煙情報なし"}
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
              boxShadow:
                "0 8px 24px rgba(0,0,0,0.08)",
            }}
          >
            <iframe
              title={`${restaurant.name}のGoogleマップ`}
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
                📍 {restaurant.name}
              </strong>

              <p
                style={{
                  margin: "0 0 14px",
                  color: "#737373",
                  fontSize: "12px",
                  lineHeight: "1.6",
                }}
              >
                {restaurant.address || "住所情報なし"}
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
            <p>{restaurant.open || "情報なし"}</p>
          </div>
        </div>

        <div className="trustBox">
          <div>
            <strong>予算</strong>
            <p>{restaurant.budget || "情報なし"}</p>
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
                  onSubmitSmokingReport("paper_ok")
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
                  onSubmitSmokingReport("heated_only")
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
                  onSubmitSmokingReport("not_allowed")
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

        {restaurant.urls && (
          <a
            className="searchButton"
            href={restaurant.urls}
            target="_blank"
            rel="noopener noreferrer"
          >
            予約・店舗情報を見る
          </a>
        )}
      </section>
    </>
  );
}
