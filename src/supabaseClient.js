// Supabase client initialization
// Expect environment variables:
// VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (only anon key safe for client)
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = (url && anon) ? createClient(url, anon, {
	auth: { persistSession: true, autoRefreshToken: true },
	db: { schema: 'public' }
}) : null;

export function ensureSupabase() {
	if(!supabase) throw new Error('Supabase no configurado. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.');
	return supabase;
}

// Helper generic fetchers
export async function fetchAll(table){
	const sb = ensureSupabase();
	const { data, error } = await sb.from(table).select('*');
	if(error) throw error; return data;
}

export async function upsert(table, rows){
	const sb = ensureSupabase();
	const { data, error } = await sb.from(table).upsert(rows).select();
	if(error) throw error; return data;
}

export async function removeByIds(table, ids){
	const sb = ensureSupabase();
	const { error } = await sb.from(table).delete().in('id', ids);
	if(error) throw error; return true;
}

// Delete all rows of a table (dev/reset) by batching IDs to evitar errores de casteo uuid
export async function clearTable(table){
	const sb = ensureSupabase();
	// Obtener solo los IDs (hasta 10k; si necesitas más, paginar)
	const { data, error } = await sb.from(table).select('id');
	if(error) throw error;
	if(!Array.isArray(data) || !data.length) return true;
	const ids = data.map(r=> r.id).filter(Boolean);
	const chunkSize = 500;
	for(let i=0;i<ids.length;i+=chunkSize){
		const chunk = ids.slice(i,i+chunkSize);
		const { error: delErr } = await sb.from(table).delete().in('id', chunk);
		if(delErr) throw delErr;
	}
	return true;
}
