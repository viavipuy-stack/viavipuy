"use server";

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getServerSupabase } from "./supabaseServer";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any, any, any>;

export async function getAuthenticatedAdmin(): Promise<{
  adminId: string;
  serviceClient: AnySupabase;
} | null> {
  const serverSupabase = await getServerSupabase();
  if (!serverSupabase) return null;

  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user) return null;

  const serviceClient = getServiceClient();
  if (!serviceClient) return null;

  const { data: profile } = await serviceClient
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.rol !== "admin") return null;

  return { adminId: user.id, serviceClient };
}

export async function logAudit(
  supabase: AnySupabase,
  adminId: string,
  action: string,
  targetTable: string,
  targetId: string,
  details?: Record<string, unknown>,
) {
  try {
    await supabase.from("admin_audit").insert({
      admin_id: adminId,
      action,
      target_table: targetTable,
      target_id: targetId,
      details: details || {},
    });
  } catch {
    // audit logging should never block the main operation
  }
}
