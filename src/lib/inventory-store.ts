import { supabase } from './supabase';
import { Item, Transaction } from './types';

const SMART_UNITS_KEY = 'printstock_smart_units';

function mapItem(row: any): Item {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    category: row.category,
    baseUnit: row.base_unit,
    units: row.units || [],
    stock: row.stock,
    minStock: row.min_stock,
    icon: row.icon,
    createdAt: row.created_at,
  };
}

function mapTransaction(row: any): Transaction {
  return {
    id: row.id,
    itemId: row.item_id,
    itemName: row.item_name,
    type: row.type,
    quantity: row.quantity,
    unit: row.unit,
    baseQuantity: row.base_quantity,
    note: row.note,
    reference: row.reference,
    user: row.performed_by,
    timestamp: row.created_at,
  };
}

export async function getItems(): Promise<Item[]> {
  const { data, error } = await supabase.from('items').select('*').order('created_at');
  if (error) throw error;
  return (data || []).map(mapItem);
}

export async function addItem(item: Omit<Item, 'id' | 'createdAt'>): Promise<Item> {
  const { data, error } = await supabase.from('items').insert({
    name: item.name,
    sku: item.sku,
    category: item.category,
    base_unit: item.baseUnit,
    units: item.units,
    stock: item.stock,
    min_stock: item.minStock,
    icon: item.icon || 'Package',
  }).select().single();
  if (error) throw error;
  return mapItem(data);
}

export async function updateItem(id: string, updates: Partial<Item>): Promise<void> {
  const dbUpdates: Record<string, any> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.sku !== undefined) dbUpdates.sku = updates.sku;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.baseUnit !== undefined) dbUpdates.base_unit = updates.baseUnit;
  if (updates.units !== undefined) dbUpdates.units = updates.units;
  if (updates.stock !== undefined) dbUpdates.stock = updates.stock;
  if (updates.minStock !== undefined) dbUpdates.min_stock = updates.minStock;
  if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
  const { error } = await supabase.from('items').update(dbUpdates).eq('id', id);
  if (error) throw error;
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from('items').delete().eq('id', id);
  if (error) throw error;
}

export async function getTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase.from('transactions').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapTransaction);
}

export async function addTransaction(tx: Omit<Transaction, 'id' | 'timestamp'>): Promise<Transaction> {
  const { data, error } = await supabase.from('transactions').insert({
    item_id: tx.itemId,
    item_name: tx.itemName,
    type: tx.type,
    quantity: tx.quantity,
    unit: tx.unit,
    base_quantity: tx.baseQuantity,
    note: tx.note || null,
    reference: tx.reference || null,
    performed_by: tx.user,
  }).select().single();
  if (error) throw error;

  // Update item stock
  const { data: item } = await supabase.from('items').select('stock').eq('id', tx.itemId).single();
  if (item) {
    const newStock = tx.type === 'in'
      ? item.stock + tx.baseQuantity
      : Math.max(0, item.stock - tx.baseQuantity);
    await supabase.from('items').update({ stock: newStock }).eq('id', tx.itemId);
  }

  return mapTransaction(data);
}

// Smart Unit (UI preference, stays in localStorage)
export function getSmartUnit(itemId: string): string | null {
  const data = localStorage.getItem(SMART_UNITS_KEY);
  const map: Record<string, string> = data ? JSON.parse(data) : {};
  return map[itemId] || null;
}

export function setSmartUnit(itemId: string, unit: string): void {
  const data = localStorage.getItem(SMART_UNITS_KEY);
  const map: Record<string, string> = data ? JSON.parse(data) : {};
  map[itemId] = unit;
  localStorage.setItem(SMART_UNITS_KEY, JSON.stringify(map));
}
