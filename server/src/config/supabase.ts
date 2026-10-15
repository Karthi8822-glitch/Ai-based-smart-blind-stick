import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

let supabaseClient: SupabaseClient | null = null;
let isConnected = false;

if (supabaseUrl && supabaseKey) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  } catch (err) {
    console.warn('[Supabase] Failed to initialize client:', err);
  }
}

export const getSupabaseClient = (): SupabaseClient | null => supabaseClient;

export const checkSupabaseConnection = async (): Promise<boolean> => {
  if (!supabaseClient) {
    isConnected = false;
    return false;
  }

  try {
    const { data, error } = await supabaseClient.from('devices').select('device_id').limit(1);
    if (error) {
      console.warn(`[Supabase Notice] Query test failed: ${error.message}`);
      isConnected = false;
      return false;
    }
    isConnected = true;
    console.log(`[Supabase] Connected successfully to: ${supabaseUrl}`);
    return true;
  } catch (err: any) {
    console.warn(`[Supabase Notice] Connection check error: ${err.message}`);
    isConnected = false;
    return false;
  }
};

export const isSupabaseConnected = (): boolean => isConnected;
