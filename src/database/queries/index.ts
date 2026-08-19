import { fetchFromSupabase, saveToSupabase, deleteFromSupabase } from "../supabase";

export async function fetchAllRecords<T>(tableName: string): Promise<T[]> {
  const data = await fetchFromSupabase<T>(tableName);
  return data as T[];
}

export async function saveRecord<T extends { id: string }>(tableName: string, record: T): Promise<boolean> {
  return await saveToSupabase(tableName, record);
}

export async function deleteRecord(tableName: string, id: string): Promise<boolean> {
  return await deleteFromSupabase(tableName, id);
}
