import { useSaveAction } from '../../../hooks/useSaveAction';
import { saveTransaction, type SaveTransactionParams } from './saveTransaction';

export function useTransactionSave(onSave: (isNew: boolean) => void) {
  const { saving, runSave } = useSaveAction('transactionModal.saveError');

  const save = (params: SaveTransactionParams) =>
    runSave(async () => {
      await saveTransaction(params);
      onSave(!params.transaction);
    });

  return { saving, save };
}
