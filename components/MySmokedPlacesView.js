"use client";

import { useMemo, useState } from "react";

export default function MySmokedPlacesView({
  places,
  loading,
  error,
  onBack,
  onOpenRestaurant,
  formatTimeAgo,
}) {
  const [openArea, setOpenArea] = useState(null);

  function smokingText(status) {
    if (status === "paper_ok") {
      return "🚬 紙巻き吸えた";
    }

    if (status === "heated_only") {
      return "🔥 加熱式だけ吸えた";
    }

    return "吸えた";
  }

  function getAreaName(address) {
    if (!address) {
      return "その他";
    }

    const normalized = String(address)
      .replace(/^日本、?/, "")
      .trim();

    const tokyoMatch = normalized.match(
      /東京都([^市区町村]+[区市])/
    );

    if (tokyoMatch) {
      return tokyoMatch[1];
    }

    const designatedCityMatch =
      normalized.match(
        /(?:道|府|県)([^市]+市)([^区]+区)/
      );

    if (designatedCityMatch) {
      return `${designatedCityMatch[1]}${designatedCityMatch[2]}`;
    }

    const municipalityMatch =
      normalized.match(
        /(?:都|道|府|県)([^郡]+?[市区町村])/
      );

    if (municipalityMatch) {
      return municipalityMatch[1];
    }

    return "その他";
  }

  const groupedPlaces = useMemo(() => {
    const groups = {};

    places.forEach((place) => {
      const area = getAreaName(
        place.address
      );

      if (!groups[area]) {
        groups[area] = [];
      }

      groups[area].push(place);
    });

    return Object.entries(groups).sort(
      (a, b) =>
        b[1].length - a[1].length
    );
  }, [places]);

  function toggleArea(area) {
    setOpenArea((current) =>
      current === area ? null : area
    );
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
          <span>MY SMOKE LIST</span>
        </div>

        <h1>自分が吸えた店</h1>

        <p className="description">
          実際に「吸えた」と報告したお店を
          地域ごとに確認できます。
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

            <div
              style={{
                display: "grid",
                gap: "12px",
              }}
            >
              {groupedPlaces.map(
                ([area, areaPlaces]) => (
                  <div
                    key={area}
                    className="trustBox"
                    style={{
                      margin: 0,
                      display: "block",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        toggleArea(area)
                      }
                      style={{
                        width: "100%",
                        border: 0,
                        padding: 0,
                        background:
                          "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent:
                          "space-between",
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      <strong>
                        {area}
                      </strong>

                      <span>
                        {areaPlaces.length}件{" "}
                        {openArea === area
                          ? "▲"
                          : "▼"}
                      </span>
                    </button>

                    {openArea === area && (
                      <div
                        style={{
                          display: "grid",
                          gap: "10px",
                          marginTop: "14px",
                        }}
                      >
                        {areaPlaces.map(
                          (place) => (
                            <button
                              key={
                                place.restaurantId
                              }
                              type="button"
                              onClick={() =>
                                onOpenRestaurant(
                                  place
                                )
                              }
                              style={{
                                width:
                                  "100%",
                                border:
                                  "1px solid #e5e5e5",
                                borderRadius:
                                  "12px",
                                background:
                                  "#ffffff",
                                padding:
                                  "14px",
                                textAlign:
                                  "left",
                                cursor:
                                  "pointer",
                              }}
                            >
                              <strong>
                                {
                                  place.restaurantName
                                }
                              </strong>

                              <div
                                style={{
                                  marginTop:
                                    "6px",
                                }}
                              >
                                {smokingText(
                                  place.smokingStatus
                                )}
                              </div>

                              {place.address && (
                                <div
                                  style={{
                                    marginTop:
                                      "4px",
                                    fontSize:
                                      "13px",
                                  }}
                                >
                                  {
                                    place.address
                                  }
                                </div>
                              )}

                              <div
                                style={{
                                  marginTop:
                                    "4px",
                                  fontSize:
                                    "13px",
                                }}
                              >
                                {formatTimeAgo(
                                  place.reportedAt
                                )}
                              </div>
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </>
        )}
      </section>
    </>
  );
}
