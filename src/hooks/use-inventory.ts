import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getItems, addItem, updateItem, deleteItem, getTransactions, addTransaction } from '@/lib/inventory-store';
import { Item, Transaction } from '@/lib/types';

export function useItems() {
  return useQuery({ queryKey: ['items'], queryFn: getItems });
}

export function useTransactions() {
  return useQuery({ queryKey: ['transactions'], queryFn: getTransactions });
}

export function useAddItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (item: Omit<Item, 'id' | 'createdAt'>) => addItem(item),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Item> }) => updateItem(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteItem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });
}

export function useAddTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tx: Omit<Transaction, 'id' | 'timestamp'>) => addTransaction(tx),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['items'] });
    },
  });
}
