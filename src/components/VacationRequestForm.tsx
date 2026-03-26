"use client";
import { useState } from 'react';
import SendMailButton from './SendMailButton';
import CalendarInviteButton from './CalendarInviteButton';
import { createVacationRequest } from '@/lib/vacation';

export default function VacationRequestForm({ userId, organizationId, emailProvider, accessToken }: { userId: string, organizationId: string, emailProvider?: string, accessToken?: string }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canSendMail, setCanSendMail] = useState(false);
  const [canSendInvite, setCanSendInvite] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setCanSendMail(false);
    setCanSendInvite(false);
    try {
      await createVacationRequest({ userId, organizationId, from, to, reason });
      setSuccess(true);
      setCanSendMail(true);
      setCanSendInvite(true);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleSendMail = async () => {
    if (!emailProvider || !accessToken) throw new Error('Kein E-Mail-Provider verbunden!');
    const res = await fetch('/api/send-vacation-mail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: emailProvider,
        to: '', // Zieladresse ggf. aus Settings/Organisation
        subject: 'Urlaubsantrag',
        text: `Urlaubsantrag von ${from} bis ${to}: ${reason}`,
        accessToken,
      }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
  };

  const handleSendInvite = async () => {
    if (!accessToken) throw new Error('Kein Outlook-Token verbunden!');
    // Team-Emails und weitere Infos müssten aus DB/Settings kommen
    const res = await fetch('/api/send-outlook-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessToken,
        subject: 'Urlaubsabwesenheit',
        start: from,
        end: to,
        attendees: [], // Team-Emails hier einfügen
        body: `Urlaubsantrag von ${from} bis ${to}: ${reason}`,
      }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 shadow rounded-xl px-8 pt-6 pb-8 mb-4 w-full max-w-md flex flex-col gap-2">
      <h2 className="text-2xl font-bold mb-4 text-gray-100">Urlaubsantrag stellen</h2>
      <label className="block mb-1 text-gray-300">Von</label>
      <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="mb-2 w-full border border-gray-700 rounded-lg px-3 py-2 bg-gray-950 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600" required />
      <label className="block mb-1 text-gray-300">Bis</label>
      <input type="date" value={to} onChange={e => setTo(e.target.value)} className="mb-2 w-full border border-gray-700 rounded-lg px-3 py-2 bg-gray-950 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600" required />
      <label className="block mb-1 text-gray-300">Grund</label>
      <input type="text" value={reason} onChange={e => setReason(e.target.value)} className="mb-2 w-full border border-gray-700 rounded-lg px-3 py-2 bg-gray-950 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600" required />
      {error && <div className="text-red-500 mb-2 text-sm">{error}</div>}
      {success && <div className="text-green-500 mb-2 text-sm">Antrag erfolgreich eingereicht!</div>}
      <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold transition">Absenden</button>
      <SendMailButton disabled={!canSendMail} onSend={handleSendMail} />
      <CalendarInviteButton disabled={!canSendInvite} onSend={handleSendInvite} />
    </form>
  );
}
