'use client';
import { useState, useRef } from 'react';
import { uploadTemplate } from '@/lib/template';
import Modal from './ui/Modal';
import { Upload, FileSpreadsheet, Loader, CheckCircle2, AlertCircle, FileIcon } from 'lucide-react';

interface TemplateUploadProps {
  organizationId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function TemplateUpload({ organizationId, isOpen, onClose, onSuccess }: TemplateUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    if (selectedFile) {
        const ext = selectedFile.name.split('.').pop()?.toLowerCase();
        if (!['xlsx', 'xls', 'docx', 'pdf'].includes(ext || '')) {
            setError('Unterstützte Formate: XLSX, DOCX, PDF');
            setFile(null);
            return;
        }
    }
    setFile(selectedFile);
    setSuccess(false);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await uploadTemplate(organizationId, file);
      setSuccess(true);
      setFile(null);
      if (onSuccess) onSuccess();
      // Optional: Delay close on success
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError((err as Error).message || 'Fehler beim Hochladen der Vorlage');
    } finally {
      setLoading(false);
    }
  };

  const footer = !success && (
    <div className="flex gap-3">
      <button onClick={onClose} className="flex-1 py-3 px-4 rounded-xl bg-[var(--bg-elevated)] text-[var(--text-base)] font-black text-[10px] uppercase tracking-widest border-2 border-[var(--border)] transition-all hover:bg-[var(--bg-surface)]">
        Abbrechen
      </button>
      <button 
        onClick={handleUpload}
        disabled={loading || !file}
        className="flex-[2] py-3 px-4 rounded-xl bg-[var(--primary)] text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
      >
        {loading ? <Loader size={14} className="animate-spin" /> : <Upload size={14} />}
        Vorlage hochladen
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Dokumentenvorlage"
      subtitle="Excel- oder Word-Vorlagen für Anträge verwalten"
      footer={footer || undefined}
    >
      <div className="space-y-6 py-2">
        {!success ? (
          <>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center py-10 rounded-2xl border-2 border-dashed transition-all cursor-pointer bg-[var(--bg-elevated)] hover:bg-[var(--primary-light)] ${
                file ? 'border-[var(--success)] bg-[var(--success-light)]' : 'border-[var(--border)] hover:border-[var(--primary)]'
              }`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-sm ${
                file ? 'bg-[var(--success)] text-white' : 'bg-gray-500/10 text-[var(--text-muted)]'
              }`}>
                {file ? <FileIcon size={28} /> : <FileSpreadsheet size={28} />}
              </div>
              <div className="text-center px-4">
                <p className="text-sm font-black text-[var(--text-base)] truncate max-w-[240px]">
                  {file ? file.name : 'Datei auswählen'}
                </p>
                <p className="text-[10px] uppercase font-black tracking-widest mt-1 opacity-50 text-[var(--text-muted)]">
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : 'XLSX, DOCX oder PDF'}
                </p>
              </div>
              <input 
                type="file" 
                ref={fileInputRef}
                accept=".xlsx,.xls,.docx,.pdf" 
                onChange={handleFileChange} 
                className="hidden" 
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-2 animate-in fade-in">
                <AlertCircle size={14} className="shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-widest">{error}</span>
              </div>
            )}
          </>
        ) : (
          <div className="py-10 text-center animate-in zoom-in-95 duration-500">
             <div className="w-20 h-20 rounded-[24px] bg-emerald-500 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-emerald-500/20">
                <CheckCircle2 size={40} className="text-white" />
             </div>
             <h3 className="text-xl font-black text-[var(--text-base)] tracking-tight">Upload erfolgreich!</h3>
             <p className="text-[10px] uppercase font-black tracking-widest mt-2 opacity-50 text-[var(--text-muted)]">Die Vorlage steht nun bereit</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
