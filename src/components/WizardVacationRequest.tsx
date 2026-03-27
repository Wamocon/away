'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  X, ChevronRight, ChevronLeft, Upload, FileText, Calendar,
  CheckCircle, Loader, Mail, AlertCircle, Download, Eye, File as FileIcon,
  Plus, Trash2
} from 'lucide-react';
import { generatePDF, generateExcel, generateWord, DocumentData } from '@/lib/documentGenerator';
import { differenceInBusinessDays, parseISO } from 'date-fns';
import Modal from './ui/Modal';

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

interface VacationType {
  id: string;
  label: string;
  checked: boolean;
}

export default function WizardVacationRequest({ userId, orgId, userEmail, orgName, onClose, onSuccess }: WizardProps) {
  const [step, setStep] = useState<Step>(1);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  // Alle 9 Felder wiederherstellen
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [vacationDays, setVacationDays] = useState<number>(0);
  const [vacationTypes, setVacationTypes] = useState<VacationType[]>([
    { id: 'bezahlt', label: 'Bezahlter Urlaub', checked: true },
    { id: 'unbezahlt', label: 'Unbezahlter Urlaub', checked: false },
    { id: 'ausgleich', label: 'Freizeitausgleich', checked: false },
    { id: 'sonder', label: 'Sonderurlaub', checked: false }
  ]);
  const [newTypeName, setNewTypeName] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');
  const [location, setLocation] = useState('');
  const [signedAt, setSignedAt] = useState(new Date().toISOString().split('T')[0]);
  const [employeeSignature, setEmployeeSignature] = useState<string | null>(null);
  const [approverSignature, setApproverSignature] = useState<string | null>(null);

  // Hilfsfelder
  const [deputy, setDeputy] = useState('');
  const [notes, setNotes] = useState('');
  const [sendMail, setSendMail] = useState(false);
  const [approverEmail, setApproverEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    if (orgId) {
      supabase.from('document_templates').select('*').eq('organization_id', orgId)
        .then(({ data }) => setTemplates((data as Template[]) || []));
    }
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setFirstName(data.user.user_metadata.first_name || '');
        setLastName(data.user.user_metadata.last_name || '');
      }
    });
  }, [orgId]);

  useEffect(() => {
    if (from && to) {
      try {
        const days = differenceInBusinessDays(parseISO(to), parseISO(from)) + 1;
        setVacationDays(days > 0 ? days : 0);
      } catch { setVacationDays(0); }
    }
  }, [from, to]);

  const addVacationType = () => {
    if (!newTypeName.trim()) return;
    setVacationTypes([...vacationTypes, { id: Date.now().toString(), label: newTypeName, checked: false }]);
    setNewTypeName('');
  };
  const removeVacationType = (id: string) => setVacationTypes(vacationTypes.filter(t => t.id !== id));
  const toggleVacationType = (id: string) => setVacationTypes(vacationTypes.map(t => t.id === id ? { ...t, checked: !t.checked } : t));

  const handleFileUpload = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    setUploadedFile(file);
    setSelectedTemplate({ id: 'custom-'+Date.now(), name: file.name.split('.')[0], type: ext as any, storage_path: '' });
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
          .from('templates').download(selectedTemplate.storage_path);
        if (downloadError) throw downloadError;
        bytes = await fileData.arrayBuffer();
        type = selectedTemplate.type;
      }

      const typesObj = vacationTypes.reduce((acc, t) => ({ ...acc, [t.label]: t.checked }), {});
      const docData: DocumentData = {
        from, to, reason, deputy, notes, userEmail, orgName: orgName || 'Haupt-Organisation',
        date: new Date().toLocaleDateString('de-DE'),
        customFields: { firstName, lastName, employeeId, documentId, vacationDays: vacationDays.toString(), location, signedAt, ...typesObj }
      };

      let blob: Blob;
      if (type === 'xlsx') blob = await generateExcel(docData, bytes);
      else if (type === 'docx') blob = await generateWord(docData, bytes!);
      else blob = await generatePDF(docData, bytes);

      return { blob, ext: type };
    } catch (err) { console.error(err); return null; } finally { setGenerating(false); }
  };

  const handleSubmit = async () => {
    if (!from || !to) { setError('Bitte Von- und Bis-Datum angeben'); return; }
    setError('');
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data, error: insertError } = await supabase.from('vacation_requests').insert([{
        user_id: userId, organization_id: orgId, from, to, reason, status: 'pending',
        template_fields: { deputy, notes, firstName, lastName, employeeId, documentId, vacationDays, vacationTypes, location, signedAt },
      }]).select('id').single();

      if (insertError) throw insertError;

      // Signatur-Upload
      if (employeeSignature || approverSignature) {
        const uploadSig = async (sig: string, t: string) => {
          const res = await fetch(sig);
          const blob = await res.blob();
          await supabase.storage.from('signatures').upload(`${data.id}/${t}.png`, blob, { upsert: true });
        };
        if (employeeSignature) await uploadSig(employeeSignature, 'employee');
        if (approverSignature) await uploadSig(approverSignature, 'approver');
      }

      // Dokumenten-Upload
      const result = await generateDocumentBlob();
      if (result && result.ext === 'pdf') {
        await supabase.storage.from('vacation-documents').upload(`vacation-${data.id}.pdf`, result.blob, { contentType: 'application/pdf', upsert: true });
      }

      setStep(4);
    } catch (err: any) { setError(err.message); } finally { setSubmitting(false); }
  };

  const footer = step < 4 && (
    <div className="flex gap-3">
      {step > 1 && (
        <button onClick={() => setStep((step - 1) as Step)} className="flex-1 py-4 px-6 rounded-2xl bg-[var(--bg-elevated)] text-[var(--text-base)] font-black text-xs uppercase tracking-[0.2em] border-2 border-[var(--border)] flex items-center justify-center gap-2 hover:bg-[var(--bg-surface)]">
          <ChevronLeft size={16} /> Zurück
        </button>
      )}
      <button 
        onClick={() => step === 3 ? handleSubmit() : setStep((step + 1) as Step)}
        disabled={submitting || (step === 1 && !selectedTemplate && !uploadedFile)}
        className="flex-[2] py-4 px-6 rounded-2xl bg-[var(--primary)] text-white font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
      >
        {submitting ? <Loader size={16} className="animate-spin" /> : (step === 3 ? 'Einreichen' : 'Weiter')}
        {step < 3 && <ChevronRight size={16} />}
      </button>
    </div>
  );

  return (
    <Modal isOpen={true} onClose={onClose} title="Neuer Urlaubsantrag" subtitle={`Schritt ${step} von 4`} footer={footer} maxWidth="max-w-2xl">
      <div className="space-y-8 py-2">
        {/* Step Indicators */}
        <div className="flex items-center px-4">
          {[1,2,3,4].map((i) => (
            <div key={i} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1.5 focus:outline-none">
                <div className={`wizard-step-dot !w-8 !h-8 !text-[11px] ${step === i ? 'active' : step > i ? 'done' : 'inactive'}`}>
                  {step > i ? '✓' : i}
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest opacity-60">
                  {['Vorlage', 'Details', 'Überprüfen', 'Fertig'][i-1]}
                </span>
              </div>
              {i < 4 && <div className={`flex-1 h-[2px] mx-2 mt-[-16px] transition-all duration-500 ${step > i ? 'bg-[var(--success)] shadow-[0_0_8px_rgba(34,197,94,0.3)]' : 'bg-[var(--border)]'}`} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-right-4">
             {templates.map(t => (
               <button key={t.id} onClick={() => { setSelectedTemplate(t); setStep(2); }} className={`p-5 rounded-2xl border-2 text-left transition-all ${selectedTemplate?.id === t.id ? 'border-[var(--primary)] bg-[var(--primary-light)]' : 'border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--text-muted)]'}`}>
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500"><FileIcon size={20} /></div>
                   <div className="flex-1 min-w-0"><p className="text-sm font-black truncate">{t.name}</p><p className="text-[9px] font-black uppercase tracking-widest opacity-50">{t.type}</p></div>
                 </div>
               </button>
             ))}
             <label className="p-5 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--bg-elevated)] hover:bg-[var(--primary-light)] hover:border-[var(--primary)] text-center cursor-pointer transition-all">
                <Upload className="mx-auto mb-2 text-[var(--text-muted)]" size={24} />
                <p className="text-[10px] font-black uppercase tracking-widest">Eigene Vorlage</p>
                <input type="file" className="hidden" onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
             </label>
             <button onClick={() => { setSelectedTemplate(null); setStep(2); }} className="p-5 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--bg-elevated)] hover:border-indigo-500/3s0 text-center transition-all md:col-span-2">
                <Plus className="mx-auto mb-2 text-indigo-500" size={24} />
                <p className="text-[10px] font-black uppercase tracking-widest">Ohne Vorlage fortfahren</p>
             </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-[9px] font-black uppercase tracking-widest opacity-50 ml-1 decoration-blue-500">Vorname *</label><input value={firstName} onChange={e => setFirstName(e.target.value)} className="form-input-lux" /></div>
              <div className="space-y-1.5"><label className="text-[9px] font-black uppercase tracking-widest opacity-50 ml-1">Nachname *</label><input value={lastName} onChange={e => setLastName(e.target.value)} className="form-input-lux" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-[9px] font-black uppercase tracking-widest opacity-50 ml-1">Personalnummer</label><input value={employeeId} onChange={e => setEmployeeId(e.target.value)} className="form-input-lux" /></div>
              <div className="space-y-1.5"><label className="text-[9px] font-black uppercase tracking-widest opacity-50 ml-1">Belegnummer</label><input value={documentId} onChange={e => setDocumentId(e.target.value)} className="form-input-lux" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-[9px] font-black uppercase tracking-widest opacity-50 ml-1">Von *</label><input type="date" value={from} onChange={e => setFrom(e.target.value)} className="form-input-lux" /></div>
              <div className="space-y-1.5"><label className="text-[9px] font-black uppercase tracking-widest opacity-50 ml-1">Bis *</label><input type="date" value={to} onChange={e => setTo(e.target.value)} className="form-input-lux" /></div>
            </div>
            <div className="bg-indigo-500/5 p-4 rounded-2xl border-2 border-indigo-500/20 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Urlaubstage (Werktage)</span>
              <input type="number" value={vacationDays} onChange={e => setVacationDays(Number(e.target.value))} className="w-16 bg-white rounded-lg px-2 py-1 text-center font-black text-sm border-2 border-indigo-500/30" />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between"><label className="text-[10px] font-black uppercase tracking-widest opacity-60">Urlaubsart</label><div className="flex items-center gap-1.5 bg-[var(--bg-elevated)] p-1.5 rounded-xl border border-[var(--border)]"><input value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="Eigene..." className="bg-transparent text-[10px] outline-none w-20 px-1 font-bold" /><button onClick={addVacationType} className="p-1.5 bg-indigo-500 text-white rounded-lg"><Plus size={12} /></button></div></div>
              <div className="grid grid-cols-2 gap-2.5">
                {vacationTypes.map(t => (
                  <div key={t.id} className="group relative">
                    <label className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all cursor-pointer ${t.checked ? 'border-[var(--primary)] bg-[var(--primary-light)]' : 'border-[var(--border)] bg-[var(--bg-elevated)]'}`}>
                      <input type="checkbox" checked={t.checked} onChange={() => toggleVacationType(t.id)} className="w-4 h-4 rounded text-[var(--primary)]" />
                      <span className="text-[11px] font-black truncate">{t.label}</span>
                    </label>
                    <button onClick={() => removeVacationType(t.id)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"><X size={10} /></button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-[9px] font-black uppercase tracking-widest opacity-50 ml-1">Ort</label><input value={location} onChange={e => setLocation(e.target.value)} className="form-input-lux" /></div>
              <div className="space-y-1.5"><label className="text-[9px] font-black uppercase tracking-widest opacity-50 ml-1">Datum</label><input type="date" value={signedAt} onChange={e => setSignedAt(e.target.value)} className="form-input-lux" /></div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-widest opacity-50">Unterschrift (Mitarbeiter)</label>
                <div className="aspect-video rounded-2xl border-2 border-dashed border-[var(--border)] flex flex-col items-center justify-center bg-[var(--bg-elevated)] relative overflow-hidden transition-all hover:bg-white/5 active:scale-95">
                  {employeeSignature ? (
                    <img src={employeeSignature} className="h-full w-full object-contain p-4" alt="Signature MA" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 opacity-50"><Upload size={24} /><span className="text-[8px] font-black uppercase tracking-widest">Upload PNG</span></div>
                  )}
                  <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setEmployeeSignature(r.result as string); r.readAsDataURL(f); } }} />
                  {employeeSignature && <button onClick={() => setEmployeeSignature(null)} className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-lg"><X size={10} /></button>}
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-widest opacity-50">Unterschrift (Genehmiger)</label>
                <div className="aspect-video rounded-2xl border-2 border-dashed border-[var(--border)] flex flex-col items-center justify-center bg-[var(--bg-elevated)] relative overflow-hidden transition-all hover:bg-white/5 active:scale-95">
                  {approverSignature ? (
                    <img src={approverSignature} className="h-full w-full object-contain p-4" alt="Signature Gen" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 opacity-50"><Upload size={24} /><span className="text-[8px] font-black uppercase tracking-widest">Upload PNG</span></div>
                  )}
                  <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setApproverSignature(r.result as string); r.readAsDataURL(f); } }} />
                  {approverSignature && <button onClick={() => setApproverSignature(null)} className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-lg"><X size={10} /></button>}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
             <div className="bg-indigo-500/5 rounded-3xl p-6 border-2 border-indigo-500/20 space-y-4">
                <div className="flex justify-between border-b border-indigo-500/10 pb-3"><span className="text-[10px] font-black uppercase opacity-60">Mitarbeiter</span><span className="text-sm font-black">{firstName} {lastName}</span></div>
                <div className="flex justify-between border-b border-indigo-500/10 pb-3"><span className="text-[10px] font-black uppercase opacity-60">Zeitraum</span><span className="text-sm font-black">{from} – {to}</span></div>
                <div className="flex justify-between border-b border-indigo-500/10 pb-3"><span className="text-[10px] font-black uppercase opacity-60">Dauer</span><span className="text-sm font-black">{vacationDays} Werktage</span></div>
                <div className="flex justify-between"><span className="text-[10px] font-black uppercase opacity-60">Grund</span><span className="text-sm font-black truncate max-w-[200px]">{reason || '–'}</span></div>
             </div>
             <button onClick={handleDownload} disabled={generating} className="w-full py-4 rounded-2xl bg-indigo-500/10 text-indigo-600 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 border-2 border-indigo-500/20 hover:bg-indigo-500/20 transition-all">
                {generating ? <Loader size={12} className="animate-spin" /> : <Download size={14} />} Vorschau Dokument
             </button>
          </div>
        )}

        {step === 4 && (
          <div className="text-center py-12 animate-in zoom-in-95 duration-500 overflow-hidden">
             <div className="w-24 h-24 rounded-[32px] bg-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/30 rotate-3"><CheckCircle size={48} className="text-white" /></div>
             <h3 className="text-2xl font-black mb-3">Antrag eingereicht!</h3>
             <p className="text-sm font-medium opacity-60 mb-10">Dein Urlaubsantrag wurde erfolgreich erstellt.</p>
             <button onClick={onSuccess} className="w-full py-4 rounded-2xl bg-[var(--primary)] text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:scale-[1.02] transition-all">Fertigstellen</button>
          </div>
        )}
      </div>
    </Modal>
  );
}
