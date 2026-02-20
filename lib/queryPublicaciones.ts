import { getSupabasePublicClient } from "@/lib/supabasePublic";
import { getPlanConfig } from "@/lib/plans";
import type { Filtros } from "@/lib/filters";

export interface PublicacionItem {
  id: string | number;
  nombre?: string;
  edad?: number;
  departamento?: string;
  zona?: string;
  cover_url?: string;
  fotos?: string[];
  rating?: number;
  disponible?: boolean;
  tarifa_hora?: number;
  altura_cm?: number;
  servicios?: string[];
  atiende_en?: string[];
  user_id?: string;
  plan_actual?: string;
}

export async function fetchPublicaciones(
  categoria: "mujer" | "hombre" | "trans",
  filtros: Filtros
): Promise<{ items: PublicacionItem[]; count: number; error?: string }> {
  const supabase = getSupabasePublicClient();
  if (!supabase) return { items: [], count: 0, error: "Error de configuracion." };

  try {
    let query = supabase
      .from("publicaciones")
      .select("id,nombre,edad,departamento,zona,cover_url,fotos,rating,disponible,tarifa_hora,altura_cm,servicios,atiende_en,user_id")
      .eq("estado", "activa")
      .eq("categoria", categoria);

    if (filtros.dep) {
      query = query.eq("departamento", filtros.dep);
    }
    if (filtros.servicios.length > 0) {
      query = query.contains("servicios", filtros.servicios);
    }
    if (filtros.atiende_en.length > 0) {
      query = query.contains("atiende_en", filtros.atiende_en);
    }

    query = query
      .gte("edad", filtros.edad_min)
      .lte("edad", filtros.edad_max);

    if (filtros.tar_min > 0) {
      query = query.gte("tarifa_hora", filtros.tar_min);
    }
    if (filtros.tar_max < 100000) {
      query = query.lte("tarifa_hora", filtros.tar_max);
    }

    query = query
      .gte("altura_cm", filtros.alt_min)
      .lte("altura_cm", filtros.alt_max);

    query = query.order("id", { ascending: false });

    const { data: pubs, error: pubError } = await query;

    if (pubError) {
      return { items: [], count: 0, error: pubError.message };
    }

    const pubList = (pubs || []) as PublicacionItem[];
    const userIds = pubList.map((p) => p.user_id).filter(Boolean) as string[];

    let planMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, plan_actual, plan_estado")
        .in("id", userIds);

      if (profiles) {
        for (const p of profiles) {
          planMap[p.id] = p.plan_estado === "activo" ? (p.plan_actual || "free") : "free";
        }
      }
    }

    const items = pubList.map((p) => ({
      ...p,
      plan_actual: p.user_id ? planMap[p.user_id] || "free" : "free",
    }));

    items.sort((a, b) => {
      const pa = getPlanConfig(a.plan_actual).ranking_priority;
      const pb = getPlanConfig(b.plan_actual).ranking_priority;
      if (pb !== pa) return pb - pa;
      const da = a.disponible !== false ? 1 : 0;
      const db = b.disponible !== false ? 1 : 0;
      if (db !== da) return db - da;
      return (b.rating || 0) - (a.rating || 0);
    });

    return { items, count: items.length };
  } catch (err: unknown) {
    return { items: [], count: 0, error: err instanceof Error ? err.message : "Error desconocido" };
  }
}
