// Loading components

// ── Spinner nhỏ dùng trong button ──
export function Spinner({ size = 16, color = "currentColor" }) {
  return (
    <svg
      className="ld-spinner"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

// ── Skeleton dòng text ──
export function SkeletonLine({ width = "100%", height = 12 }) {
  return (
    <div
      className="ld-skeleton-line"
      style={{ width, height, borderRadius: height / 2 }}
    />
  );
}

// ── Skeleton row cho table ──
export function SkeletonTableRows({ rows = 5, cols = 5 }) {
  return (
    <>
      {[...Array(rows)].map((_, i) => (
        <tr key={i} className="ld-skeleton-row">
          {[...Array(cols)].map((_, j) => (
            <td key={j}>
              <div className="ld-skeleton-line" style={{ width: j === 0 ? "40px" : `${60 + Math.random() * 30}%`, height: 12 }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ── Skeleton card grid ──
export function SkeletonCards({ count = 6, aspectRatio = "4/3" }) {
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <div key={i} className="ld-skeleton-card">
          <div className="ld-skeleton-img" style={{ aspectRatio }} />
          <div className="ld-skeleton-body">
            <SkeletonLine width="70%" />
            <SkeletonLine width="50%" />
            <SkeletonLine width="40%" />
          </div>
        </div>
      ))}
    </>
  );
}

// ── Skeleton list rows (dùng cho UserList, RoleList...) ──
export function SkeletonListRows({ rows = 5 }) {
  return (
    <div className="ld-skeleton-list">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="ld-skeleton-list-row">
          <div className="ld-skeleton-avatar" />
          <div className="ld-skeleton-list-body">
            <SkeletonLine width="40%" height={13} />
            <SkeletonLine width="60%" height={11} />
          </div>
          <SkeletonLine width="80px" height={28} />
        </div>
      ))}
    </div>
  );
}

// ── Full page loading overlay ──
export function PageLoader() {
  return (
    <div className="ld-page-loader">
      <div className="ld-page-loader-inner">
        <div className="ld-pulse" />
        <span>Đang tải...</span>
      </div>
    </div>
  );
}

// ── Inline loading (thay thế text "Loading...") ──
export function InlineLoader({ text = "Đang tải..." }) {
  return (
    <div className="ld-inline">
      <Spinner size={18} />
      <span>{text}</span>
    </div>
  );
}
