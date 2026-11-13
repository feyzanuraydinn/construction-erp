import { useState } from 'react';

interface DeleteTarget<T> {
  setDeleteConfirm: (item: T | null) => void;
  handleDelete: () => Promise<void>;
}

export function useRelatedDeleteConfirm<T extends { id: number }, R>(
  crud: DeleteTarget<T>,
  fetchRelated: (id: number) => Promise<R>
) {
  const [related, setRelated] = useState<R | null>(null);

  const ask = async (item: T) => {
    crud.setDeleteConfirm(item);
    try {
      setRelated(await fetchRelated(item.id));
    } catch {
      setRelated(null);
    }
  };

  const cancel = () => {
    crud.setDeleteConfirm(null);
    setRelated(null);
  };

  const confirm = async () => {
    await crud.handleDelete();
    setRelated(null);
  };

  return { related, ask, cancel, confirm };
}
