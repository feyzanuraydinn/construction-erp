import React, { useEffect, useRef, useCallback, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FiX } from 'react-icons/fi';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: ModalSize;
  footer?: ReactNode;
  /** Override the dialog role (e.g. "alertdialog" for confirm dialogs) */
  role?: 'dialog' | 'alertdialog';
}

interface ModalHeaderProps {
  children: ReactNode;
  onClose?: () => void;
  /** Optional id to connect with aria-labelledby on the parent dialog */
  id?: string;
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

export function Modal({ isOpen, onClose, title, children, size = 'md', footer, role: dialogRole = 'dialog' }: ModalProps) {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useRef(`modal-title-${Math.random().toString(36).slice(2, 9)}`).current;

  // Focus trap: cycle focus within modal
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      // Save previously focused element
      previousFocusRef.current = document.activeElement as HTMLElement;

      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      // Focus first focusable element inside modal
      requestAnimationFrame(() => {
        if (modalRef.current) {
          const first = modalRef.current.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
          first?.focus();
        }
      });
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';

      // Restore focus when modal closes
      previousFocusRef.current?.focus();
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        ref={modalRef}
        role={dialogRole}
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={`
          relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full ${sizes[size]}
          max-h-[90vh] flex flex-col fade-in overflow-hidden
        `}
      >
        {/* Header - if title provided */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
            <h2 id={titleId} className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
            <button
              onClick={onClose}
              aria-label={t('common.close')}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <FiX size={20} />
            </button>
          </div>
        )}

        {/* Children - compound components or plain content */}
        {children}

        {/* Footer - if provided as prop */}
        {footer && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">{footer}</div>
        )}
      </div>
    </div>
  );
}

export function ModalHeader({ children, onClose, id }: ModalHeaderProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
      <h2 id={id} className="text-lg font-semibold text-gray-900 dark:text-gray-100">{children}</h2>
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
  return <div className={`flex-1 min-h-0 overflow-y-auto px-6 py-5 ${className}`}>{children}</div>;
}

export function ModalFooter({ children, className = '' }: ModalSectionProps) {
  return (
    <div
      className={`px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl flex justify-end gap-3 flex-shrink-0 ${className}`}
    >
      {children}
    </div>
  );
}
