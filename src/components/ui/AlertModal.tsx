"use client";
import { ReactNode } from "react";
import Modal from "./Modal";
import { AlertTriangle, Info, Trash2, CheckCircle2 } from "lucide-react";

export type AlertType = "warning" | "info" | "danger" | "success";

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  subtitle?: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: AlertType;
  loading?: boolean;
  hideCancel?: boolean;
}

export default function AlertModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  subtitle,
  message,
  confirmText = "Bestätigen",
  cancelText = "Abbrechen",
  type = "warning",
  loading = false,
  hideCancel = false,
}: AlertModalProps) {
  const getIcon = () => {
    switch (type) {
      case "danger":
        return <Trash2 className="text-rose-500" size={28} />;
      case "success":
        return <CheckCircle2 className="text-emerald-500" size={28} />;
      case "info":
        return <Info className="text-indigo-500" size={28} />;
      default:
        return <AlertTriangle className="text-amber-500" size={28} />;
    }
  };

  const getConfirmStyle = () => {
    switch (type) {
      case "danger":
        return "bg-rose-500 hover:bg-rose-600 shadow-rose-500/20";
      case "success":
        return "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20";
      case "info":
        return "bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/20";
      default:
        return "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20";
    }
  };

  const footer = (
    <div className="flex gap-3">
      {!hideCancel && (
        <button
          onClick={onClose}
          disabled={loading}
          className="flex-1 py-3 px-4 rounded-xl bg-white/5 text-white/50 font-black text-[10px] uppercase tracking-widest border border-white/5 transition-all hover:bg-white/10 hover:text-white disabled:opacity-20"
        >
          {cancelText}
        </button>
      )}
      <button
        onClick={onConfirm}
        disabled={loading}
        className={`${hideCancel ? "w-full" : "flex-[1.5]"} py-3 px-4 rounded-xl text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 ${getConfirmStyle()}`}
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          confirmText
        )}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      footer={footer}
      maxWidth="max-w-md"
    >
      <div className="flex flex-col items-center text-center space-y-4 py-4">
        <div
          className={`w-16 h-16 rounded-[24px] bg-white/5 border border-white/10 flex items-center justify-center mb-2 animate-in zoom-in-50 duration-500`}
        >
          {getIcon()}
        </div>
        <div className="space-y-2">
          <div className="text-white/60 text-sm font-medium leading-relaxed max-w-[300px]">
            {message}
          </div>
        </div>
      </div>
    </Modal>
  );
}
