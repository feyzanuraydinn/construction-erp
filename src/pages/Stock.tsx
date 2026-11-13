import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { TabGroup } from '../components/ui/TabGroup';
import { MaterialModal } from '../components/modals/MaterialModal';
import { MovementModal } from '../components/modals/MovementModal';
import { MaterialDetailView } from '../components/shared/MaterialDetailView';
import { useToast } from '../contexts/ToastContext';
import { useDebounce } from '../hooks/useDebounce';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { usePaginatedItems } from '../hooks/usePagination';
import { useBulkSelection } from '../hooks/useBulkSelection';
import type { Material } from '../types';
import { useLoadedData } from '../hooks/useLoadedData';
import { NO_ITEMS } from '../utils/emptyList';
import { PageHeader } from '../components/shared/PageHeader';
import type { StockTab } from './stock-components/stockBulkDelete';
import { StockHeaderActions } from './stock-components/StockHeaderActions';
import { StockBulkDeleteDialog } from './stock-components/StockBulkDeleteDialog';
import { MaterialsCard } from './stock-components/MaterialsCard';
import { MovementsCard } from './stock-components/MovementsCard';
import { MaterialFilterBar } from './stock-components/MaterialFilterBar';
import { filterMaterials } from './stock-components/materialFilters';

const loadStockPage = () =>
  Promise.all([
    window.electronAPI.material.getAll(),
    window.electronAPI.stock.getAll({}),
    window.electronAPI.project.getAll(),
    window.electronAPI.company.getAll(),
  ]).then(([materials, movements, projects, companies]) => ({
    materials,
    movements,
    projects,
    companies,
  }));

function Stock() {
  const { t } = useTranslation();
  const toast = useToast();
  const { data, loading, reload: loadData } = useLoadedData(loadStockPage, 'Stock load error:');
  const materials = data?.materials ?? NO_ITEMS;
  const movements = data?.movements ?? NO_ITEMS;
  const projects = data?.projects ?? NO_ITEMS;
  const companies = data?.companies ?? NO_ITEMS;
  const [activeTab, setActiveTab] = useState<StockTab>('materials');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Material | null>(null);
  const [detailMaterial, setDetailMaterial] = useState<Material | null>(null);

  useKeyboardShortcuts({
    onNew: () => {
      if (activeTab === 'materials') {
        setMaterialModalOpen(true);
      } else {
        setMovementModalOpen(true);
      }
    },
  });

  const openMaterialEditor = (material: Material) => {
    setEditingMaterial(material);
    setMaterialModalOpen(true);
  };

  const closeMaterialModal = () => {
    setMaterialModalOpen(false);
    setEditingMaterial(null);
  };

  const handleDeleteMaterial = async () => {
    if (!deleteConfirm) return;
    try {
      await window.electronAPI.material.delete(deleteConfirm.id);
      setDeleteConfirm(null);
      toast.success(t('stock.materialDeleteSuccess'));
      loadData();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(t('common.deleteError'));
    }
  };

  const handleMaterialSave = (isNew: boolean) => {
    closeMaterialModal();
    toast.success(isNew ? t('stock.materialCreateSuccess') : t('stock.materialUpdateSuccess'));
    loadData();
  };

  const handleMovementSave = () => {
    setMovementModalOpen(false);
    toast.success(t('stock.movementSaveSuccess'));
    loadData();
  };

  const filteredMaterials = useMemo(
    () => filterMaterials(materials, debouncedSearch, filterCategory, filterStatus),
    [materials, debouncedSearch, filterCategory, filterStatus]
  );

  const materialSelection = useBulkSelection({
    visibleItems: filteredMaterials,
    deleteFn: (id) => window.electronAPI.material.delete(id),
    entityKey: 'stock',
    successKey: 'stock.bulkDeleteMaterialSuccess',
    onDeleted: loadData,
  });

  const movementSelection = useBulkSelection({
    visibleItems: movements,
    deleteFn: (id) => window.electronAPI.stock.delete(id),
    entityKey: 'stock',
    successKey: 'stock.bulkDeleteMovementSuccess',
    onDeleted: loadData,
  });

  const { pagination: materialsPagination, pageItems: paginatedMaterials } = usePaginatedItems(
    filteredMaterials,
    JSON.stringify([debouncedSearch, filterCategory, filterStatus])
  );
  const { pagination: movementsPagination, pageItems: paginatedMovements } = usePaginatedItems(
    movements,
    ''
  );

  return (
    <div className="page-container">
      <PageHeader title={t('stock.title')} subtitle={t('stock.subtitle')}>
        <StockHeaderActions
          activeTab={activeTab}
          selection={activeTab === 'materials' ? materialSelection : movementSelection}
          onNewMovement={() => setMovementModalOpen(true)}
          onNewMaterial={() => setMaterialModalOpen(true)}
        />
      </PageHeader>

      <TabGroup
        tabs={[
          { key: 'materials', label: t('stock.materialsTab') },
          { key: 'movements', label: t('stock.movementsTab') },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
        className="mb-6"
      />

      {activeTab === 'materials' && (
        <>
          <MaterialFilterBar
            search={search}
            onSearch={setSearch}
            category={filterCategory}
            onCategoryChange={setFilterCategory}
            status={filterStatus}
            onStatusChange={setFilterStatus}
          />

          <MaterialsCard
            loading={loading}
            materials={paginatedMaterials}
            totalCount={filteredMaterials.length}
            pagination={materialsPagination}
            selection={materialSelection}
            onNew={() => setMaterialModalOpen(true)}
            onOpen={setDetailMaterial}
            onEdit={openMaterialEditor}
            onDelete={setDeleteConfirm}
          />
        </>
      )}

      {activeTab === 'movements' && (
        <MovementsCard
          loading={loading}
          movements={paginatedMovements}
          totalCount={movements.length}
          pagination={movementsPagination}
          selection={movementSelection}
          onNew={() => setMovementModalOpen(true)}
        />
      )}

      <MaterialModal
        isOpen={materialModalOpen}
        onClose={closeMaterialModal}
        material={editingMaterial}
        onSave={handleMaterialSave}
      />

      <MovementModal
        isOpen={movementModalOpen}
        onClose={() => setMovementModalOpen(false)}
        materials={materials}
        projects={projects}
        companies={companies}
        onSave={handleMovementSave}
      />

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteMaterial}
        title={t('stock.deleteTitle')}
        message={t('stock.deleteMessage', { name: deleteConfirm?.name })}
        type="danger"
        confirmText={t('common.delete')}
      />

      <StockBulkDeleteDialog tab="materials" selection={materialSelection} />

      <StockBulkDeleteDialog tab="movements" selection={movementSelection} />

      <MaterialDetailView
        material={detailMaterial}
        onClose={() => setDetailMaterial(null)}
        onEdit={openMaterialEditor}
      />
    </div>
  );
}

export default Stock;
