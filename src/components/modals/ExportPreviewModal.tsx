import React, { useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiDownload } from 'react-icons/fi';
import { Modal, ModalBody, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/Table';
import { SelectAllHeadCell, RowCheckboxCell } from '../ui/SelectAllCheckbox';
import { useSelection } from '../../hooks/useSelection';

interface ExportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: Record<string, string>[];
  onExport: (selectedIndices?: number[]) => void;
  mode?: 'selection' | 'filter';
  children?: React.ReactNode;
  className?: string;
}

const MAX_PREVIEW_ROWS = 100;

export const ExportPreviewModal: React.FC<ExportPreviewModalProps> = ({
  isOpen,
  onClose,
  data,
  onExport,
  mode = 'filter',
  children,
  className,
}) => {
  const { t } = useTranslation();
  const { selectedIds, handleSelectAll, handleSelectOne } = useSelection();
  const allIndices = useMemo(() => data.map((_, index) => index), [data]);
  const selecting = mode === 'selection';

  useEffect(() => {
    if (isOpen && selecting) handleSelectAll(allIndices, true);
  }, [isOpen, selecting, allIndices, handleSelectAll]);

  const columns = useMemo(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);

  const previewData = useMemo(() => data.slice(0, MAX_PREVIEW_ROWS), [data]);
  const totalCount = data.length;
  const showingLimited = totalCount > MAX_PREVIEW_ROWS;

  const countText = (() => {
    if (selecting)
      return t('export.preview.selectedCount', { selected: selectedIds.size, total: totalCount });
    if (showingLimited)
      return t('export.preview.showing', { shown: MAX_PREVIEW_ROWS, total: totalCount });
    return t('export.preview.recordCount', { count: totalCount });
  })();

  const handleExportClick = () => {
    if (selecting) {
      onExport(Array.from(selectedIds).sort((a, b) => a - b));
    } else {
      onExport();
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('export.preview.title')}
      size="xl"
      className={className}
    >
      <ModalBody className="space-y-4">
        {mode === 'filter' && children && (
          <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            {children}
          </div>
        )}

        <div className="text-sm text-gray-500 dark:text-gray-400">{countText}</div>

        <div className="max-h-96 overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                {selecting && (
                  <SelectAllHeadCell
                    itemIds={allIndices}
                    selectedIds={selectedIds}
                    onSelectAll={handleSelectAll}
                  />
                )}
                {columns.map((col) => (
                  <TableHead key={col}>{col}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={(columns.length || 1) + (selecting ? 1 : 0)}
                    className="text-center py-8 text-gray-500"
                  >
                    {t('common.noData')}
                  </TableCell>
                </TableRow>
              ) : (
                previewData.map((row, idx) => (
                  <TableRow
                    key={idx}
                    className={selecting && !selectedIds.has(idx) ? 'opacity-50' : ''}
                  >
                    {selecting && (
                      <RowCheckboxCell
                        id={idx}
                        selectedIds={selectedIds}
                        onSelectOne={handleSelectOne}
                      />
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
          disabled={selecting && selectedIds.size === 0}
        >
          {t('common.exportToExcel')}
        </Button>
      </ModalFooter>
    </Modal>
  );
};
