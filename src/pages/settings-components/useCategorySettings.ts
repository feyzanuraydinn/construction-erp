import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../contexts/ToastContext';
import { useLoadedData } from '../../hooks/useLoadedData';
import { NO_ITEMS } from '../../utils/emptyList';
import { EMPTY_NEW_CATEGORY, type NewCategory } from './settingsOptions';

const loadCategories = () => window.electronAPI.category.getAll();

export function useCategorySettings() {
  const { t } = useTranslation();
  const toast = useToast();
  const { data, reload } = useLoadedData(loadCategories, 'Categories load error:');
  const categories = data ?? NO_ITEMS;
  const [newCategory, setNewCategory] = useState<NewCategory>(EMPTY_NEW_CATEGORY);
  const [deleteCategoryId, setDeleteCategoryId] = useState<number | null>(null);

  const addCategory = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { name, type, color } = newCategory;
    if (!name.trim() || !type) return;

    try {
      await window.electronAPI.category.create({ name, type, color });
      setNewCategory(EMPTY_NEW_CATEGORY);
      reload();
    } catch (error) {
      console.error('Category create error:', error);
      toast.error(t('common.categoryCreateError'));
    }
  };

  const confirmDelete = async () => {
    if (deleteCategoryId === null) return;
    try {
      await window.electronAPI.category.delete(deleteCategoryId);
      reload();
    } catch (error) {
      console.error('Category delete error:', error);
      toast.error(t('common.categoryDeleteError'));
    } finally {
      setDeleteCategoryId(null);
    }
  };

  return {
    categories,
    newCategory,
    setNewCategory,
    addCategory,
    deleteCategoryId,
    setDeleteCategoryId,
    confirmDelete,
  };
}
