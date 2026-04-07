"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Upload,
  CheckCircle,
  Loader,
  Download,
  File as FileIcon,
  Plus,
  CalendarDays,
  RefreshCw,
} from "lucide-react";
import {
  generatePDF,
  generateExcel,
  generateWord,
  DocumentData,
} from "@/lib/documentGenerator";
import { parseISO } from "date-fns";
import { createVacationRequest } from "@/lib/vacation";
import { getUserSettings } from "@/lib/userSettings";
import {
  isDocumentIdUsed,
  registerDocumentId,
  getNextDocumentCounter,
} from "@/lib/documentNumbers";
import {
  calculateVacationDays,
  GermanState,
  GERMAN_STATES,
} from "@/lib/holidays";
import Modal from "./ui/Modal";
import AlertModal from "./ui/AlertModal";
import { notifyApproversOfSubmission } from "@/lib/notifications";
import { VacationRequest } from "@/lib/vacation";
import { useSubscription } from "@/components/ui/SubscriptionProvider";
import { useLanguage } from "@/components/ui/LanguageProvider";

interface WizardProps {
  userId: string;
  orgId: string;
  userEmail: string;
  orgName: string;
  onClose: () => void;
  onSuccess: () => void;
  initialFrom?: string;
  initialTo?: string;
}

type Step = 1 | 2 | 3 | 4;

interface Template {
  id: string;
  name: string;
  type: "pdf" | "docx" | "xlsx";
  storage_path: string;
}

interface VacationType {
  id: string;
  label: string;
  checked: boolean;
}

export default function WizardVacationRequest({
  userId,
  orgId,
  userEmail,
  orgName,
  onClose,
  onSuccess,
  initialFrom,
  initialTo,
}: WizardProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>(1);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null,
  );
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Alle 9 Felder wiederherstellen
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [vacationDays, setVacationDays] = useState<number>(0);
  const [vacationTypes, setVacationTypes] = useState<VacationType[]>([
    { id: "bezahlt", label: "Bezahlter Urlaub", checked: true },
    { id: "unbezahlt", label: "Unbezahlter Urlaub", checked: false },
    { id: "ausgleich", label: "Freizeitausgleich", checked: false },
    { id: "sonder", label: "Sonderurlaub", checked: false },
  ]);
  const [newTypeName, setNewTypeName] = useState("");
  const [from, setFrom] = useState(initialFrom || "");
  const [to, setTo] = useState(initialTo || "");
  const [reason, setReason] = useState("");
  const [location, setLocation] = useState("");
  const [signedAt, setSignedAt] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [employeeSignature, setEmployeeSignature] = useState<string | null>(
    null,
  );
  const [selectedState, setSelectedState] = useState<GermanState>("ALL");

  // Hilfsfelder
  const [deputyField, setDeputyField] = useState("");
  const deputy = deputyField;
  const notes = "";
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatingDocId, setGeneratingDocId] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const { hasFeature, loading: subLoading } = useSubscription();
  const canUseTemplates = !subLoading && hasFeature("document_templates");

  // Lite-User: Vorlage-Schritt automatisch überspringen
  useEffect(() => {
    if (!subLoading && !hasFeature("document_templates") && step === 1) {
      setStep(2);
    }
  }, [subLoading, hasFeature, step]);

  useEffect(() => {
    const supabase = createClient();
    if (orgId) {
      // Vorlagen nur für Pro-Plan laden
      if (canUseTemplates) {
        supabase
          .from("document_templates")
          .select("*")
          .eq("organization_id", orgId)
          .then(({ data }) => setTemplates((data as Template[]) || []));
      }

      // Fetch profile settings for pre-filling (Bug 7)
      getUserSettings(userId, orgId).then((data) => {
        if (data && data.settings) {
          const s = data.settings as Record<string, unknown>;
          if (s.firstName) setFirstName(s.firstName as string);
          if (s.lastName) setLastName(s.lastName as string);
          if (s.employeeId) setEmployeeId(s.employeeId as string);
          if (s.state) setSelectedState(s.state as GermanState);
          // Erweiterte Vorbefüllung
          if (s.deputyName && !deputyField) setDeputyField(s.deputyName as string);
          if (s.location && !location) setLocation(s.location as string);
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, userId]);

  useEffect(() => {
    if (from && to) {
      try {
        const days = calculateVacationDays(
          parseISO(from),
          parseISO(to),
          selectedState,
        );
        setVacationDays(days >= 0 ? days : 0);
      } catch {
        setVacationDays(0);
      }
    }
  }, [from, to, selectedState, setVacationDays]);

  const generateBelegnummer = async () => {
    if (!firstName || !lastName || !orgId) return;
    setGeneratingDocId(true);
    try {
      const firstChar = firstName.charAt(0).toUpperCase();
      // First 2 letters of last name, upper-cased
      const lastChars = lastName.substring(0, 2).toUpperCase();
      const year = new Date().getFullYear().toString();
      const prefix = `${firstChar}${lastChars}${year}`;

      const nextCounter = await getNextDocumentCounter(orgId, prefix);
      // Format: NSC20260, NSC20261, NSC20262, ... (no zero-padding)
      setDocumentId(`${prefix}${nextCounter}`);
    } catch (err) {
      console.warn("Belegnummer konnte nicht generiert werden:", err);
    } finally {
      setGeneratingDocId(false);
    }
  };

  useEffect(() => {
    if (firstName && lastName && !documentId) {
      generateBelegnummer();
    }
  }, [firstName, lastName]); // eslint-disable-line react-hooks/exhaustive-deps

  const addVacationType = () => {
    if (!newTypeName.trim()) return;
    setVacationTypes([
      ...vacationTypes,
      { id: Date.now().toString(), label: newTypeName, checked: false },
    ]);
    setNewTypeName("");
  };
  const removeVacationType = (id: string) =>
    setVacationTypes(vacationTypes.filter((t) => t.id !== id));
  const toggleVacationType = (id: string) =>
    setVacationTypes(
      vacationTypes.map((t) =>
        t.id === id ? { ...t, checked: !t.checked } : t,
      ),
    );

  const handleFileUpload = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    setUploadedFile(file);
    setSelectedTemplate({
      id: "custom-" + Date.now(),
      name: file.name.split(".")[0],
      type: ext as "pdf" | "docx" | "xlsx",
      storage_path: "",
    });
  };

  const generateDocumentBlob = async (): Promise<{
    blob: Blob;
    ext: string;
  } | null> => {
    try {
      setGenerating(true);
      let bytes: ArrayBuffer | undefined = undefined;
      let type: "pdf" | "docx" | "xlsx" = "pdf";

      if (uploadedFile) {
        bytes = await uploadedFile.arrayBuffer();
        type = uploadedFile.name.split(".").pop()?.toLowerCase() as
          | "pdf"
          | "docx"
          | "xlsx";
      } else if (selectedTemplate?.storage_path) {
        const supabase = createClient();
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("templates")
          .download(selectedTemplate.storage_path);
        if (downloadError) throw downloadError;
        bytes = await fileData.arrayBuffer();
        type = selectedTemplate.type;
      }

      // vacationTypes als id→checked Map für PDF-Checkbox-Mapping
      const vacationTypesMap = vacationTypes.reduce(
        (acc, t) => ({ ...acc, [t.id]: t.checked }),
        {} as Record<string, boolean>,
      );
      const docData: DocumentData = {
        from,
        to,
        reason,
        deputy,
        notes,
        userEmail,
        orgName: orgName || "Haupt-Organisation",
        date: new Date().toLocaleDateString("de-DE"),
        firstName,
        lastName,
        employeeId,
        documentId,
        vacationDays: Number(vacationDays),
        vacationTypes: vacationTypesMap,
        location,
        signedAt,
        customFields: {
          firstName,
          lastName,
          employeeId,
          documentId,
          vacationDays: vacationDays.toString(),
          location,
          signedAt,
        },
      };

      let blob: Blob;
      if (type === "xlsx") blob = await generateExcel(docData, bytes);
      else if (type === "docx") blob = await generateWord(docData, bytes!);
      else blob = await generatePDF(docData, bytes);

      return { blob, ext: type };
    } catch (err) {
      console.error(err);
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!from || !to) {
      setError(t.wizard.error.datesMissing);
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const supabase = createClient();
      if (!orgId)
        throw new Error(t.wizard.error.noOrg);

      // Check if Belegnummer is already taken
      if (documentId.trim()) {
        const isUsed = await isDocumentIdUsed(orgId, documentId);
        if (isUsed) {
          throw new Error(
            `Die Belegnummer "${documentId}" wurde bereits in dieser Organisation vergeben.`,
          );
        }
      }

      const data = await createVacationRequest({
        userId,
        organizationId: orgId,
        from,
        to,
        reason,
        template_fields: {
          deputy,
          notes,
          firstName,
          lastName,
          employeeId,
          documentId,
          vacationDays,
          vacationTypes,
          location,
          signedAt,
        },
      });

      // Try sending notification (Async/Non-blocking)
      const applicantName = `${firstName} ${lastName}`;
      notifyApproversOfSubmission(
        data as unknown as VacationRequest,
        applicantName,
      ).catch((err) => {
        console.warn(
          "[Notifications] E-Mail-Dienst (Submission) fehlgeschlagen:",
          err,
        );
      });

      // Signatur-Upload (Nur Mitarbeiter-Unterschrift beim Erstellen)
      if (employeeSignature) {
        try {
          const res = await fetch(employeeSignature);
          const blob = await res.blob();
          const { error: sigError } = await supabase.storage
            .from("signatures")
            .upload(`${data.id}/employee.png`, blob, {
              upsert: true,
              cacheControl: "3600",
              contentType: "image/png",
            });

          if (sigError) {
            console.error("Signature upload error:", sigError);
            // Wir werfen hier keinen Fehler, damit der Antrag trotzdem erstellt wird,
            // zeigen aber eine Warnung oder loggen es.
          }
        } catch (sigErr) {
          console.error("Fetch signature error:", sigErr);
        }
      }

      // Dokumenten-Upload
      const result = await generateDocumentBlob();
      if (result && result.ext === "pdf") {
        await supabase.storage
          .from("vacation-documents")
          .upload(`vacation-${data.id}.pdf`, result.blob, {
            contentType: "application/pdf",
            upsert: true,
          });
      }

      // Register Belegnummer
      if (documentId.trim()) {
        await registerDocumentId(orgId, userId, documentId);
      }

      setStep(4);
    } catch (err: unknown) {
      console.error("Submission error:", err);
      let msg = t.wizard.error.unknown;
      const e = err as { message?: string; code?: string };
      if (e.message && typeof e.message === "string") {
        msg = e.message;
      } else if (e.code === "PGRST") {
        msg =
          'Datenbank-Fehler: Die Tabelle "document_numbers" konnte nicht gefunden werden. Bitte führen Sie die SQL-Migration aus.';
      } else if (typeof err === "object" && err !== null) {
        msg = (err as { message?: string }).message ?? JSON.stringify(err);
      } else {
        msg = String(err);
      }

      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePressSubmit = () => {
    if (!from || !to) {
      setError(t.wizard.error.datesMissing);
      return;
    }
    setIsConfirmOpen(true);
  };

  const handleFinalConfirm = () => {
    setIsConfirmOpen(false);
    handleSubmit();
  };

  const handleDownload = async () => {
    const result = await generateDocumentBlob();
    if (result) {
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `urlaubsantrag-${lastName || "neu"}.${result.ext}`;
      a.click();
    }
  };

  const footer = step < 4 && (
    <div className="flex justify-end gap-3">
      {step > 1 && (
        <button
          onClick={() => setStep((step - 1) as Step)}
          className="px-6 py-3 rounded-2xl bg-[var(--bg-elevated)] text-[var(--text-muted)] font-bold text-xs uppercase tracking-widest border border-[var(--border)] hover:bg-[var(--bg-surface)] transition-all flex items-center gap-2"
        >
          <ChevronLeft size={16} /> {t.common.back}
        </button>
      )}
      <button
        onClick={() =>
          step === 3 ? handlePressSubmit() : setStep((step + 1) as Step)
        }
        disabled={
          submitting || (step === 1 && !selectedTemplate && !uploadedFile)
        }
        className="px-8 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:hover:scale-100"
      >
        {submitting ? (
          <Loader size={16} className="animate-spin" />
        ) : step === 3 ? (
          t.wizard.submit
        ) : (
          t.common.next
        )}
        {step < 3 && <ChevronRight size={16} />}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={t.wizard.title}
      subtitle={`${t.wizard.step} ${step} ${t.wizard.stepOf}`}
      footer={footer}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-8 py-2">
        {/* Step Indicators - Premium Horizontal Layout */}
        <div className="flex items-center justify-between px-2 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black transition-all duration-500 ${
                    step === i
                      ? "bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] scale-110"
                      : step > i
                        ? "bg-emerald-500 text-white"
                        : "bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)]"
                  }`}
                >
                  {step > i ? "✓" : i}
                </div>
                <span
                  className={`text-[9px] font-black uppercase tracking-widest transition-opacity duration-500 ${step === i ? "text-indigo-400 opacity-100" : "opacity-30"}`}
                >
                  {[t.wizard.steps.template, t.wizard.steps.details, t.wizard.steps.review, t.wizard.steps.done][i - 1]}
                </span>
              </div>
              {i < 4 && (
                <div className="flex-1 px-4 mb-6">
                  <div
                    className={`h-[1px] w-full transition-all duration-700 ${step > i ? "bg-emerald-500/50" : "bg-white/10"}`}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-right-4">
            {templates.map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => {
                  setSelectedTemplate(tmpl);
                  setStep(2);
                }}
                className={`p-5 rounded-2xl border-2 text-left transition-all ${selectedTemplate?.id === tmpl.id ? "border-[var(--primary)] bg-[var(--primary-light)]" : "border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--text-muted)]"}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                    <FileIcon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black truncate">{tmpl.name}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-50">
                      {tmpl.type}
                    </p>
                  </div>
                </div>
              </button>
            ))}
            <label className="p-5 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--bg-elevated)] hover:bg-[var(--primary-light)] hover:border-[var(--primary)] text-center cursor-pointer transition-all">
              <Upload
                className="mx-auto mb-2 text-[var(--text-muted)]"
                size={24}
              />
              <p className="text-[10px] font-black uppercase tracking-widest">
                {t.wizard.step1.customTemplate}
              </p>
              <input
                type="file"
                className="hidden"
                onChange={(e) =>
                  e.target.files?.[0] && handleFileUpload(e.target.files[0])
                }
              />
            </label>
            <button
              onClick={() => {
                setSelectedTemplate(null);
                setStep(2);
              }}
              className="p-5 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--bg-elevated)] hover:border-indigo-500/3s0 text-center transition-all md:col-span-2"
              style={{ borderColor: "var(--border)" }}
            >
              <Plus className="mx-auto mb-2 text-indigo-500" size={24} />
              <p className="text-[10px] font-black uppercase tracking-widest">
                {t.wizard.step1.noTemplate}
              </p>
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 pb-4">
            {/* ─── 1. Identität ─── */}
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 delay-75 fill-mode-both">
              <div className="flex items-center gap-2 mb-1 px-1">
                <div className="w-1 h-4 bg-[var(--primary)] rounded-full" />
                <h4 className="text-[10px] font-black uppercase tracking-widest opacity-70">
                  {t.wizard.step2.identity}
                </h4>
              </div>
              <div className="card-glass p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-50 ml-1">
                      {t.form.firstNameRequired}
                    </label>
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="form-input-lux"
                      placeholder="Max"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-50 ml-1">
                      {t.form.lastNameRequired}
                    </label>
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="form-input-lux"
                      placeholder="Mustermann"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-[var(--border-subtle)] pt-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-50 ml-1">
                      {t.wizard.fields.employeeId}
                    </label>
                    <input
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      className="form-input-lux"
                      placeholder="P-0000"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-50 ml-1">
                      {t.form.documentId}
                    </label>
                    <div className="relative">
                      <input
                        value={documentId}
                        onChange={(e) => setDocumentId(e.target.value)}
                        className="form-input-lux pr-10"
                        placeholder="NSC202601"
                      />
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          generateBelegnummer();
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-all"
                        title={t.wizard.generateNew}
                        disabled={generatingDocId}
                      >
                        {generatingDocId ? (
                          <Loader size={12} className="animate-spin" />
                        ) : (
                          <RefreshCw size={12} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── 2. Zeitraum ─── */}
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 delay-150 fill-mode-both">
              <div className="flex items-center gap-2 mb-1 px-1">
                <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                <h4 className="text-[10px] font-black uppercase tracking-widest opacity-70">
                  {t.wizard.step2.period}
                </h4>
              </div>
              <div className="card-glass p-5 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-50 ml-1">
                      {t.form.fromRequired}
                    </label>
                    <input
                      type="date"
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                      className="form-input-lux shadow-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-50 ml-1">
                      {t.form.toRequired}
                    </label>
                    <input
                      type="date"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      className="form-input-lux shadow-sm"
                    />
                  </div>
                </div>

                <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                      <CalendarDays size={16} />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 block">
                        {t.wizard.totalDays}
                      </span>
                      <span className="text-[9px] opacity-60">
                        {t.wizard.autoCalculated}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={vacationDays}
                      onChange={(e) => setVacationDays(Number(e.target.value))}
                      className="w-14 bg-white dark:bg-slate-900 rounded-xl px-2 py-1.5 text-center font-black text-sm border-2 border-emerald-500/30 text-slate-900 dark:text-white"
                    />
                    <span className="text-[10px] font-bold opacity-40 uppercase">
                      {t.vacation.days}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── 3. Urlaubsart & Details ─── */}
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 delay-200 fill-mode-both">
              <div className="flex items-center gap-2 mb-1 px-1">
                <div className="w-1 h-4 bg-amber-500 rounded-full" />
                <h4 className="text-[10px] font-black uppercase tracking-widest opacity-70">
                  {t.wizard.step2.typeDetails}
                </h4>
              </div>
              <div className="card-glass p-5 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-60">
                      {t.wizard.vacationType.select}
                    </label>
                    <div className="flex items-center gap-1.5 bg-[var(--bg-elevated)] p-1.5 rounded-xl border border-[var(--border)]">
                      <input
                        value={newTypeName}
                        onChange={(e) => setNewTypeName(e.target.value)}
                        placeholder={t.wizard.vacationType.custom}
                        className="bg-transparent text-[10px] outline-none w-20 px-1 font-bold !border-none !ring-0 !box-shadow-none"
                      />
                      <button
                        onClick={addVacationType}
                        className="p-1.5 bg-[var(--primary)] text-white rounded-lg hover:scale-105 active:scale-95 transition-all"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {vacationTypes.map((vt) => (
                      <div key={vt.id} className="group relative">
                        <label
                          className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all cursor-pointer ${vt.checked ? "border-[var(--primary)] bg-[var(--primary-light)]" : "border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--border)]"}`}
                        >
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${vt.checked ? "bg-[var(--primary)] border-[var(--primary)]" : "border-[var(--text-subtle)]"}`}
                          >
                            {vt.checked && (
                              <CheckCircle size={10} className="text-white" />
                            )}
                          </div>
                          <input
                            type="checkbox"
                            checked={vt.checked}
                            onChange={() => toggleVacationType(vt.id)}
                            className="hidden"
                          />
                          <span className="text-[11px] font-black truncate">
                            {({
                              bezahlt: t.wizard.vacationType.paid,
                              unbezahlt: t.wizard.vacationType.unpaid,
                              ausgleich: t.wizard.vacationType.compensatory,
                              sonder: t.wizard.vacationType.special,
                            } as Record<string, string>)[vt.id] ?? vt.label}
                          </span>
                        </label>
                        <button
                          onClick={() => removeVacationType(vt.id)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 hover:scale-100"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black mb-1.5 text-[var(--text-muted)] uppercase tracking-widest">
                      {t.form.state}
                    </label>
                    <select
                      value={selectedState}
                      onChange={(e) =>
                        setSelectedState(e.target.value as GermanState)
                      }
                      className="w-full h-12 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl px-4 text-sm text-[var(--text-base)] focus:outline-none focus:border-indigo-500 transition-all appearance-none"
                    >
                      {GERMAN_STATES.map((s) => (
                        <option
                          key={s.code}
                          value={s.code}
                          className="bg-[var(--bg-elevated)] text-[var(--text-base)]"
                        >
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col justify-end">
                    <div className="h-12 flex items-center px-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                      <CalendarDays
                        size={14}
                        className="text-indigo-400 mr-2"
                      />
                      <span className="text-xs font-bold text-indigo-100">
                        {vacationDays} {t.wizard.netDays}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 border-t border-[var(--border-subtle)] pt-4">
                  <label className="text-[9px] font-black uppercase tracking-widest opacity-50 ml-1">
                    {t.wizard.reasonOptional}
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="form-input-lux min-h-[70px] py-3 resize-none font-medium"
                    placeholder={t.wizard.reasonPlaceholder}
                  />
                </div>
              </div>
            </div>

            {/* ─── 4. Unterschrift & Datum ─── */}
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 delay-300 fill-mode-both">
              <div className="flex items-center gap-2 mb-1 px-1">
                <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                <h4 className="text-[10px] font-black uppercase tracking-widest opacity-70">
                  {t.wizard.step2.finalization}
                </h4>
              </div>
              <div className="card-glass p-5 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-50 ml-1">
                      {t.form.location}
                    </label>
                    <input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="form-input-lux"
                      placeholder="Berlin"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-50 ml-1">
                      {t.form.date}
                    </label>
                    <input
                      type="date"
                      value={signedAt}
                      onChange={(e) => setSignedAt(e.target.value)}
                      className="form-input-lux"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 pt-2">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-60 text-center block">
                      {t.wizard.signature.employee}
                    </label>
                    <div className="aspect-[3/2] rounded-2xl border-2 border-dashed border-[var(--border)] flex flex-col items-center justify-center bg-[var(--bg-elevated)] relative overflow-hidden transition-all hover:bg-[var(--primary-light)] hover:border-[var(--primary)] group">
                      {employeeSignature ? (
                        <Image
                          src={employeeSignature}
                          className="h-full w-full object-contain p-4"
                          alt="Signature Employee"
                          width={300}
                          height={200}
                          unoptimized
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 opacity-40 group-hover:opacity-70 group-hover:scale-110 transition-all">
                          <Upload size={24} />
                          <span className="text-[8px] font-black uppercase tracking-widest">
                            {t.wizard.signature.upload}
                          </span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            const r = new FileReader();
                            r.onload = () =>
                              setEmployeeSignature(r.result as string);
                            r.readAsDataURL(f);
                          }
                        }}
                      />
                      {employeeSignature && (
                        <button
                          onClick={() => setEmployeeSignature(null)}
                          className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-lg shadow-lg hover:shadow-rose-500/40 transition-all"
                        >
                          <X size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Genehmiger signature removed for applicant view */}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="bg-indigo-500/5 rounded-3xl p-6 border-2 border-indigo-500/20 space-y-4">
              <div className="flex justify-between border-b border-indigo-500/10 pb-3">
                <span className="text-[10px] font-black uppercase opacity-60">
                  {t.wizard.review.employee}
                </span>
                <span className="text-sm font-black">
                  {firstName} {lastName}
                </span>
              </div>
              <div className="flex justify-between border-b border-indigo-500/10 pb-3">
                <span className="text-[10px] font-black uppercase opacity-60">
                  {t.wizard.review.period}
                </span>
                <span className="text-sm font-black">
                  {from} – {to}
                </span>
              </div>
              <div className="flex justify-between border-b border-indigo-500/10 pb-3">
                <span className="text-[10px] font-black uppercase opacity-60">
                  {t.wizard.review.duration}
                </span>
                <span className="text-sm font-black">
                  {vacationDays} {t.wizard.workdays}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] font-black uppercase opacity-60">
                  {t.wizard.review.reason}
                </span>
                <span className="text-sm font-black truncate max-w-[200px]">
                  {reason || "–"}
                </span>
              </div>
            </div>
            <button
              onClick={handleDownload}
              disabled={generating}
              className="w-full py-4 rounded-2xl bg-indigo-500/10 text-indigo-600 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 border-2 border-indigo-500/20 hover:bg-indigo-500/20 transition-all"
            >
              {generating ? (
                <Loader size={12} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}{" "}
              {t.wizard.previewDocument}
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="text-center py-12 animate-in zoom-in-95 duration-700">
            <div className="w-24 h-24 rounded-[32px] bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-500/20 rotate-3">
              <CheckCircle size={48} />
            </div>
            <h3 className="text-3xl font-black text-[var(--text-base)] mb-3 tracking-tight">
              {t.wizard.success.title}
            </h3>
            <p className="text-sm font-medium text-[var(--text-muted)] mb-10 max-w-sm mx-auto">
              {t.wizard.success.description}
            </p>
            <button
              onClick={onSuccess}
              className="px-12 py-4 rounded-2xl bg-[var(--primary)] text-white font-black text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-xl active:scale-95"
            >
              {t.wizard.success.close}
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-[11px] font-black uppercase tracking-widest animate-in shake-1">
            {error}
          </div>
        )}
      </div>

      <AlertModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleFinalConfirm}
        title={t.wizard.confirm.title}
        subtitle={t.wizard.confirm.subtitle}
        message={
          <>
            {t.wizard.confirm.message}{" "}
            <span className="text-[var(--primary)] font-bold">{from}</span> bis{" "}
            <span className="text-[var(--primary)] font-bold">{to}</span>{" "}
            {t.wizard.confirm.messageEnd}
          </>
        }
        confirmText={t.wizard.confirm.confirmText}
        type="info"
      />
    </Modal>
  );
}
