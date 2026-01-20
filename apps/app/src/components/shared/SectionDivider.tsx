/**
 * Section Divider Component
 * Displays a downward arrow in a circle, used between form sections
 */

export function SectionDivider() {
  return (
    <div className="flex justify-center">
      <div className="border-border bg-background rounded-full border p-2">
        <svg
          className="text-muted-foreground h-5 w-5"
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
