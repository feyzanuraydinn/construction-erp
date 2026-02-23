import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Select,
  Badge,
  Button,
} from '../../components/ui';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  getTransactionColor,
  getTransactionTextColor,
  isPositiveTransaction,
} from '../../utils/transactionHelpers';
import {
  TRANSACTION_TYPES,
  TRANSACTION_SCOPES,
  TRANSACTION_TYPE_LABELS,
} from '../../utils/constants';
import type {
  Company,
  Project,
  Category,
  TransactionType,
  TransactionScope,
  BadgeVariant,
} from '../../types';

export interface TransactionDetailFormData {
  date: string;
  type: TransactionType;
  scope: TransactionScope;
  company_id: string;
  project_id: string;
  category_id: string;
  amount: string;
  currency: 'TRY' | 'USD' | 'EUR';
  description: string;
  document_no: string;
}

interface TransactionDetailModalProps {
  isOpen: boolean;
  editMode: boolean;
  formData: TransactionDetailFormData;
  companies: Company[];
  projects: Project[];
  categories: Category[];
  onClose: () => void;
  onEdit: () => void;
  onSave: () => void;
  onDelete: () => void;
  onFormChange: (data: TransactionDetailFormData) => void;
}

const getScopeLabel = (scope: string, t: (key: string) => string): { label: string; variant: BadgeVariant } => {
  switch (scope) {
    case 'cari':
      return { label: t('transactions.scope.cari'), variant: 'info' };
    case 'project':
      return { label: t('transactions.scope.project'), variant: 'purple' };
    case 'company':
      return { label: t('transactions.scope.company'), variant: 'default' };
    default:
      return { label: scope, variant: 'default' };
  }
};

export const TransactionDetailModal = memo(function TransactionDetailModal({
  isOpen,
  editMode,
  formData,
  companies,
  projects,
  categories,
  onClose,
  onEdit,
  onSave,
  onDelete,
  onFormChange,
}: TransactionDetailModalProps) {
  const { t } = useTranslation();

  const updateField = <K extends keyof TransactionDetailFormData>(key: K, value: TransactionDetailFormData[K]) => {
    onFormChange({ ...formData, [key]: value });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader>
        <div className="flex items-center justify-between">
          <span>{editMode ? t('transactions.editTransaction') : t('transactions.transactionDetail')}</span>
          {!editMode && (
            <Button variant="ghost" size="xs" icon={FiEdit2} onClick={onEdit}>
              {t('common.edit')}
            </Button>
          )}
        </div>
      </ModalHeader>
      <ModalBody>
        <div className="grid grid-cols-2 gap-4">
          {/* Date */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('transactions.form.date')}
            </label>
            {editMode ? (
              <Input
                type="date"
                value={formData.date}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateField('date', e.target.value)
                }
              />
            ) : (
              <p className="py-2 text-gray-900 dark:text-gray-100">{formatDate(formData.date)}</p>
            )}
          </div>

          {/* Type */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('transactions.form.type')}
            </label>
            {editMode ? (
              <Select
                options={TRANSACTION_TYPES.map((o) => ({ ...o, label: t(o.label) }))}
                value={formData.type}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  updateField('type', e.target.value as TransactionType)
                }
              />
            ) : (
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${getTransactionColor(formData.type)} text-white`}
              >
                {t(TRANSACTION_TYPE_LABELS[formData.type])}
              </span>
            )}
          </div>

          {/* Scope */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('transactions.form.source')}
            </label>
            {editMode ? (
              <Select
                options={TRANSACTION_SCOPES.map((o) => ({ ...o, label: t(o.label) }))}
                value={formData.scope}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  onFormChange({
                    ...formData,
                    scope: e.target.value as TransactionScope,
                    company_id: '',
                    project_id: '',
                  })
                }
              />
            ) : (
              <Badge variant={getScopeLabel(formData.scope, t).variant}>
                {getScopeLabel(formData.scope, t).label}
              </Badge>
            )}
          </div>

          {/* Company (cari scope) */}
          {formData.scope === 'cari' && (
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('transactions.form.company')}
              </label>
              {editMode ? (
                <Select
                  options={companies.map((c) => ({ value: c.id, label: c.name }))}
                  value={formData.company_id}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    updateField('company_id', e.target.value)
                  }
                  placeholder={t('transactions.form.selectCompany')}
                />
              ) : (
                <p className="py-2 text-gray-900 dark:text-gray-100">
                  {companies.find((c) => c.id === parseInt(formData.company_id))?.name || '-'}
                </p>
              )}
            </div>
          )}

          {/* Project (project scope) */}
          {formData.scope === 'project' && (
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('transactions.form.project')}
              </label>
              {editMode ? (
                <Select
                  options={projects.map((p) => ({ value: p.id, label: p.name }))}
                  value={formData.project_id}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    updateField('project_id', e.target.value)
                  }
                  placeholder={t('transactions.form.selectProject')}
                />
              ) : (
                <p className="py-2 text-gray-900 dark:text-gray-100">
                  {projects.find((p) => p.id === parseInt(formData.project_id))?.name || '-'}
                </p>
              )}
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('transactions.form.amount')}
            </label>
            {editMode ? (
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateField('amount', e.target.value)
                }
              />
            ) : (
              <p className={`text-lg font-bold ${getTransactionTextColor(formData.type)}`}>
                {isPositiveTransaction(formData.type) ? '+' : '-'}
                {formatCurrency(parseFloat(formData.amount))}
              </p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('transactions.form.category')}
            </label>
            {editMode ? (
              <Select
                options={categories
                  .filter((c) => {
                    if (formData.type === 'invoice_out') return c.type === 'invoice_out';
                    if (formData.type === 'invoice_in') return c.type === 'invoice_in';
                    return c.type === 'payment';
                  })
                  .map((c) => ({ value: c.id, label: t(`categories.${c.name}`, c.name) }))}
                value={formData.category_id}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  updateField('category_id', e.target.value)
                }
                placeholder={t('transactions.form.selectCategory')}
              />
            ) : (
              <p className="py-2 text-gray-900 dark:text-gray-100">
                {categories.find((c) => c.id === parseInt(formData.category_id))?.name || '-'}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="col-span-2">
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('transactions.form.description')}
            </label>
            {editMode ? (
              <Input
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateField('description', e.target.value)
                }
                placeholder={t('transactions.form.descriptionPlaceholder')}
              />
            ) : (
              <p className="py-2 text-gray-900 dark:text-gray-100">{formData.description || '-'}</p>
            )}
          </div>

          {/* Document No */}
          <div className="col-span-2">
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('transactions.form.documentNo')}
            </label>
            {editMode ? (
              <Input
                value={formData.document_no}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateField('document_no', e.target.value)
                }
                placeholder={t('transactions.form.documentPlaceholder')}
              />
            ) : (
              <p className="py-2 text-gray-900 dark:text-gray-100">{formData.document_no || '-'}</p>
            )}
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <div className="flex items-center justify-between w-full">
          <div>
            {editMode && (
              <Button variant="danger" icon={FiTrash2} onClick={onDelete}>
                {t('common.delete')}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={onClose}>
              {editMode ? t('common.cancel') : t('common.close')}
            </Button>
            {editMode && (
              <Button onClick={onSave}>
                {t('common.save')}
              </Button>
            )}
          </div>
        </div>
      </ModalFooter>
    </Modal>
  );
});
