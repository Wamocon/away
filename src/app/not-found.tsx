import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6">
      <div className="text-7xl font-bold text-blue-600">404</div>
      <div
        className="text-2xl font-semibold"
        style={{ color: "var(--text-base)" }}
      >
        Seite nicht gefunden
      </div>
      <div className="mb-4" style={{ color: "var(--text-muted)" }}>
        Die gewünschte Seite existiert nicht oder wurde verschoben.
      </div>
      <Link
        href="/"
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
      >
        Zurück zum Dashboard
      </Link>
    </div>
  );
}
