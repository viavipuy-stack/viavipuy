import { getSupabase } from "@/lib/supabaseClient";

export async function pingActividad(): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return false;

  const { error } = await supabase
    .from("publicaciones")
    .update({ ultima_actividad: new Date().toISOString() })
    .eq("user_id", userId);

  return !error;
}

export async function updateDisponible(value: boolean): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return false;

  const { error } = await supabase
    .from("publicaciones")
    .update({
      disponible: value,
      ultima_actividad: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return !error;
}
