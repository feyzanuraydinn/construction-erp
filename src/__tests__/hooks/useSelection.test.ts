import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSelection } from '../../hooks/useSelection';

describe('useSelection Hook', () => {
  it('should start with empty selection', () => {
    const { result } = renderHook(() => useSelection());
    expect(result.current.selectedIds.size).toBe(0);
  });

  describe('handleSelectOne', () => {
    it('should add an id when checked', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.handleSelectOne(1, true);
      });

      expect(result.current.selectedIds.has(1)).toBe(true);
      expect(result.current.selectedIds.size).toBe(1);
    });

    it('should remove an id when unchecked', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.handleSelectOne(1, true);
        result.current.handleSelectOne(2, true);
      });

      act(() => {
        result.current.handleSelectOne(1, false);
      });

      expect(result.current.selectedIds.has(1)).toBe(false);
      expect(result.current.selectedIds.has(2)).toBe(true);
      expect(result.current.selectedIds.size).toBe(1);
    });

    it('should handle selecting the same id twice', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.handleSelectOne(5, true);
        result.current.handleSelectOne(5, true);
      });

      expect(result.current.selectedIds.size).toBe(1);
    });
  });

  describe('handleSelectAll', () => {
    it('should select all provided ids when checked', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.handleSelectAll([1, 2, 3, 4, 5], true);
      });

      expect(result.current.selectedIds.size).toBe(5);
      expect(result.current.selectedIds.has(1)).toBe(true);
      expect(result.current.selectedIds.has(5)).toBe(true);
    });

    it('should deselect all when unchecked', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.handleSelectAll([1, 2, 3], true);
      });
      expect(result.current.selectedIds.size).toBe(3);

      act(() => {
        result.current.handleSelectAll([1, 2, 3], false);
      });
      expect(result.current.selectedIds.size).toBe(0);
    });

    it('should replace previous selection', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.handleSelectOne(10, true);
      });

      act(() => {
        result.current.handleSelectAll([1, 2], true);
      });

      // Previous selection (10) should be replaced
      expect(result.current.selectedIds.has(10)).toBe(false);
      expect(result.current.selectedIds.size).toBe(2);
    });
  });

  describe('clearSelection', () => {
    it('should clear all selections', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.handleSelectAll([1, 2, 3, 4], true);
      });
      expect(result.current.selectedIds.size).toBe(4);

      act(() => {
        result.current.clearSelection();
      });
      expect(result.current.selectedIds.size).toBe(0);
    });
  });

  describe('handleSelectAll with empty array', () => {
    it('should result in empty selection when selecting empty array', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.handleSelectAll([], true);
      });
      expect(result.current.selectedIds.size).toBe(0);
    });
  });
});
