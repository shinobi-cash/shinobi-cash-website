/**
 * Section Divider Component
 * Displays a downward arrow in a circle, used between form sections
 */

export function SectionDivider() {
  return (
    <div className="flex justify-center my-1">
      <div className="bg-gray-900 border border-gray-700 rounded-full p-2">
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </div>
  );
}
