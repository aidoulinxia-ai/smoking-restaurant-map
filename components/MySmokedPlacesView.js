"use client";

export default function MySmokedPlacesView({
  places,
  loading,
  error,
  mapUrl,
  onBack,
  onOpenRestaurant,
  formatTimeAgo,
}) {
  function smokingText(status) {
    if (status === "paper_ok") {
      return "🚬 紙巻き吸えた";
    }

    if (status === "heated_only") {
      return "🔥 加熱式だけ吸えた";
    }

    return "吸えた";
  }

  return (
    <>
      <header className="header">
        <div className="logo">
          SMOKE MAP
        </div>

        <button
          className="menuButton"
          onClick={onBack}
          aria-label="戻る"
        >
          ←
        </button>
      </header>

      <section className="hero">
        <div className="location">
          <span>📍</span>
          <span>MY SMOKE MAP</span>
        </div>

        <h1>吸えた店MAP</h1>

        <p className="description">
          自分が実際に「吸えた」と報告したお店です。
        </p>
      </section>

      <section className="filterSection">
        {loading ? (
          <div className="trustBox">
            <div>
              <strong>
                吸えた店を読み込み中...
              </strong>
            </div>
          </div>
        ) : error ? (
          <div className="trustBox">
            <div>
              <strong>
                取得できませんでした
              </strong>

              <p>{error}</p>
            </div>
          </div>
        ) : places.length === 0 ? (
          <div className="trustBox">
            <div>
              <strong>
                まだ吸えた店がありません
              </strong>

              <p>
                お店で喫煙できたら、
                喫煙状況を報告してみてください。
              </p>
            </div>
          </div>
        ) : (
          <>
            <p className="filterTitle">
              吸えた店 {places.length}件
            </p>

            {mapUrl && (
              <div
                style={{
                  width: "100%",
                  height: "320px",
                  overflow: "hidden",
                  borderRadius: "16px",
                  marginBottom: "20px",
                }}
              >
                <iframe
                  title="吸えた店MAP"
                  src={mapUrl}
                  style={{
                    width: "100%",
                    height: "100%",
                    border: 0,
                  }}
                  loading="lazy"
                />
              </div>
            )}

            <div
              style={{
                display: "grid",
                gap: "12px",
              }}
            >
              {places.map((place) => (
                <button
                  key={place.restaurantId}
                  type="button"
                  onClick={() =>
                    onOpenRestaurant(place)
                  }
                  className="trustBox"
                  style={{
                    margin: 0,
                    width: "100%",
                    textAlign: "left",
                    border: 0,
                    cursor: "pointer",
                  }}
                >
                  <div>
                    <strong>
                      {place.restaurantName}
                    </strong>

                    <p>
                      {smokingText(
                        place.smokingStatus
                      )}
                      <br />
                      {formatTimeAgo(
                        place.reportedAt
                      )}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}
