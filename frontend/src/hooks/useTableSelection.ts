import { useState, useCallback, useMemo } from "react";

/**
 * Generic hook for table row selection with batch operations.
 * Supports select all, toggle individual, clear, and cross-page selection.
 */
export function useTableSelection<T extends { id: number }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const allIds = useMemo(() => new Set(items.map((i) => i.id)), [items]);

  const isAllSelected = useMemo(
    () => items.length > 0 && items.every((i) => selectedIds.has(i.id)),
    [items, selectedIds]
  );

  const isPartialSelected = useMemo(
    () => items.some((i) => selectedIds.has(i.id)) && !isAllSelected,
    [items, selectedIds, isAllSelected]
  );

  const selectedCount = useMemo(
    () => items.filter((i) => selectedIds.has(i.id)).length,
    [items, selectedIds]
  );

  const selectedItems = useMemo(
    () => items.filter((i) => selectedIds.has(i.id)),
    [items, selectedIds]
  );

  const toggle = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      const allCurrentSelected = items.every((i) => prev.has(i.id));
      if (allCurrentSelected) {
        // Deselect all current page items
        const next = new Set(prev);
        items.forEach((i) => next.delete(i.id));
        return next;
      } else {
        // Select all current page items
        const next = new Set(prev);
        items.forEach((i) => next.add(i.id));
        return next;
      }
    });
  }, [items]);

  const clear = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback(
    (id: number) => selectedIds.has(id),
    [selectedIds]
  );

  return {
    selectedIds,
    selectedCount,
    selectedItems,
    isAllSelected,
    isPartialSelected,
    toggle,
    toggleAll,
    clear,
    isSelected,
    hasSelection: selectedCount > 0,
  };
}
