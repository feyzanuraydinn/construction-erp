import React from 'react';
import { useTranslation } from 'react-i18next';
import { FiPrinter } from 'react-icons/fi';
import { Modal, ModalBody, ModalFooter, Button } from '../ui';
import { usePrint } from '../../hooks/usePrint';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Yazdırma önizleme modali.
 * A4 boyutunda beyaz sayfa ve yazdır/kapat butonları içerir.
 * Print CSS ve hidden print-view div'i otomatik olarak dahildir.
 */
export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  children,
}) => {
  const { t } = useTranslation();
  const { executePrint } = usePrint();

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={t('common.printPreview')} size="xl">
        <ModalBody className="p-4 bg-gray-100 dark:bg-gray-700">
          <div
            className="mx-auto bg-white shadow-lg print-preview-light"
            style={{ maxWidth: '210mm', colorScheme: 'light' }}
          >
            {children}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={onClose}>
            {t('common.close')}
          </Button>
          <Button icon={FiPrinter} onClick={executePrint}>
            {t('common.printAction')}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Hidden Print View */}
      <div className="hidden print:block print-view">{children}</div>

      {/* Print & light-mode override styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-view, .print-view * { visibility: visible; }
          .print-view { position: absolute; left: 0; top: 0; width: 100%; }
        }
        /*
         * Force light appearance inside print preview regardless of dark mode.
         * Uses high-specificity selectors to override Tailwind dark: classes.
         */
        .print-preview-light,
        .print-preview-light td,
        .print-preview-light th,
        .print-preview-light p,
        .print-preview-light span,
        .print-preview-light h1,
        .print-preview-light h2,
        .print-preview-light h3,
        .print-preview-light div,
        .print-preview-light table {
          color: #111827 !important;
          border-color: #d1d5db !important;
        }
        .print-preview-light {
          color-scheme: light !important;
          background-color: #fff !important;
        }
        /* Backgrounds */
        .print-preview-light .bg-white { background-color: #fff !important; }
        .print-preview-light .bg-gray-50,
        .print-preview-light tr.bg-gray-50 { background-color: #f9fafb !important; }
        .print-preview-light .bg-gray-100,
        .print-preview-light tr.bg-gray-100 { background-color: #f3f4f6 !important; }
        /* Borders */
        .print-preview-light .border-gray-800,
        .print-preview-light .border-b-2 { border-color: #1f2937 !important; }
        .print-preview-light .border-gray-300 td,
        .print-preview-light .border-gray-300 th,
        .print-preview-light td.border,
        .print-preview-light th.border { border-color: #d1d5db !important; }
        /* Specific text colors — override the base #111827 for colored elements */
        .print-preview-light .text-green-700 { color: #15803d !important; }
        .print-preview-light .text-red-700 { color: #b91c1c !important; }
        .print-preview-light .text-blue-700 { color: #1d4ed8 !important; }
        .print-preview-light .text-orange-700 { color: #c2410c !important; }
      `}</style>
    </>
  );
};
