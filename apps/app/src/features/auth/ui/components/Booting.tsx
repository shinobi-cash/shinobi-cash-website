/**
 * Booting Screen
 * Shown during auth system initialization
 */

export function Booting() {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-orange-500" />
      <h2 className="text-lg font-semibold text-white">Loading...</h2>
    </div>
  );
}
