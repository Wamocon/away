import { useState } from 'react';

export default function SendMailButton({ disabled, onSend }: { disabled: boolean, onSend: () => Promise<void> }) {
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    setSending(true);
    setError(null);
    setSuccess(false);
    try {
      await onSend();
      setSuccess(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-4">
      <button
        type="button"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
        onClick={handleSend}
        disabled={disabled || sending}
      >
        {sending ? 'Sende...' : 'Urlaubsantrag per Mail senden'}
      </button>
      {success && <div className="text-green-500 mt-2 text-sm">E-Mail erfolgreich gesendet!</div>}
      {error && <div className="text-red-500 mt-2 text-sm">{error}</div>}
    </div>
  );
}
