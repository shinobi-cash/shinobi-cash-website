/**
 * Section Divider Component
 * Displays a downward arrow in a circle, used between form sections
 */

export function SectionDivider() {
  return (
    <div className="my-1 flex justify-center">
      <div className="rounded-full border border-gray-700 bg-gray-900 p-2">
        <svg
          className="h-5 w-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </div>
    </div>
  );
}
