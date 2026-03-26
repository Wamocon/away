import { useState } from 'react';

export default function EmailConnect({ onConnect }: { onConnect: (provider: string) => void }) {
  const [provider, setProvider] = useState('');

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (provider) onConnect(provider);
  };

  return (
    <form onSubmit={handleConnect} className="bg-white shadow rounded px-8 pt-6 pb-8 mb-4 w-full max-w-md">
      <h2 className="text-xl font-bold mb-4">E-Mail-Postfach verbinden</h2>
      <label className="block mb-1">Provider wählen</label>
      <select value={provider} onChange={e => setProvider(e.target.value)} className="mb-4 w-full border rounded px-2 py-1" required>
        <option value="">Bitte wählen…</option>
        <option value="google">Google (Gmail)</option>
        <option value="microsoft">Microsoft (Outlook/365)</option>
      </select>
      <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-semibold" disabled={!provider}>Verbinden</button>
    </form>
  );
}
