import { parseSearchParams, hasActiveFilters } from "@/lib/filters";
import { fetchPublicaciones } from "@/lib/queryPublicaciones";
import { getSupabasePublicClient } from "@/lib/supabasePublic";
import CategoryTabs from "@/app/components/CategoryTabs";
import TrustBlock from "@/app/components/TrustBlock";
import CollapsibleText from "@/app/components/CollapsibleText";
import DestacadasDiamante from "@/app/components/DestacadasDiamante";
import ListadoFiltered from "@/app/components/ListadoFiltered";

export default async function TransPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filtros = parseSearchParams(params);
  const { items, count, error } = await fetchPublicaciones("trans", filtros);

  let serviciosOptions: string[] = [];
  try {
    const supabase = getSupabasePublicClient();
    if (supabase) {
      const { data } = await supabase
        .from("publicaciones")
        .select("servicios")
        .eq("estado", "activa")
        .eq("categoria", "trans")
        .not("servicios", "is", null);
      if (data) {
        const set = new Set<string>();
        data.forEach((row: { servicios: string[] | null }) => {
          if (row.servicios) row.servicios.forEach((s: string) => set.add(s));
        });
        serviciosOptions = Array.from(set).sort();
      }
    }
  } catch {}

  if (error) {
    return (
      <main>
        <CategoryTabs />
        <TrustBlock />
        <div className="vv-empty">Error: {error}</div>
      </main>
    );
  }

  return (
    <main>
      <CategoryTabs />
      <TrustBlock />
      <CollapsibleText expandedText="VIAVIP es la plataforma premium de acompanantes en Uruguay. Cada perfil es verificado para garantizar autenticidad y seguridad. Navega con confianza, contacta directamente y vive una experiencia exclusiva." />
      <DestacadasDiamante categoria="trans" />
      <ListadoFiltered
        items={items}
        count={count}
        filtros={filtros}
        basePath="/trans"
        hasFilters={hasActiveFilters(filtros)}
        serviciosOptions={serviciosOptions}
      />
    </main>
  );
}
