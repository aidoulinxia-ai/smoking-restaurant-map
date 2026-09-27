"use client";

export default function FavoritesView({
  favorites,
  onOpenRestaurant,
  onToggleFavorite,
}) {
  return (
    <>
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
                  onClick={() => onOpenRestaurant(restaurant)}
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
                  onClick={() => onToggleFavorite(restaurant)}
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
    </>
  );
}
