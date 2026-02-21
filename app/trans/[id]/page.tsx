import { Metadata } from "next";
import { fetchPublicacionesByZona } from "@/lib/queryPublicaciones";
import PerfilView from "@/app/components/PerfilView";
import ListadoGrid from "@/app/components/ListadoGrid";
import SeoLocationsBlock from "@/app/components/SeoLocationsBlock";
import LegalFooter from "@/app/components/legal/LegalFooter";
import CategoryTabs from "@/app/components/CategoryTabs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function slugToName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (UUID_RE.test(id)) return {};

  const zona = slugToName(id);
  return {
    title: `Escorts en ${zona} | VIAVIP`,
    description: `Escorts en ${zona}. Perfiles disponibles, fotos y contacto directo. VIAVIP Uruguay.`,
    alternates: { canonical: `/trans/${id}` },
  };
}

export default async function TransIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (UUID_RE.test(id)) {
    return (
      <PerfilView category="trans">
        <SeoLocationsBlock basePath="/trans" categoria="trans" />
      </PerfilView>
    );
  }

  const zona = slugToName(id);
  const { items, count, error } = await fetchPublicacionesByZona(id, "trans");

  return (
    <main>
      <CategoryTabs />
      <div className="vv-zona-header">
        <h1 className="vv-zona-title">Escorts en {zona}</h1>
        <p className="vv-zona-subtitle">
          Perfiles verificados y actualizados. Elegi tu zona y encontra
          disponibles.
        </p>
      </div>

      {error ? (
        <div className="vv-zona-empty">
          <p>Error cargando perfiles. Intenta de nuevo.</p>
        </div>
      ) : count > 0 ? (
        <ListadoGrid items={items} basePath="/trans" />
      ) : (
        <div className="vv-zona-empty">
          <p>No hay perfiles en esta zona por ahora.</p>
        </div>
      )}

      {count <= 6 && <SeoLocationsBlock basePath="/trans" categoria="trans" />}

      <LegalFooter />
    </main>
  );
}
