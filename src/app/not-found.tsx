export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6">
      <div className="text-7xl font-bold text-blue-600">404</div>
      <div className="text-2xl font-semibold text-gray-100">Seite nicht gefunden</div>
      <div className="text-gray-400 mb-4">Die gewünschte Seite existiert nicht oder wurde verschoben.</div>
      <a href="/" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition">Zurück zum Dashboard</a>
    </div>
  );
}
