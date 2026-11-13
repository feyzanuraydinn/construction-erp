import { useEffect, useId, useRef, ReactNode, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { FiX } from 'react-icons/fi';
import { cn } from '../../utils/cn';
import { useLatest } from '../../hooks/useLatest';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: ModalSize;
  role?: 'dialog' | 'alertdialog';
  labelledBy?: string;
  className?: string;
}

interface ModalHeaderProps {
  children: ReactNode;
  onClose?: () => void;
  id?: string;
  className?: string;
}

interface ModalSectionProps {
  children: ReactNode;
  className?: string;
}

const sizes: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-6xl',
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const openModals: symbol[] = [];

export function useModalLayer(
  isOpen: boolean,
  onEscape: () => void,
  containerRef: RefObject<HTMLElement | null>
): void {
  const onEscapeRef = useLatest(onEscape);

  useEffect(() => {
    if (!isOpen) return;

    const token = Symbol('modal');
    openModals.push(token);
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (openModals[openModals.length - 1] !== token) return;

      if (e.key === 'Escape') {
        onEscapeRef.current();
        return;
      }

      const container = containerRef.current;
      if (e.key === 'Tab' && container) {
        const focusable = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    const frame = requestAnimationFrame(() => {
      containerRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus();
    });

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      const index = openModals.indexOf(token);
      if (index !== -1) openModals.splice(index, 1);
      if (openModals.length === 0) document.body.style.overflow = '';
      previousFocus?.focus();
    };
  }, [isOpen, containerRef, onEscapeRef]);
}

export function Modal({
  isOpen,
  onClose,
  title,
  labelledBy,
  children,
  size = 'md',
  role: dialogRole = 'dialog',
  className,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useModalLayer(isOpen, onClose, modalRef);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div
        ref={modalRef}
        role={dialogRole}
        aria-modal="true"
        aria-labelledby={title ? titleId : labelledBy}
        className={cn(
          'relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full',
          sizes[size],
          'max-h-[90vh] flex flex-col fade-in overflow-hidden',
          className
        )}
      >
        {title && (
          <ModalHeader id={titleId} onClose={onClose} className="flex-shrink-0">
            {title}
          </ModalHeader>
        )}

        {children}
      </div>
    </div>
  );
}

function ModalHeader({ children, onClose, id, className }: ModalHeaderProps) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        'flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700',
        className
      )}
    >
      <h2 id={id} className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {children}
      </h2>
      {onClose && (
        <button
          onClick={onClose}
          aria-label={t('common.close')}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <FiX size={20} />
        </button>
      )}
    </div>
  );
}

export function ModalBody({ children, className = '' }: ModalSectionProps) {
  return (
    <div className={cn('flex-1 min-h-0 overflow-y-auto px-6 py-5', className)}>{children}</div>
  );
}

export function ModalFooter({ children, className = '' }: ModalSectionProps) {
  return (
    <div
      className={cn(
        'px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl flex justify-end gap-3 flex-shrink-0',
        className
      )}
    >
      {children}
    </div>
  );
}
