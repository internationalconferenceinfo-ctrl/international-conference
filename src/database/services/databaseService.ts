import { getSupabaseClient, fetchFromSupabase, saveToSupabase, deleteFromSupabase, subscribeToSupabase } from "../supabase";

export const databaseService = {
  getClient: getSupabaseClient,
  fetchAll: fetchFromSupabase,
  save: saveToSupabase,
  delete: deleteFromSupabase,
  subscribe: subscribeToSupabase,
};

export default databaseService;
