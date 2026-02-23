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
        <ModalBody className="p-4 bg-gray-100">
          <div className="mx-auto bg-white shadow-lg" style={{ maxWidth: '210mm' }}>
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

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-view, .print-view * { visibility: visible; }
          .print-view { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </>
  );
};
