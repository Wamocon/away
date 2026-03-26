"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6">
      <div className="text-7xl font-bold text-red-600">Fehler</div>
      <div className="text-2xl font-semibold text-gray-100">Ein unerwarteter Fehler ist aufgetreten</div>
      <div className="text-gray-400 mb-4">{error.message}</div>
      <button onClick={reset} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition">Seite neu laden</button>
    </div>
  );
}
