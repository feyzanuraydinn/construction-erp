import { useExchangeRates } from '../../hooks/useExchangeRates';
import { TransactionForm, type TransactionFormProps } from './transaction-modal/TransactionForm';

export interface TransactionModalProps extends Omit<TransactionFormProps, 'currentRates'> {
  isOpen: boolean;
}

export function TransactionModal({ isOpen, ...props }: TransactionModalProps) {
  const mode = props.mode ?? 'full';
  const currentRates = useExchangeRates(isOpen && mode !== 'simple');
  if (!isOpen) return null;
  return (
    <TransactionForm
      key={`${props.transaction?.id ?? 'new'}-${mode}`}
      {...props}
      currentRates={currentRates}
    />
  );
}
