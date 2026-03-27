'use client';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

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
export default function Modal({ isOpen, onClose, title, subtitle, children, footer, maxWidth = 'max-w-lg' }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-0 md:p-4 overflow-hidden outline-none">
      {/* Backdrop - Über das gesamte Fenster */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300 animate-in fade-in" 
        onClick={onClose} 
      />
      
      {/* Modal Container */}
      <div className={`relative w-full ${maxWidth} bg-[var(--bg-surface)] md:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-12 duration-500`} 
           style={{ maxHeight: '95vh', border: '1px solid var(--border)' }}>
        
        {/* Header - Fixed & Visible */}
        <div className="shrink-0 p-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-surface)] z-10">
          <div>
            <h2 className="text-xl font-black tracking-tight" style={{ color: 'var(--text-base)' }}>{title}</h2>
            {subtitle && (
              <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-1 opacity-50 text-[var(--primary)]">{subtitle}</p>
            )}
          </div>
          <button 
            onClick={onClose} 
            className="p-2.5 hover:bg-[var(--bg-elevated)] rounded-xl transition-all text-[var(--text-muted)] hover:text-rose-500"
            aria-label="Schließen"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 bg-gradient-to-b from-transparent to-[var(--bg-elevated)]/5">
          <div className="animate-in fade-in duration-500">
            {children}
          </div>
        </div>

        {/* Footer - Fixed & Bottom */}
        {footer && (
          <div className="shrink-0 p-6 border-t border-[var(--border)] bg-[var(--bg-surface)]/95 backdrop-blur-md z-10 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
