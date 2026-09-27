"use client";

export default function MyPageView({
  favoritesCount,
  historyCount,
  onOpenFavorites,
  onOpenHistory,
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
          保存したお店や閲覧履歴を
          <br />
          まとめて確認できます。
        </p>
      </section>

      <section className="filterSection">
        <p className="filterTitle">あなたのデータ</p>

        <div className="filterGrid">
          <button
            className="filterCard"
            onClick={onOpenFavorites}
          >
            <span className="filterIcon">♡</span>

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
            <span className="filterIcon">☷</span>

            <span>
              閲覧履歴
              <br />
              {historyCount}件
            </span>
          </button>
        </div>
      </section>

      <section className="filterSection">
        <p className="filterTitle">アカウント</p>

        <div className="trustBox">
          <div>
            <strong>ログイン機能は準備中</strong>

            <p>
              今後、アカウントを作成すると、
              お気に入りや履歴を端末間で同期できるようにします。
            </p>
          </div>
        </div>
      </section>

      <section className="filterSection">
        <p className="filterTitle">SMOKE MAP</p>

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
