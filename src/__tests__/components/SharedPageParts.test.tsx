import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, renderHook, act, within } from '@testing-library/react';
import { i18n } from '../../i18n';
import { PageActions, BulkDeleteAction } from '../../components/shared/PageActions';
import { ListFilterBar } from '../../components/shared/ListFilterBar';
import { CrudListDialogs } from '../../components/shared/CrudListDialogs';
import { useRelatedDeleteConfirm } from '../../hooks/useRelatedDeleteConfirm';

describe('PageActions', () => {
  it('shows print only when the page can print', () => {
    const handlers = { onExport: vi.fn(), onShare: vi.fn(), onNew: vi.fn() };
    const { rerender } = render(<PageActions {...handlers} newLabel="Yeni Cari" />);
    expect(screen.queryByText('Yazdır')).not.toBeInTheDocument();

    const onPrint = vi.fn();
    rerender(<PageActions {...handlers} onPrint={onPrint} newLabel="Yeni Cari" />);
    fireEvent.click(screen.getByText('Yazdır'));
    fireEvent.click(screen.getByText('Yeni Cari'));
    fireEvent.click(screen.getByText("Excel'e Aktar"));

    expect(onPrint).toHaveBeenCalledOnce();
    expect(handlers.onNew).toHaveBeenCalledOnce();
    expect(handlers.onExport).toHaveBeenCalledOnce();
  });
});

describe('BulkDeleteAction', () => {
  it('appears only while something is selected', () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <BulkDeleteAction count={0} label="Sil (0)" onClick={onClick} divider="before" />
    );
    expect(screen.queryByText('Sil (0)')).not.toBeInTheDocument();

    rerender(<BulkDeleteAction count={2} label="Sil (2)" onClick={onClick} divider="before" />);
    fireEvent.click(screen.getByText('Sil (2)'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe('ListFilterBar', () => {
  it('passes search and filter changes back', () => {
    const onSearch = vi.fn();
    const onType = vi.fn();
    render(
      <ListFilterBar
        search=""
        onSearch={onSearch}
        searchPlaceholder="Cari ara..."
        filters={[
          {
            value: '',
            onChange: onType,
            options: [{ value: 'person', label: 'Şahıs' }],
            placeholder: 'Tür',
          },
        ]}
      />
    );
    fireEvent.change(screen.getByPlaceholderText('Cari ara...'), { target: { value: 'ayşe' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'person' } });

    expect(onSearch).toHaveBeenCalledWith('ayşe');
    expect(onType).toHaveBeenCalledWith('person');
  });
});

describe('useRelatedDeleteConfirm', () => {
  it('asks with related counts, clears them on cancel and after deleting', async () => {
    const crud = { setDeleteConfirm: vi.fn(), handleDelete: vi.fn().mockResolvedValue(undefined) };
    const fetchRelated = vi.fn().mockResolvedValue({ transactionCount: 3 });
    const { result } = renderHook(() => useRelatedDeleteConfirm(crud, fetchRelated));

    await act(async () => {
      await result.current.ask({ id: 7 });
    });
    expect(crud.setDeleteConfirm).toHaveBeenCalledWith({ id: 7 });
    expect(fetchRelated).toHaveBeenCalledWith(7);
    expect(result.current.related).toEqual({ transactionCount: 3 });

    await act(async () => {
      await result.current.confirm();
    });
    expect(crud.handleDelete).toHaveBeenCalledOnce();
    expect(result.current.related).toBeNull();

    await act(async () => {
      await result.current.ask({ id: 8 });
    });
    act(() => result.current.cancel());
    expect(crud.setDeleteConfirm).toHaveBeenLastCalledWith(null);
    expect(result.current.related).toBeNull();
  });

  it('still asks when the related counts cannot be loaded', async () => {
    const crud = { setDeleteConfirm: vi.fn(), handleDelete: vi.fn() };
    const { result } = renderHook(() =>
      useRelatedDeleteConfirm(crud, vi.fn().mockRejectedValue(new Error('x')))
    );

    await act(async () => {
      await result.current.ask({ id: 1 });
    });

    expect(crud.setDeleteConfirm).toHaveBeenCalledWith({ id: 1 });
    expect(result.current.related).toBeNull();
  });
});

describe('CrudListDialogs', () => {
  function crudState(overrides: Partial<Parameters<typeof CrudListDialogs>[0]['crud']> = {}) {
    return {
      deleteConfirm: null,
      bulkDeleteConfirm: false,
      setBulkDeleteConfirm: vi.fn(),
      handleBulkDelete: vi.fn().mockResolvedValue(undefined),
      selectedIds: new Set([4, 7]),
      exportPreviewOpen: false,
      setExportPreviewOpen: vi.fn(),
      exportPreviewData: [],
      handleExport: vi.fn(),
      ...overrides,
    };
  }

  it('asks with the page wording before deleting the selected records', () => {
    const crud = crudState({ bulkDeleteConfirm: true });
    render(
      <CrudListDialogs
        crud={crud}
        keyPrefix="projects"
        deleteMessage=""
        onCancelDelete={vi.fn()}
        onConfirmDelete={vi.fn()}
      />
    );

    const dialog = screen.getByRole('alertdialog');
    expect(
      within(dialog).getByText(i18n.t('projects.bulkDeleteMessage', { count: 2 }))
    ).toBeInTheDocument();
    fireEvent.click(
      within(dialog).getByRole('button', {
        name: i18n.t('projects.bulkDeleteConfirm', { count: 2 }),
      })
    );

    expect(crud.handleBulkDelete).toHaveBeenCalledOnce();
  });

  it('shows the single delete message and reports a cancel', () => {
    const onCancelDelete = vi.fn();
    const onConfirmDelete = vi.fn();
    render(
      <CrudListDialogs
        crud={crudState({ deleteConfirm: { id: 4 } })}
        keyPrefix="companies"
        deleteMessage="Demir Tedarik silinsin mi?"
        onCancelDelete={onCancelDelete}
        onConfirmDelete={onConfirmDelete}
      />
    );

    const dialog = screen.getByRole('alertdialog', { name: i18n.t('companies.deleteTitle') });
    expect(within(dialog).getByText('Demir Tedarik silinsin mi?')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: i18n.t('common.cancel') }));

    expect(onCancelDelete).toHaveBeenCalledOnce();
    expect(onConfirmDelete).not.toHaveBeenCalled();
  });
});
