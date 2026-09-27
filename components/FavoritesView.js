"use client";

export default function FavoritesView({
  favorites,
  openRestaurant,
  toggleFavorite,
}) {
  return (
    <>
      <header className="header">
        <div className="logo">SMOKE MAP</div>

        <button
          className="menuButton"
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
               
