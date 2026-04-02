"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { VacationRequest, updateVacationStatus } from "@/lib/vacation";
import { getUserRole, UserRole, canApprove } from "@/lib/roles";
import { notifyApplicantOfStatusChange } from "@/lib/notifications";
import { getOrganizationsForUser } from "@/lib/organization";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { de } from "date-fns/locale";
import { renderFieldValue } from "@/lib/utils/formatters";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Calendar,
  Loader,
  AlertCircle,
  ChevronRight,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [request, setRequest] = useState<VacationRequest | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.push("/auth/login");
        return;
      }
      if (!data.user) {
        router.push("/auth/login");
        return;
      }

      const orgs = await getOrganizationsForUser(data.user.id);
      if (orgs.length > 0) {
        const org = orgs[0] as { id: string; name: string };
        const r = await getUserRole(data.user.id, org.id).catch(
          () => "employee" as UserRole,
        );
        setRole(r);
      }

      const { data: req } = await supabase
        .from("vacation_requests")
        .select("*")
        .eq("id", id)
        .single();

      setRequest(req as VacationRequest);
      setLoading(false);
    });
  }, [id, router]);

  const [approverSignature, setApproverSignature] = useState<string | null>(
    null,
  );
  const [employeeSigUrl, setEmployeeSigUrl] = useState<string | null>(null);
  const [approverSigUrl, setApproverSigUrl] = useState<string | null>(null);

  useEffect(() => {
    if (request && request.id) {
      const fetchSigs = async () => {
        const supabase = createClient();

        // Employee signature
        const { data: empSig, error: empErr } = await supabase.storage
          .from("signatures")
          .createSignedUrl(`${request.id}/employee.png`, 3600);

        if (!empErr && empSig) setEmployeeSigUrl(empSig.signedUrl);

        // Approver signature
        if (request.status === "approved") {
          const { data: appSig, error: appErr } = await supabase.storage
            .from("signatures")
            .createSignedUrl(`${request.id}/approver.png`, 3600);

          if (!appErr && appSig) setApproverSigUrl(appSig.signedUrl);
        }
      };

      fetchSigs();
    }
  }, [request]);

  const handleStatus = async (status: "approved" | "rejected") => {
    if (!request) return;

    if (status === "approved" && !approverSignature) {
      setError("Bitte laden Sie Ihre Unterschrift hoch, um zu genehmigen.");
      return;
    }

    setActionLoading(true);
    setError("");
    try {
      const supabase = createClient();

      // Upload approver signature if approving
      if (status === "approved" && approverSignature) {
        const res = await fetch(approverSignature);
        const blob = await res.blob();
        const { error: sigError } = await supabase.storage
          .from("signatures")
          .upload(`${request.id}/approver.png`, blob, {
            upsert: true,
            contentType: "image/png",
          });
        if (sigError) throw sigError;
      }

      const updated = await updateVacationStatus(request.id, status);
      setRequest(updated);

      // Trigger notification (Async/Non-blocking)
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        notifyApplicantOfStatusChange(updated, status, user.id).catch((err) => {
          console.warn(
            "[Notifications] E-Mail-Dienst (Status Change) fehlgeschlagen:",
            err,
          );
        });
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendReminder = async () => {
    if (!request) return;
    setActionLoading(true);
    try {
      const supabase = createClient();
      await supabase.functions.invoke("send-vacation-mail", {
        body: {
          requestId: request.id,
          fromDate: request.from,
          toDate: request.to,
          reason: request.reason,
          appUrl: window.location.origin,
        },
      });
    } catch {
      /* ignore */
    }
    setActionLoading(false);
  };

  const statusConfig = {
    pending: {
      label: "Ausstehend",
      cls: "badge-pending",
      Icon: Clock,
      color: "var(--warning)",
    },
    approved: {
      label: "Genehmigt",
      cls: "badge-approved",
      Icon: CheckCircle,
      color: "var(--success)",
    },
    rejected: {
      label: "Abgelehnt",
      cls: "badge-rejected",
      Icon: XCircle,
      color: "var(--danger)",
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader
          size={24}
          className="animate-spin"
          style={{ color: "var(--primary)" }}
        />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div
          className="relative w-full max-w-sm rounded-2xl shadow-2xl p-8 text-center animate-in zoom-in-95 duration-200"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
          }}
        >
          <button
            onClick={() => router.push("/dashboard/requests")}
            className="absolute top-4 right-4 p-2 rounded-xl btn-ghost"
          >
            <X size={18} />
          </button>
          <AlertCircle size={40} className="mx-auto mb-4 opacity-30" />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Antrag nicht gefunden
          </p>
          <Link
            href="/dashboard/requests"
            className="btn-primary mt-4 inline-flex"
          >
            <ArrowLeft size={14} /> Zurück zu Anträgen
          </Link>
        </div>
      </div>
    );
  }

  const cfg = statusConfig[request.status];
  const days =
    differenceInCalendarDays(parseISO(request.to), parseISO(request.from)) + 1;

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto p-4 pt-10">
      <div
        className="relative w-full max-w-3xl rounded-2xl shadow-2xl mb-10 animate-in zoom-in-95 duration-200"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
        }}
      >
        {/* Modal close button */}
        <button
          onClick={() => router.push("/dashboard/requests")}
          className="absolute top-4 right-4 p-2 rounded-xl btn-ghost z-10"
          aria-label="Schließen"
        >
          <X size={18} />
        </button>
        <div className="p-6 md:p-8 w-full animate-fade-in">
          {/* Breadcrumb */}
          <div
            className="flex items-center gap-2 text-xs mb-6"
            style={{ color: "var(--text-muted)" }}
          >
            <Link
              href="/dashboard"
              className="hover:text-[var(--text-base)] transition-colors"
            >
              Dashboard
            </Link>
            <ChevronRight size={12} />
            <Link
              href="/dashboard/requests"
              className="hover:text-[var(--text-base)] transition-colors"
            >
              Anträge
            </Link>
            <ChevronRight size={12} />
            <span style={{ color: "var(--text-base)" }}>Antrag Details</span>
          </div>

          {/* Header */}
          <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
            <div>
              <h1
                className="text-2xl font-black tracking-tight"
                style={{ color: "var(--text-base)" }}
              >
                Urlaubsantrag
              </h1>
              <p
                className="text-xs mt-1 font-mono"
                style={{ color: "var(--text-subtle)" }}
              >
                ID: {request.id}
              </p>
            </div>
            <span className={`badge ${cfg.cls} text-sm px-4 py-2`}>
              <cfg.Icon size={14} />
              {cfg.label}
            </span>
          </div>

          {/* Status Timeline */}
          <div className="card p-5 mb-5">
            <h2
              className="text-xs font-bold uppercase tracking-widest mb-4"
              style={{ color: "var(--text-subtle)" }}
            >
              Status-Verlauf
            </h2>
            <div className="flex items-center gap-0">
              {[
                {
                  label: "Eingereicht",
                  date: request.created_at,
                  done: true,
                  active: false,
                },
                {
                  label: "In Prüfung",
                  date:
                    request.status !== "pending" ? request.updated_at : null,
                  done: request.status !== "pending",
                  active: request.status === "pending",
                },
                {
                  label:
                    request.status === "rejected" ? "Abgelehnt" : "Genehmigt",
                  date:
                    request.status !== "pending" ? request.updated_at : null,
                  done: request.status !== "pending",
                  active: false,
                  color:
                    request.status === "rejected"
                      ? "var(--danger)"
                      : "var(--success)",
                },
              ].map((s, i) => (
                <div key={s.label} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all`}
                      style={{
                        background: s.done
                          ? s.color || "var(--success)"
                          : s.active
                            ? "var(--primary)"
                            : "var(--bg-elevated)",
                        borderColor: s.done
                          ? s.color || "var(--success)"
                          : s.active
                            ? "var(--primary)"
                            : "var(--border)",
                        color:
                          s.done || s.active ? "white" : "var(--text-muted)",
                      }}
                    >
                      {s.done ? "✓" : i + 1}
                    </div>
                    <span
                      className="text-[10px] font-semibold text-center whitespace-nowrap"
                      style={{
                        color:
                          s.done || s.active
                            ? "var(--text-base)"
                            : "var(--text-subtle)",
                      }}
                    >
                      {s.label}
                    </span>
                    {s.date && (
                      <span
                        className="text-[9px] text-center whitespace-nowrap"
                        style={{ color: "var(--text-subtle)" }}
                      >
                        {format(parseISO(s.date), "dd.MM.yy HH:mm", {
                          locale: de,
                        })}
                      </span>
                    )}
                  </div>
                  {i < 2 && (
                    <div
                      className={`flex-1 h-0.5 mt-[-24px] ${s.done ? "bg-[var(--success)]" : "bg-[var(--border)]"}`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="grid md:grid-cols-2 gap-4 mb-5">
            <div className="card p-5">
              <h2
                className="text-xs font-bold uppercase tracking-widest mb-4"
                style={{ color: "var(--text-subtle)" }}
              >
                Zeitraum
              </h2>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar size={14} style={{ color: "var(--primary)" }} />
                  <div>
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Von
                    </p>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "var(--text-base)" }}
                    >
                      {format(parseISO(request.from), "EEEE, dd. MMMM yyyy", {
                        locale: de,
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={14} style={{ color: "var(--primary)" }} />
                  <div>
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Bis
                    </p>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "var(--text-base)" }}
                    >
                      {format(parseISO(request.to), "EEEE, dd. MMMM yyyy", {
                        locale: de,
                      })}
                    </p>
                  </div>
                </div>
                <div
                  className="flex items-center gap-2 pt-2 border-t"
                  style={{ borderColor: "var(--border)" }}
                >
                  <span className="badge badge-primary text-sm">
                    {days} Urlaubstage
                  </span>
                </div>
              </div>
            </div>

            <div className="card p-5">
              <h2
                className="text-xs font-bold uppercase tracking-widest mb-4"
                style={{ color: "var(--text-subtle)" }}
              >
                Details
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Grund
                  </p>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--text-base)" }}
                  >
                    {request.reason || "–"}
                  </p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Eingereicht am
                  </p>
                  <p className="text-sm" style={{ color: "var(--text-base)" }}>
                    {format(parseISO(request.created_at), "dd.MM.yyyy HH:mm", {
                      locale: de,
                    })}
                  </p>
                </div>
                {request.template_fields &&
                  Object.keys(request.template_fields).length > 0 && (
                    <div>
                      <p
                        className="text-xs mb-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Weitere Angaben
                      </p>
                      {Object.entries(
                        request.template_fields as Record<string, unknown>,
                      ).map(([k, v]) => {
                        const displayValue = renderFieldValue(v);
                        if (!displayValue) return null;
                        return (
                          <p
                            key={k}
                            className="text-xs"
                            style={{ color: "var(--text-base)" }}
                          >
                            <span style={{ color: "var(--text-muted)" }}>
                              {k}:
                            </span>{" "}
                            {displayValue}
                          </p>
                        );
                      })}
                    </div>
                  )}
              </div>
            </div>
          </div>

          {/* Signaturen View */}
          <div className="card p-5 mb-5 space-y-6">
            <h2
              className="text-xs font-bold uppercase tracking-widest mb-4"
              style={{ color: "var(--text-subtle)" }}
            >
              Unterschriften
            </h2>
            <div className="grid grid-cols-2 gap-8">
              {/* Applicant Signature */}
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
                  Mitarbeiter
                </p>
                <div className="aspect-[3/2] rounded-2xl border-2 border-[var(--border)] bg-[var(--bg-elevated)] relative overflow-hidden flex items-center justify-center p-4">
                  {employeeSigUrl ? (
                    <Image
                      src={employeeSigUrl}
                      alt="Employee Signature"
                      className="h-full w-full object-contain"
                      width={300}
                      height={200}
                      unoptimized
                    />
                  ) : (
                    <p className="text-[10px] font-bold opacity-30">
                      Keine Unterschrift
                    </p>
                  )}
                </div>
              </div>

              {/* Approver Signature */}
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
                  Genehmiger
                </p>
                <div className="aspect-[3/2] rounded-2xl border-2 border-[var(--border)] bg-[var(--bg-elevated)] relative overflow-hidden flex items-center justify-center">
                  {approverSigUrl ? (
                    <Image
                      src={approverSigUrl}
                      alt="Approver Signature"
                      className="h-full w-full object-contain p-4"
                      width={300}
                      height={200}
                      unoptimized
                    />
                  ) : canApprove(role) && request.status === "pending" ? (
                    <div className="p-4 w-full h-full flex flex-col items-center justify-center gap-2 group cursor-pointer hover:bg-[var(--primary-light)] transition-all">
                      {approverSignature ? (
                        <div className="relative w-full h-full">
                          <Image
                            src={approverSignature}
                            className="h-full w-full object-contain"
                            alt="Approver Sig Preview"
                            width={300}
                            height={200}
                            unoptimized
                          />
                          <button
                            onClick={() => setApproverSignature(null)}
                            className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-full"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload
                            size={20}
                            className="opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all"
                          />
                          <span className="text-[8px] font-black uppercase tracking-widest opacity-40">
                            Unterschrift hochladen
                          </span>
                        </>
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
                              setApproverSignature(r.result as string);
                            r.readAsDataURL(f);
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <p className="text-[10px] font-bold opacity-30">
                      Noch nicht genehmigt
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="card p-5">
            <h2
              className="text-xs font-bold uppercase tracking-widest mb-4"
              style={{ color: "var(--text-subtle)" }}
            >
              Aktionen
            </h2>
            <div className="flex flex-wrap gap-2">
              {/* Approve / Reject for approvers */}
              {canApprove(role) && request.status === "pending" && (
                <>
                  <button
                    onClick={() => handleStatus("approved")}
                    disabled={actionLoading}
                    className="btn-primary"
                    style={{ background: "var(--success)" }}
                  >
                    {actionLoading ? (
                      <Loader size={13} className="animate-spin" />
                    ) : (
                      <CheckCircle size={13} />
                    )}
                    Genehmigen
                  </button>
                  <button
                    onClick={() => handleStatus("rejected")}
                    disabled={actionLoading}
                    className="btn-secondary"
                    style={{
                      borderColor: "rgba(239,68,68,0.3)",
                      color: "var(--danger)",
                    }}
                  >
                    <XCircle size={13} />
                    Ablehnen
                  </button>
                </>
              )}

              {/* Send email reminder */}
              <button
                onClick={handleSendReminder}
                disabled={actionLoading}
                className="btn-secondary"
              >
                <Mail size={13} /> E-Mail Erinnerung
              </button>

              {/* Link kopieren */}
              <button
                onClick={() =>
                  navigator.clipboard.writeText(window.location.href)
                }
                className="btn-secondary"
              >
                Link kopieren
              </button>
            </div>

            {error && (
              <div
                className="mt-3 text-xs p-2.5 rounded-lg"
                style={{
                  background: "var(--danger-light)",
                  color: "var(--danger)",
                }}
              >
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
