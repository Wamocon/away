"use client";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
  showSuccess: () => {},
  showError: () => {},
  showWarning: () => {},
  showInfo: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

const ICONS: Record<ToastType, React.ElementType> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const STYLES: Record<ToastType, string> = {
  success: "bg-emerald-500 shadow-emerald-500/25",
  error: "bg-rose-500 shadow-rose-500/25",
  warning: "bg-amber-500 shadow-amber-500/25",
  info: "bg-indigo-500 shadow-indigo-500/25",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = Math.random().toString(36).slice(2) + Date.now();
      setToasts((prev) => [...prev.slice(-4), { id, message, type }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  const showSuccess = useCallback(
    (m: string) => showToast(m, "success"),
    [showToast],
  );
  const showError = useCallback(
    (m: string) => showToast(m, "error"),
    [showToast],
  );
  const showWarning = useCallback(
    (m: string) => showToast(m, "warning"),
    [showToast],
  );
  const showInfo = useCallback(
    (m: string) => showToast(m, "info"),
    [showToast],
  );

  return (
    <ToastContext.Provider
      value={{ showToast, showSuccess, showError, showWarning, showInfo }}
    >
      {children}
      <div
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type];
          return (
            <div
              key={toast.id}
              role="alert"
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl text-sm font-semibold text-white min-w-[260px] max-w-[380px] toast-slide-in ${STYLES[toast.type]}`}
            >
              <Icon size={16} className="shrink-0" />
              <span className="flex-1 leading-snug">{toast.message}</span>
              <button
                onClick={() => dismiss(toast.id)}
                className="shrink-0 opacity-70 hover:opacity-100 transition-opacity p-0.5 rounded"
                aria-label="Schließen"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
