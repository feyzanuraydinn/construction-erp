import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FiPlus,
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiPackage,
  FiArrowDownCircle,
  FiArrowUpCircle,
  FiAlertTriangle,
} from 'react-icons/fi';
import {
  Card,
  CardBody,
  Button,
  Input,
  Select,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  EmptyState,
  ConfirmDialog,
  Pagination,
  LoadingSpinner,
  Divider,
  TabGroup,
  SelectAllCheckbox,
  RowCheckbox,
} from '../components/ui';
import { MaterialModal, MovementModal } from '../components/modals';
import { useToast } from '../contexts/ToastContext';
import { useDebounce, useKeyboardShortcuts, usePagination, paginateArray, useSelection, useBulkDelete, getPaginationProps } from '../hooks';
import { formatCurrency, formatDate, formatNumber } from '../utils/formatters';
import { MATERIAL_CATEGORIES, MOVEMENT_TYPES } from '../utils/constants';
import type { Material, StockMovementWithDetails, Project, Company } from '../types';


function Stock() {
  const { t } = useTranslation();
  const toast = useToast();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [movements, setMovements] = useState<StockMovementWithDetails[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'materials' | 'movements'>('materials');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Material | null>(null);

  // Bulk selection & delete hooks for materials
  const { selectedIds: selectedMaterialIds, handleSelectAll: handleSelectAllMaterials, handleSelectOne: handleSelectOneMaterial, clearSelection: clearMaterialSelection } = useSelection();
  const { bulkDeleteConfirm: bulkDeleteMaterialConfirm, setBulkDeleteConfirm: setBulkDeleteMaterialConfirm, handleBulkDelete: handleBulkDeleteMaterials } = useBulkDelete({
    deleteFn: async (id) => { await window.electronAPI.material.delete(id); },
    entityKey: 'stock',
    onSuccess: () => { clearMaterialSelection(); loadData(); },
  });

  // Bulk selection & delete hooks for movements
  const { selectedIds: selectedMovementIds, handleSelectAll: handleSelectAllMovements, handleSelectOne: handleSelectOneMovement, clearSelection: clearMovementSelection } = useSelection();
  const { bulkDeleteConfirm: bulkDeleteMovementConfirm, setBulkDeleteConfirm: setBulkDeleteMovementConfirm, handleBulkDelete: handleBulkDeleteMovements } = useBulkDelete({
    deleteFn: async (id) => { await window.electronAPI.stock.delete(id); },
    entityKey: 'stock',
    onSuccess: () => { clearMovementSelection(); loadData(); },
  });

  // Keyboard shortcuts - Ctrl+N opens appropriate modal based on active tab
  useKeyboardShortcuts({
    onNew: () => {
      if (activeTab === 'materials') {
        setMaterialModalOpen(true);
      } else {
        setMovementModalOpen(true);
      }
    },
    onEscape: () => {
      if (materialModalOpen) {
        setMaterialModalOpen(false);
        setEditingMaterial(null);
      }
      if (movementModalOpen) {
        setMovementModalOpen(false);
      }
    },
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [materialsData, movementsData, projectsData, companiesData] = await Promise.all([
        window.electronAPI.material.getAll(),
        window.electronAPI.stock.getAll({}),
        window.electronAPI.project.getAll(),
        window.electronAPI.company.getAll(),
      ]);
      setMaterials(materialsData);
      setMovements(movementsData);
      setProjects(projectsData);
      setCompanies(companiesData);
    } catch (error) {
      console.error('Load error:', error);
      toast.error(t('common.loadError'));
    } finally {
      setLoading(false);
    }
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
    setMaterialModalOpen(false);
    setEditingMaterial(null);
    toast.success(isNew ? t('stock.materialCreateSuccess') : t('stock.materialUpdateSuccess'));
    loadData();
  };

  const handleMovementSave = (_isNew: boolean) => {
    setMovementModalOpen(false);
    toast.success(t('stock.movementSaveSuccess'));
    loadData();
  };


  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        m.code.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesCategory = !filterCategory || m.category === filterCategory;
      const matchesStatus =
        !filterStatus ||
        (filterStatus === 'low' && m.current_stock < m.min_stock) ||
        (filterStatus === 'ok' && m.current_stock >= m.min_stock);
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [materials, debouncedSearch, filterCategory, filterStatus]);

  // Pagination for materials
  const materialsPagination = usePagination({
    totalItems: filteredMaterials.length,
    initialPageSize: 25,
  });

  // Pagination for movements
  const movementsPagination = usePagination({
    totalItems: movements.length,
    initialPageSize: 25,
  });

  // Reset to first page when filters change
  useEffect(() => {
    materialsPagination.goToPage(1);
  }, [debouncedSearch, filterCategory, filterStatus]);

  const paginatedMaterials = useMemo(() => {
    return paginateArray(
      filteredMaterials,
      materialsPagination.currentPage,
      materialsPagination.pageSize
    );
  }, [filteredMaterials, materialsPagination.currentPage, materialsPagination.pageSize]);

  const paginatedMovements = useMemo(() => {
    return paginateArray(movements, movementsPagination.currentPage, movementsPagination.pageSize);
  }, [movements, movementsPagination.currentPage, movementsPagination.pageSize]);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('stock.title')}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('stock.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'materials' && selectedMaterialIds.size > 0 && (
            <>
              <Button variant="ghost-danger" size="sm" icon={FiTrash2} onClick={() => setBulkDeleteMaterialConfirm(true)}>
                {t('stock.bulkDeleteMaterials', { count: selectedMaterialIds.size })}
              </Button>
              <Divider />
            </>
          )}
          {activeTab === 'movements' && selectedMovementIds.size > 0 && (
            <>
              <Button variant="ghost-danger" size="sm" icon={FiTrash2} onClick={() => setBulkDeleteMovementConfirm(true)}>
                {t('stock.bulkDeleteMovements', { count: selectedMovementIds.size })}
              </Button>
              <Divider />
            </>
          )}
          <Button
            variant="secondary"
            icon={FiArrowDownCircle}
            onClick={() => setMovementModalOpen(true)}
          >
            {t('stock.stockMovement')}
          </Button>
          <Button icon={FiPlus} onClick={() => setMaterialModalOpen(true)}>
            {t('stock.newMaterial')}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <TabGroup
        tabs={[
          { key: 'materials', label: t('stock.materialsTab') },
          { key: 'movements', label: t('stock.movementsTab') },
        ]}
        activeTab={activeTab}
        onChange={(key) => setActiveTab(key as 'materials' | 'movements')}
        className="mb-6"
      />

      {activeTab === 'materials' && (
        <>
          {/* Filters */}
          <Card className="mb-6">
            <CardBody>
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    placeholder={t('stock.searchPlaceholder')}
                    icon={FiSearch}
                    value={search}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                  />
                </div>
                <div className="w-40">
                  <Select
                    options={MATERIAL_CATEGORIES}
                    value={filterCategory}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setFilterCategory(e.target.value)
                    }
                    placeholder={t('stock.filterCategory')}
                  />
                </div>
                <div className="w-40">
                  <Select
                    options={[
                      { value: 'low', label: t('stock.criticalStock') },
                      { value: 'ok', label: t('stock.normalStock') },
                    ]}
                    value={filterStatus}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setFilterStatus(e.target.value)
                    }
                    placeholder={t('stock.filterStatus')}
                  />
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Materials Table */}
          <Card>
            <CardBody className="p-0">
              {loading ? (
                <LoadingSpinner />
              ) : filteredMaterials.length === 0 ? (
                <EmptyState
                  icon={FiPackage}
                  title={t('stock.noMaterials')}
                  description={t('stock.noMaterialsDesc')}
                  action={() => setMaterialModalOpen(true)}
                  actionLabel={t('stock.newMaterial')}
                  actionIcon={FiPlus}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow hover={false}>
                      <TableHead className="w-10">
                        <SelectAllCheckbox
                          itemIds={paginatedMaterials.map(m => m.id)}
                          selectedIds={selectedMaterialIds}
                          onSelectAll={handleSelectAllMaterials}
                        />
                      </TableHead>
                      <TableHead>{t('stock.table.code')}</TableHead>
                      <TableHead>{t('stock.table.materialName')}</TableHead>
                      <TableHead>{t('stock.table.category')}</TableHead>
                      <TableHead>{t('stock.table.unit')}</TableHead>
                      <TableHead className="text-right">{t('stock.table.currentStock')}</TableHead>
                      <TableHead className="text-right">{t('stock.table.minStock')}</TableHead>
                      <TableHead className="text-center">{t('stock.table.status')}</TableHead>
                      <TableHead className="text-center">{t('stock.table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedMaterials.map((material) => {
                      const isLowStock = material.current_stock < material.min_stock;
                      return (
                        <TableRow
                          key={material.id}
                          selected={selectedMaterialIds.has(material.id)}
                        >
                          <TableCell>
                            <RowCheckbox
                              id={material.id}
                              selectedIds={selectedMaterialIds}
                              onSelectOne={handleSelectOneMaterial}
                            />
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm text-gray-500 dark:text-gray-400">{material.code}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{material.name}</span>
                          </TableCell>
                          <TableCell>
                            {t(MATERIAL_CATEGORIES.find((c) => c.value === material.category)?.label ?? '', material.category || '-')}
                          </TableCell>
                          <TableCell>{material.unit}</TableCell>
                          <TableCell
                            className={`text-right font-medium ${isLowStock ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}
                          >
                            {formatNumber(material.current_stock, 2)}
                          </TableCell>
                          <TableCell className="text-right text-gray-500 dark:text-gray-400">
                            {formatNumber(material.min_stock, 2)}
                          </TableCell>
                          <TableCell className="text-center">
                            {isLowStock ? (
                              <Badge variant="danger">
                                <FiAlertTriangle size={12} className="mr-1" /> {t('stock.table.critical')}
                              </Badge>
                            ) : (
                              <Badge variant="success">{t('stock.table.normal')}</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost-warning"
                                size="icon"
                                icon={FiEdit2}
                                onClick={() => {
                                  setEditingMaterial(material);
                                  setMaterialModalOpen(true);
                                }}
                                title={t('common.edit')}
                              />
                              <Button
                                variant="ghost-danger"
                                size="icon"
                                icon={FiTrash2}
                                onClick={() => setDeleteConfirm(material)}
                                title={t('common.delete')}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              {filteredMaterials.length > 0 && (
                <Pagination {...getPaginationProps(materialsPagination)} />
              )}
            </CardBody>
          </Card>
        </>
      )}

      {activeTab === 'movements' && (
        <Card>
          <CardBody className="p-0">
            {movements.length === 0 ? (
              <EmptyState
                icon={FiPackage}
                title={t('stock.noMovements')}
                action={() => setMovementModalOpen(true)}
                actionLabel={t('stock.newMovement')}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow hover={false}>
                    <TableHead className="w-10">
                      <SelectAllCheckbox
                        itemIds={paginatedMovements.map(m => m.id)}
                        selectedIds={selectedMovementIds}
                        onSelectAll={handleSelectAllMovements}
                      />
                    </TableHead>
                    <TableHead>{t('stock.table.date')}</TableHead>
                    <TableHead>{t('stock.table.type')}</TableHead>
                    <TableHead>{t('stock.table.material')}</TableHead>
                    <TableHead className="text-right">{t('stock.table.quantity')}</TableHead>
                    <TableHead>{t('stock.table.project')}</TableHead>
                    <TableHead>{t('stock.table.supplier')}</TableHead>
                    <TableHead className="text-right">{t('stock.table.amount')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedMovements.map((movement) => (
                    <TableRow
                      key={movement.id}
                      selected={selectedMovementIds.has(movement.id)}
                    >
                      <TableCell>
                        <RowCheckbox
                          id={movement.id}
                          selectedIds={selectedMovementIds}
                          onSelectOne={handleSelectOneMovement}
                        />
                      </TableCell>
                      <TableCell>{formatDate(movement.date)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            movement.movement_type === 'in'
                              ? 'success'
                              : movement.movement_type === 'out'
                                ? 'danger'
                                : 'warning'
                          }
                        >
                          {movement.movement_type === 'in' && (
                            <FiArrowDownCircle size={12} className="mr-1" />
                          )}
                          {movement.movement_type === 'out' && (
                            <FiArrowUpCircle size={12} className="mr-1" />
                          )}
                          {t(MOVEMENT_TYPES.find((mt) => mt.value === movement.movement_type)?.label ?? '', movement.movement_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{movement.material_name}</span>
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{movement.material_code}</span>
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          movement.movement_type === 'in' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {movement.movement_type === 'in' ? '+' : '-'}
                        {formatNumber(movement.quantity, 2)} {movement.material_unit}
                      </TableCell>
                      <TableCell>{movement.project_name || '-'}</TableCell>
                      <TableCell>{movement.company_name || '-'}</TableCell>
                      <TableCell className="text-right">
                        {movement.total_price ? formatCurrency(movement.total_price) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {movements.length > 0 && (
              <Pagination {...getPaginationProps(movementsPagination)} />
            )}
          </CardBody>
        </Card>
      )}

      {/* Material Modal */}
      <MaterialModal
        isOpen={materialModalOpen}
        onClose={() => {
          setMaterialModalOpen(false);
          setEditingMaterial(null);
        }}
        material={editingMaterial}
        onSave={handleMaterialSave}
      />

      {/* Movement Modal */}
      <MovementModal
        isOpen={movementModalOpen}
        onClose={() => setMovementModalOpen(false)}
        materials={materials}
        projects={projects}
        companies={companies}
        onSave={handleMovementSave}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteMaterial}
        title={t('stock.deleteTitle')}
        message={t('stock.deleteMessage', { name: deleteConfirm?.name })}
        type="danger"
        confirmText={t('common.delete')}
      />

      {/* Bulk Delete Materials Confirmation */}
      <ConfirmDialog
        isOpen={bulkDeleteMaterialConfirm}
        onClose={() => setBulkDeleteMaterialConfirm(false)}
        onConfirm={() => handleBulkDeleteMaterials(selectedMaterialIds)}
        title={t('stock.bulkDeleteTitle')}
        message={t('stock.bulkDeleteMaterialMessage', { count: selectedMaterialIds.size })}
        type="danger"
        confirmText={t('stock.bulkDeleteMaterialConfirm', { count: selectedMaterialIds.size })}
      />

      {/* Bulk Delete Movements Confirmation */}
      <ConfirmDialog
        isOpen={bulkDeleteMovementConfirm}
        onClose={() => setBulkDeleteMovementConfirm(false)}
        onConfirm={() => handleBulkDeleteMovements(selectedMovementIds)}
        title={t('stock.bulkDeleteTitle')}
        message={t('stock.bulkDeleteMovementMessage', { count: selectedMovementIds.size })}
        type="danger"
        confirmText={t('stock.bulkDeleteMovementConfirm', { count: selectedMovementIds.size })}
      />
    </div>
  );
}

export default Stock;
