"use client";

export default function BottomNav({
  activeMode,
  onSearch,
  onFavorites,
  onHistory,
  onMyPage,
}) {
  return (
    <nav className="bottomNav">
      <button
        className={activeMode === "search" ? "navActive" : ""}
        onClick={onSearch}
      >
        <span>⌖</span>
        <small>探す</small>
      </button>

      <button
        className={activeMode === "favorites" ? "navActive" : ""}
        onClick={onFavorites}
      >
        <span>♡</span>
        <small>お気に入り</small>
      </button>

      <button
        className={activeMode === "history" ? "navActive" : ""}
        onClick={onHistory}
      >
        <span>☷</span>
        <small>履歴</small>
      </button>

      <button
        className={activeMode === "mypage" ? "navActive" : ""}
        onClick={onMyPage}
      >
        <span>○</span>
        <small>マイページ</small>
      </button>
    </nav>
  );
}
