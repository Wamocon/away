import { useState } from "react";

export default function EmailConnect({
  onConnect,
}: {
  onConnect: (provider: string) => void;
}) {
  const [provider, setProvider] = useState("");

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (provider) onConnect(provider);
  };

  return (
    <form
      onSubmit={handleConnect}
      className="bg-gray-900 border border-gray-800 shadow rounded-xl px-8 pt-6 pb-8 mb-4 w-full flex flex-col gap-2"
    >
      <h2 className="text-2xl font-bold mb-4 text-gray-100">
        E-Mail-Postfach verbinden
      </h2>
      <label className="block mb-1 text-gray-300">Provider wählen</label>
      <select
        value={provider}
        onChange={(e) => setProvider(e.target.value)}
        className="mb-4 w-full border border-gray-700 rounded-lg px-3 py-2 bg-gray-950 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
        required
      >
        <option value="">Bitte wählen…</option>
        <option value="google">Google (Gmail)</option>
        <option value="microsoft">Microsoft (Outlook/365)</option>
      </select>
      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition"
        disabled={!provider}
      >
        Verbinden
      </button>
    </form>
  );
}
