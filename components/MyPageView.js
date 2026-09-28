"use client";

import AuthView from "./AuthView";

export default function MyPageView({
  favoritesCount,
  historyCount,
  onOpenFavorites,
  onOpenHistory,
  onOpenMyReports,
  authLoading,
  currentUser,
  onAuthSuccess,
  onLogout,
}) {
  return (
    <>
      <header className="header">
        <div className="logo">SMOKE MAP</div>
      </header>

      <section className="hero">
        <div className="location">
          <span>○</span>
          <span>MY PAGE</span>
        </div>

        <h1>マイページ</h1>

        <p className="description">
          {currentUser
            ? `${currentUser.nickname || "ユーザー"}さんのSMOKE MAP`
            : "お気に入りや履歴をまとめて確認できます。"}
        </p>
      </section>

      <section className="filterSection">
        <p className="filterTitle">
          あなたのデータ
        </p>

        <div className="filterGrid">
          <button
            className="filterCard"
            onClick={onOpenFavorites}
          >
            <span className="filterIcon">
              ♡
            </span>

            <span>
              お気に入り
              <br />
              {favoritesCount}件
            </span>
          </button>

          <button
            className="filterCard"
            onClick={onOpenHistory}
          >
            <span className="filterIcon">
              ☷
            </span>

            <span>
              閲覧履歴
              <br />
              {historyCount}件
            </span>
          </button>

          {currentUser && (
            <button
              className="filterCard"
              onClick={onOpenMyReports}
            >
              <span className="filterIcon">
                💬
              </span>

              <span>
                自分の
                <br />
                喫煙報告
              </span>
            </button>
          )}
        </div>
      </section>

      {authLoading ? (
        <section className="filterSection">
          <div className="trustBox">
            <div>
              <strong>
                ログイン情報を確認中...
              </strong>
            </div>
          </div>
        </section>
      ) : currentUser ? (
        <section className="filterSection">
          <p className="filterTitle">
            アカウント
          </p>

          <div
            className="trustBox"
            style={{
              marginLeft: 0,
              marginRight: 0,
            }}
          >
            <div>
              <strong>
                {currentUser.nickname ||
                  "ユーザー"}
              </strong>

              <p>
                {currentUser.email || ""}
                <br />
                ログイン中
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            style={{
              width: "100%",
              minHeight: "52px",
              border:
                "1px solid #dddddd",
              borderRadius: "14px",
              background: "#ffffff",
              color: "#151515",
              fontWeight: "800",
            }}
          >
            ログアウト
          </button>
        </section>
      ) : (
        <AuthView
          onAuthSuccess={onAuthSuccess}
        />
      )}

      <section className="filterSection">
        <p className="filterTitle">
          SMOKE MAP
        </p>

        <div className="trustBox">
          <div>
            <strong>Premium</strong>

            <p>
              より便利な検索機能などを追加予定です。
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
