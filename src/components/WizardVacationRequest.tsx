'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  X, ChevronRight, ChevronLeft, Upload, FileText, Calendar,
  CheckCircle, Loader, Mail, AlertCircle, Download, Eye, File as FileIcon
} from 'lucide-react';
import { generatePDF, generateExcel, generateWord, DocumentData } from '@/lib/documentGenerator';

interface WizardProps {
  userId: string;
  orgId: string;
  userEmail: string;
  orgName: string;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 1 | 2 | 3 | 4;

interface Template {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'xlsx';
  storage_path: string;
}

export default function WizardVacationRequest({ userId, orgId, userEmail, orgName, onClose, onSuccess }: WizardProps) {
  const [step, setStep] = useState<Step>(1);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');
  const [deputy, setDeputy] = useState('');
  const [notes, setNotes] = useState('');
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [sendMail, setSendMail] = useState(false);
  const [approverEmail, setApproverEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('document_templates')
      .select('*')
      .eq('organization_id', orgId)
      .then(({ data }) => setTemplates((data as Template[]) || []));
  }, [orgId]);

  const stepLabels = ['Vorlage', 'Details', 'Überprüfen', 'Fertig'];

  const handleFileUpload = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'docx', 'xlsx'].includes(ext || '')) {
      setError('Nur PDF, DOCX und XLSX werden unterstützt');
      return;
    }
    setUploadedFile(file);
    setError('');
    const newTemplate: Template = {
      id: 'custom-' + Date.now(),
      name: file.name.replace(`.${ext}`, ''),
      type: ext as any,
      storage_path: '',
    };
    setSelectedTemplate(newTemplate);
  };

  const generateDocumentBlob = async (): Promise<{ blob: Blob; ext: string } | null> => {
    try {
      setGenerating(true);
      let bytes: ArrayBuffer | undefined = undefined;
      let type: 'pdf' | 'docx' | 'xlsx' = 'pdf';

      if (uploadedFile) {
        bytes = await uploadedFile.arrayBuffer();
        type = uploadedFile.name.split('.').pop()?.toLowerCase() as any;
      } else if (selectedTemplate?.storage_path) {
        const supabase = createClient();
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('templates')
          .download(selectedTemplate.storage_path);
        if (downloadError) throw downloadError;
        bytes = await fileData.arrayBuffer();
        type = selectedTemplate.type;
      }

      const docData: DocumentData = {
        from, to, reason, deputy, notes,
        userEmail, orgName,
        date: new Date().toLocaleDateString('de-DE'),
        customFields
      };

      let blob: Blob;
      if (type === 'xlsx') {
        blob = await generateExcel(docData, bytes);
      } else if (type === 'docx') {
        blob = await generateWord(docData, bytes!);
      } else {
        blob = await generatePDF(docData, bytes);
      }

      return { blob, ext: type };
    } catch (err) {
      console.error('Document generation error:', err);
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!from || !to) { setError('Bitte Von- und Bis-Datum angeben'); return; }
    setError('');
    setSubmitting(true);

    try {
      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .from('vacation_requests')
        .insert([{
          user_id: userId,
          organization_id: orgId,
          from, to, reason,
          status: 'pending',
          template_fields: { deputy, notes, ...customFields },
        }])
        .select('id')
        .single();

      if (insertError) throw insertError;
      setRequestId(data.id);

      // Generate document and upload if it's PDF
      const result = await generateDocumentBlob();
      if (result && result.ext === 'pdf') {
        const fileName = `vacation-${data.id}.pdf`;
        await supabase.storage
          .from('vacation-documents')
          .upload(fileName, result.blob, { contentType: 'application/pdf', upsert: true })
          .catch(() => {});
      }

      if (sendMail && approverEmail) {
        const appUrl = window.location.origin;
        await supabase.functions.invoke('send-vacation-mail', {
          body: {
            to: approverEmail,
            from: userEmail,
            subject: `Urlaubsantrag – ${from} bis ${to}`,
            requestId: data.id,
            appUrl,
            fromDate: from,
            toDate: to,
            reason,
          },
        }).catch(() => {});
      }

      setSuccess(true);
      setStep(4);
    } catch (err) {
      setError((err as Error).message || 'Fehler beim Einreichen');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async () => {
    const result = await generateDocumentBlob();
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Urlaubsantrag_${from}_${to}.${result.ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg card p-6 animate-fade-in" style={{ zIndex: 51, maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-base)' }}>Neuer Urlaubsantrag</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Schritt {step} von 4</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center mb-6">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1">
                <div className={`wizard-step-dot text-[11px] ${
                  step === i + 1 ? 'active' :
                  step > i + 1 ? 'done' : 'inactive'
                }`}>
                  {step > i + 1 ? '✓' : i + 1}
                </div>
                <span className="text-[9px] font-semibold whitespace-nowrap" style={{ color: step >= i + 1 ? 'var(--text-base)' : 'var(--text-subtle)' }}>
                  {label}
                </span>
              </div>
              {i < 3 && (
                <div className={`flex-1 h-px mx-1 mt-[-14px] ${step > i + 1 ? 'bg-[var(--success)]' : 'bg-[var(--border)]'}`} />
              )}
            </div>
          ))}
        </div>

        {/* ── Step 1: Template wählen ── */}
        {step === 1 && (
          <div className="space-y-4">
            {templates.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Gespeicherte Vorlagen</p>
                <div className="grid grid-cols-1 gap-2">
                  {templates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTemplate(t)}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        selectedTemplate?.id === t.id
                          ? 'border-[var(--primary)] bg-[var(--primary-light)]'
                          : 'border-[var(--border)] hover:border-[rgba(99,102,241,0.3)]'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${
                        t.type === 'pdf' ? 'bg-red-500/10 text-red-500' :
                        t.type === 'xlsx' ? 'bg-green-500/10 text-green-500' :
                        'bg-blue-500/10 text-blue-500'
                      }`}>
                        <FileIcon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate text-[var(--text-base)]">{t.name}</p>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)]">{t.type}</p>
                      </div>
                      {selectedTemplate?.id === t.id && <CheckCircle size={16} className="text-[var(--primary)]" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Eigene Vorlage hochladen</p>
              <label
                className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all hover:border-[var(--primary)] hover:bg-[var(--primary-light)]"
                style={{ borderColor: uploadedFile ? 'var(--success)' : 'var(--border)' }}
              >
                <Upload size={24} style={{ color: uploadedFile ? 'var(--success)' : 'var(--text-muted)' }} />
                <div className="text-center">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-base)' }}>
                    {uploadedFile ? uploadedFile.name : 'PDF, Word oder Excel'}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Klicken oder Datei hierher ziehen
                  </p>
                </div>
                <input
                  type="file"
                  accept=".pdf,.docx,.xlsx"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                />
              </label>
            </div>

            <button
              onClick={() => { setSelectedTemplate(null); setStep(2); }}
              className="btn-ghost w-full text-xs justify-center"
            >
              Ohne Vorlage fortfahren
            </button>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setStep(2)}
                disabled={!selectedTemplate && !uploadedFile}
                className="btn-primary"
              >
                Weiter <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Details ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Von *</label>
                <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Bis *</label>
                <input type="date" value={to} onChange={e => setTo(e.target.value)} min={from} className="w-full px-3 py-2.5 rounded-lg border text-sm" required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Grund</label>
              <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="z.B. Familienurlaub" className="w-full px-3 py-2.5 rounded-lg border text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Vertretung</label>
              <input type="text" value={deputy} onChange={e => setDeputy(e.target.value)} placeholder="Name der Vertretung" className="w-full px-3 py-2.5 rounded-lg border text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Anmerkungen</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optionale Anmerkungen..." rows={2} className="w-full px-3 py-2.5 rounded-lg border text-sm resize-none" />
            </div>

            <div className="border rounded-xl p-3" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2 mb-2">
                <input type="checkbox" id="sendMail" checked={sendMail} onChange={e => setSendMail(e.target.checked)} className="w-4 h-4 rounded" />
                <label htmlFor="sendMail" className="text-sm font-medium flex items-center gap-1.5" style={{ color: 'var(--text-base)' }}>
                  <Mail size={13} /> E-Mail an Genehmiger senden
                </label>
              </div>
              {sendMail && (
                <input type="email" value={approverEmail} onChange={e => setApproverEmail(e.target.value)} placeholder="genehmiger@firma.de" className="w-full px-3 py-2 rounded-lg border text-sm mt-1" />
              )}
            </div>

            {error && <div className="text-xs p-2.5 rounded-lg bg-[var(--danger-light)] text-[var(--danger)]">{error}</div>}

            <div className="flex gap-2 pt-2">
              <button onClick={() => setStep(1)} className="btn-secondary flex-1"><ChevronLeft size={14} /> Zurück</button>
              <button onClick={() => setStep(3)} disabled={!from || !to} className="btn-primary flex-1">Überprüfen <ChevronRight size={14} /></button>
            </div>
          </div>
        )}

        {/* ── Step 3: Überprüfen ── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="card-glass rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                <span className="text-xs text-[var(--text-muted)]">Zeitraum</span>
                <span className="text-sm font-semibold text-[var(--text-base)]">{from} – {to}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                <span className="text-xs text-[var(--text-muted)]">Grund</span>
                <span className="text-sm text-[var(--text-base)]">{reason || '–'}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-xs text-[var(--text-muted)]">Vorlage</span>
                <span className="text-sm text-[var(--text-base)]">{selectedTemplate?.name || 'Keine (nur Daten)'}</span>
              </div>
            </div>

            <button onClick={handleDownload} disabled={generating} className="btn-secondary w-full justify-center">
              {generating ? <Loader size={13} className="animate-spin" /> : <Download size={13} />}
              Vorschau herunterladen
            </button>

            {error && <div className="text-xs p-2.5 rounded-lg bg-[var(--danger-light)] text-[var(--danger)]">{error}</div>}

            <div className="flex gap-2">
              <button onClick={() => setStep(2)} className="btn-secondary flex-1"><ChevronLeft size={14} /> Zurück</button>
              <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex-1">
                {submitting ? <Loader size={13} className="animate-spin" /> : 'Antrag einreichen'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Erfolg ── */}
        {step === 4 && (
          <div className="text-center py-6">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 bg-[var(--success-light)]">
              <CheckCircle size={40} className="text-[var(--success)]" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-[var(--text-base)]">Antrag eingereicht!</h3>
            <p className="text-sm mb-6 text-[var(--text-muted)]">
              Erfolgreich erstellt. Du kannst den Antrag jetzt herunterladen.
            </p>
            <div className="flex flex-col gap-2">
              <button onClick={handleDownload} disabled={generating} className="btn-secondary w-full justify-center">
                {generating ? <Loader size={13} className="animate-spin" /> : <Download size={13} />}
                Download Antragsdokument
              </button>
              <button onClick={onSuccess} className="btn-primary w-full shadow-lg shadow-indigo-500/20">
                Fertig
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
