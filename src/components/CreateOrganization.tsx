'use client';

import { useState } from 'react';
import { createOrganization } from '@/lib/organization';

export default function CreateOrganization({
  userId,
  onCreated,
}: {
  userId: string;
  onCreated: (org: { id: string; name: string }) => void;
}) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const newOrg = await createOrganization(userId, name.trim());
      onCreated(newOrg);
      setName('');
    } catch (err: any) {
      setError(err.message || 'Fehler beim Erstellen der Organisation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-700/50">
      <h3 className="text-sm font-semibold text-gray-300 mb-2">Neue Organisation anlegen</h3>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          placeholder="Name der Organisation"
          className="flex-1 bg-gray-950/50 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
          required
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
          disabled={loading || !name.trim()}
        >
          {loading ? 'Erstelle...' : 'Erstellen'}
        </button>
      </form>
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  );
}
