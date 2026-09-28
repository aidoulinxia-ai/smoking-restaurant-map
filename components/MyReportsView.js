"use client";

export default function MyReportsView({
  reports,
  loading,
  error,
  onBack,
  formatTimeAgo,
}) {
  function reportText(status) {
    if (status === "paper_ok") {
      return "🚬 紙巻き吸えた";
    }

    if (status === "heated_only") {
      return "🔥 加熱式だけ吸えた";
    }

    if (status === "not_allowed") {
      return "🚭 吸えなかった";
    }

    return "報告";
  }

  return (
    <>
      <header className="header">
        <div className="logo">SMOKE MAP</div>

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
          <span>💬</span>
          <span>MY REPORTS</span>
        </div>

        <h1>自分の喫煙報告</h1>

        <p className="description">
          あなたが投稿した喫煙状況を確認できます。
        </p>
      </section>

      <section className="filterSection">
        {loading ? (
          <div className="trustBox">
            <div>
              <strong>報告履歴を読み込み中...</strong>
            </div>
          </div>
        ) : error ? (
          <div className="trustBox">
            <div>
              <strong>取得できませんでした</strong>

              <p>{error}</p>
            </div>
          </div>
        ) : reports.length === 0 ? (
          <div className="trustBox">
            <div>
              <strong>
                まだ喫煙報告はありません
              </strong>

              <p>
                お店を利用したら、最新の喫煙状況を
                みんなに共有してみてください。
              </p>
            </div>
          </div>
        ) : (
          <>
            <p className="filterTitle">
              報告履歴 {reports.length}件
            </p>

            <div
              style={{
                display: "grid",
                gap: "12px",
              }}
            >
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="trustBox"
                  style={{
                    margin: 0,
                  }}
                >
                  <div>
                    <strong>
                      {report.restaurant_name}
                    </strong>

                    <p>
                      {reportText(
                        report.smoking_status
                      )}
                      <br />
                      {formatTimeAgo(
                        report.created_at
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}
