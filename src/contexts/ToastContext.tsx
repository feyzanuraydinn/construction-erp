import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../utils/cn';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timerMapRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const timers = timerMapRef.current;
    return () => {
      timers.forEach((timerId) => window.clearTimeout(timerId));
      timers.clear();
    };
  }, []);

  const removeToast = useCallback((id: string) => {
    const timerId = timerMapRef.current.get(id);
    if (timerId) {
      window.clearTimeout(timerId);
      timerMapRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const toast: Toast = { id, type, message, duration };

    setToasts((prev) => [...prev, toast]);

    if (duration > 0) {
      const timerId = window.setTimeout(() => {
        timerMapRef.current.delete(id);
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
      timerMapRef.current.set(id, timerId);
    }
  }, []);

  const success = useCallback((message: string) => addToast('success', message), [addToast]);
  const error = useCallback((message: string) => addToast('error', message, 6000), [addToast]);
  const warning = useCallback((message: string) => addToast('warning', message), [addToast]);
  const info = useCallback((message: string) => addToast('info', message), [addToast]);

  const value = useMemo<ToastContextValue>(
    () => ({ addToast, removeToast, success, error, warning, info }),
    [addToast, removeToast, success, error, warning, info]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
  className?: string;
}

function ToastContainer({ toasts, onRemove, className }: ToastContainerProps) {
  return (
    <div
      aria-live="polite"
      className={cn('fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm', className)}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
  className?: string;
}

const TOAST_STYLES: Record<ToastType, string> = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  warning: 'bg-yellow-600',
  info: 'bg-blue-600',
};

const TOAST_ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

function ToastItem({ toast, onRemove, className }: ToastItemProps) {
  const { t } = useTranslation();
  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white animate-slide-in',
        TOAST_STYLES[toast.type],
        className
      )}
    >
      <span className="text-lg font-bold" aria-hidden="true">
        {TOAST_ICONS[toast.type]}
      </span>
      <span className="flex-1 text-sm">{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        className="ml-1 p-0.5 rounded hover:bg-white/20 transition-colors"
        aria-label={t('common.close')}
      >
        ✕
      </button>
    </div>
  );
}
