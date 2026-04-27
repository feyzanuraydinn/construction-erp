import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiDownload } from 'react-icons/fi';
import {
  Modal,
  ModalBody,
  ModalFooter,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../ui';

interface ExportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: Record<string, string>[];
  title?: string;
  onExport: (selectedIndices?: number[]) => void;
  /** 'selection' = checkboxes for list pages, 'filter' = filter controls for detail pages */
  mode?: 'selection' | 'filter';
  children?: React.ReactNode;
}

const MAX_PREVIEW_ROWS = 100;

export const ExportPreviewModal: React.FC<ExportPreviewModalProps> = ({
  isOpen,
  onClose,
  data,
  title,
  onExport,
  mode = 'filter',
  children,
}) => {
  const { t } = useTranslation();
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  // Reset selection when data changes or modal opens
  useEffect(() => {
    if (isOpen && mode === 'selection') {
      setSelectedIndices(new Set(data.map((_, i) => i)));
    }
  }, [isOpen, data, mode]);

  const columns = useMemo(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);

  const previewData = useMemo(() => data.slice(0, MAX_PREVIEW_ROWS), [data]);
  const totalCount = data.length;
  const showingLimited = totalCount > MAX_PREVIEW_ROWS;

  const allSelected = selectedIndices.size === data.length && data.length > 0;
  const someSelected = selectedIndices.size > 0 && selectedIndices.size < data.length;

  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(data.map((_, i) => i)));
    }
  };

  const handleToggleOne = (idx: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleExportClick = () => {
    if (mode === 'selection') {
      onExport(Array.from(selectedIndices).sort((a, b) => a - b));
    } else {
      onExport();
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title || t('export.preview.title')}
      size="xl"
    >
      <ModalBody className="p-4 space-y-4">
        {/* Filter mode: filter controls via children */}
        {mode === 'filter' && children && (
          <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            {children}
          </div>
        )}

        <div className="text-sm text-gray-500 dark:text-gray-400">
          {mode === 'selection'
            ? t('export.preview.selectedCount', { selected: selectedIndices.size, total: totalCount })
            : showingLimited
              ? t('export.preview.showing', { shown: MAX_PREVIEW_ROWS, total: totalCount })
              : t('export.preview.recordCount', { count: totalCount })}
        </div>

        <div className="max-h-96 overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                {mode === 'selection' && (
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={handleToggleAll}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                  </TableHead>
                )}
                {columns.map((col) => (
                  <TableHead key={col}>{col}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={(columns.length || 1) + (mode === 'selection' ? 1 : 0)} className="text-center py-8 text-gray-500">
                    {t('common.noData')}
                  </TableCell>
                </TableRow>
              ) : (
                previewData.map((row, idx) => (
                  <TableRow
                    key={idx}
                    className={mode === 'selection' && !selectedIndices.has(idx) ? 'opacity-50' : ''}
                  >
                    {mode === 'selection' && (
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedIndices.has(idx)}
                          onChange={() => handleToggleOne(idx)}
                          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                      </TableCell>
                    )}
                    {columns.map((col) => (
                      <TableCell key={col}>{row[col] || ''}</TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          {t('common.close')}
        </Button>
        <Button
          icon={FiDownload}
          onClick={handleExportClick}
          disabled={mode === 'selection' && selectedIndices.size === 0}
        >
          {t('common.exportToExcel')}
        </Button>
      </ModalFooter>
    </Modal>
  );
};
