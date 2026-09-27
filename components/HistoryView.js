"use client";

export default function HistoryView({
  history,
  onOpenRestaurant,
  onClearHistory,
  formatTimeAgo,
}) {
  return (
    <>
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
                style={{ margin: 0 }}
              >
                最近見たお店（{history.length}件）
              </p>

              <button
                onClick={onClearHistory}
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
    </>
  );
}
