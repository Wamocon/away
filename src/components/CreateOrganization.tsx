'use client';
import { useState } from 'react';
import { createOrganization } from '@/lib/organization';
import Modal from './ui/Modal';
import { Plus, Building2, Loader } from 'lucide-react';

export default function CreateOrganization({
  userId,
  onCreated,
  isOpen,
  onClose
}: {
  userId: string;
  onCreated: (org: { id: string; name: string }) => void;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const newOrg = await createOrganization(userId, name.trim());
      onCreated(newOrg);
      setName('');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen der Organisation');
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <div className="flex gap-3">
      <button 
        onClick={onClose} 
        className="flex-1 py-3 px-4 rounded-xl bg-white/5 text-white/50 font-black text-[10px] uppercase tracking-widest border border-white/5 transition-all hover:bg-white/10 hover:text-white"
      >
        Abbrechen
      </button>
      <button 
        onClick={() => handleSubmit()}
        disabled={loading || !name.trim()}
        className="flex-[2] py-3 px-4 rounded-xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30"
      >
        {loading ? <Loader size={14} className="animate-spin" /> : <Plus size={14} />}
        Organisation erstellen
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Organisation anlegen"
      subtitle="Neues Team oder Unternehmen"
      footer={footer}
    >
      <div className="space-y-6 py-2">
        <div className="flex flex-col items-center justify-center py-4 opacity-40">
           <Building2 size={48} className="text-indigo-400 mb-2" />
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-center text-white">Unternehmensprofil</p>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-1 text-white">Name der Organisation *</label>
          <input
            type="text"
            placeholder="z.B. Acme Corp GmbH"
            className="w-full px-4 py-3.5 rounded-xl border border-white/10 bg-white/5 outline-none text-sm font-bold text-white placeholder:text-white/20 focus:border-indigo-500/50 focus:bg-white/[0.08] transition-all"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            autoFocus
          />
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-top-1">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
