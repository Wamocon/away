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
      <button 
        onClick={onClose} 
        className="flex-1 py-3 px-4 rounded-xl bg-white/5 text-white/50 font-black text-[10px] uppercase tracking-widest border border-white/5 transition-all hover:bg-white/10 hover:text-white"
      >
        Abbrechen
      </button>
      <button 
        onClick={handleUpload}
        disabled={loading || !file}
        className="flex-[2] py-3 px-4 rounded-xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30"
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
      subtitle="XLSX, DOCX oder PDF verwalten"
      footer={footer || undefined}
    >
      <div className="space-y-6 py-2">
        {!success ? (
          <>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center py-12 rounded-[24px] border border-dashed transition-all cursor-pointer group ${
                file 
                  ? 'border-emerald-500/50 bg-emerald-500/5' 
                  : 'border-white/10 bg-white/5 hover:bg-white/[0.08] hover:border-indigo-500/50'
              }`}
            >
              <div className={`w-16 h-16 rounded-[20px] flex items-center justify-center mb-5 transition-all duration-500 ${
                file 
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                  : 'bg-white/5 text-white/30 group-hover:bg-indigo-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-indigo-500/20'
              }`}>
                {file ? <FileIcon size={32} /> : <FileSpreadsheet size={32} />}
              </div>
              <div className="text-center px-6">
                <p className="text-base font-bold text-white truncate max-w-[280px]">
                  {file ? file.name : 'Datei auswählen'}
                </p>
                <p className="text-[10px] uppercase font-black tracking-widest mt-1.5 opacity-40 text-white">
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Klicke zum Durchsuchen'}
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
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                <AlertCircle size={16} className="shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-widest">{error}</span>
              </div>
            )}
          </>
        ) : (
          <div className="py-12 text-center animate-in zoom-in-95 duration-700">
             <div className="w-24 h-24 rounded-[32px] bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-500/20 rotate-3">
                <CheckCircle2 size={48} />
             </div>
             <h3 className="text-2xl font-black text-white tracking-tight">Upload erfolgreich!</h3>
             <p className="text-[11px] uppercase font-black tracking-widest mt-2 opacity-40 text-white">Die Vorlage steht nun bereit</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
