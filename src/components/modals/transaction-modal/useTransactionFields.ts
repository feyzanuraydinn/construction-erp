import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  Currency,
  ExchangeRates,
  TransactionType,
  TransactionWithDetails,
} from '../../../types';
import { initialFormData, ownRateFor, type TransactionModalFormState } from './formState';

export type TransactionFieldsState = ReturnType<typeof useTransactionFields>;

export function useTransactionFields(
  transaction: TransactionWithDetails | null,
  isSimple: boolean,
  currentRates: ExchangeRates | null
) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState(() => initialFormData(transaction, isSimple));
  const [rateError, setRateError] = useState<string | null>(null);
  const currentRate =
    currentRates && formData.currency !== 'TRY' ? currentRates[formData.currency] : null;
  const rateText =
    formData.exchange_rate !== '' || currentRate === null
      ? formData.exchange_rate
      : String(currentRate);
  const exchangeRate = isSimple || formData.currency === 'TRY' ? 1 : parseFloat(rateText);

  const updateField = <K extends keyof TransactionModalFormState>(
    field: K,
    value: TransactionModalFormState[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const changeCurrency = (currency: Currency) => {
    setRateError(null);
    setFormData((prev) => ({
      ...prev,
      currency,
      exchange_rate: ownRateFor(transaction, currency),
    }));
  };

  const changeRate = (value: string) => {
    setRateError(null);
    updateField('exchange_rate', value);
  };

  const applyCurrentRate = () => {
    if (currentRate !== null) updateField('exchange_rate', String(currentRate));
  };

  const changeType = (type: TransactionType) => {
    setFormData((prev) => ({ ...prev, type, category_id: '' }));
  };

  const validateRate = (): boolean => {
    const valid = exchangeRate > 0;
    setRateError(valid ? null : t('validation.exchangeRateRequired'));
    return valid;
  };

  return {
    formData,
    updateField,
    currentRate,
    rateText,
    rateError,
    exchangeRate,
    changeCurrency,
    changeRate,
    applyCurrentRate,
    changeType,
    validateRate,
  };
}
