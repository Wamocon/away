"use client";
import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
}

/**
 * Ein universelles Modal-System mit React Portals:
 * - Verhindert "Einsperren" in Containern durch Rendering am body-Ende.
 * - Nutzt das GESAMTE Fenster (fixed inset-0).
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = "max-w-lg",
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 md:p-6 overflow-hidden outline-none">
      {/* Backdrop - High-end Glassmorphism */}
      <div
        className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Container - Premium Rounded & Extra Dark */}
      <div
        className={`relative w-full ${maxWidth} bg-[#070a14] rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-12 duration-500 ring-1 ring-white/5`}
        style={{ maxHeight: "90vh" }}
      >
        {/* Header - Modern & Bold */}
        <div className="shrink-0 pt-8 px-8 pb-6 flex items-start justify-between bg-transparent z-10">
          <div className="space-y-1">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">
              {title}
            </h2>
            {subtitle && (
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.1em] text-indigo-400 opacity-80">
                {subtitle}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="mt-1 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-all text-white/40 hover:text-white"
            aria-label="Schließen"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Area - Clean & Spaced */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-8">
          <div className="animate-in fade-in duration-500">{children}</div>
        </div>

        {/* Footer - Floating / Glossy if needed */}
        {footer && (
          <div className="shrink-0 p-8 border-t border-white/5 bg-black/20 backdrop-blur-sm z-10">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
