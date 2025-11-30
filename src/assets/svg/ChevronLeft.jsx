export default function ChevronLeft({ className = "" }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      preserveAspectRatio="none"
    >
      {/* 첫 번째 화살표 */}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M18 18l-6-6 6-6"
      />
      {/* 두 번째 화살표 (간격 띄움) */}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 18l-6-6 6-6"
      />
    </svg>
  );
}
