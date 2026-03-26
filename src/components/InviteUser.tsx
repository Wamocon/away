'use client';

import { useState } from 'react';
import { MailPlus, Check, Copy } from 'lucide-react';

export default function InviteUser({ organizationId }: { organizationId: string }) {
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // In a real application, you would create a secure token in Supabase
  // and store it in an `invitations` table with an expiration date.
  const handleGenerateLink = () => {
    // Generates a mock invite link for demonstration
    const baseUrl = window.location.origin;
    const token = Math.random().toString(36).substring(2, 15);
    setInviteLink(`${baseUrl}/invite?org=${organizationId}&token=${token}`);
    setCopied(false);
  };

  const handleCopy = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-700/50">
      <h3 className="text-sm font-semibold flex items-center gap-1.5 text-blue-400 mb-3">
        <MailPlus size={16} /> Kollege einladen
      </h3>
      
      {!inviteLink ? (
        <button
          onClick={handleGenerateLink}
          className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 py-1.5 px-3 rounded border border-gray-700 transition"
        >
          Einladungslink generieren
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={inviteLink}
              className="flex-1 bg-gray-950/50 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-400 focus:outline-none"
            />
            <button
              onClick={handleCopy}
              className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-lg transition"
              title="Kopieren"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
          {copied && <p className="text-xs text-green-500">Link kopiert!</p>}
          <button 
            onClick={() => setInviteLink(null)}
            className="text-xs text-gray-500 hover:text-gray-400 self-start"
          >
            Neuen Link erstellen
          </button>
        </div>
      )}
    </div>
  );
}
