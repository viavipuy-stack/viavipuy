"use client";

import { useMemo, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getPlanConfig } from "@/lib/plans";
import { fixStorageUrl } from "@/lib/fixStorageUrl";
import { useFavoritos } from "@/hooks/useFavoritos";
import FavoritoButton from "./FavoritoButton";
import MiniPreview from "./MiniPreview";

interface Publicacion {
  id: string | number;
  nombre?: string;
  edad?: number;
  zona?: string;
  ciudad?: string;
  cover_url?: string;
  fotos?: string[];
  disponible?: boolean;
  rating?: number;
  plan_actual?: string;
}

function StarIcon() {
  return <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>;
}

function PlanBadge({ planId, hasDisponible }: { planId: string; hasDisponible: boolean }) {
  if (!planId || planId === "free") return null;
  const config = getPlanConfig(planId);
  return (
    <div
      className="vv-card-plan-badge"
      style={{ background: config.badge_bg, color: config.badge_text, top: hasDisponible ? 32 : 8 }}
    >
      {config.name}
    </div>
  );
}

function useIsMobile() {
  const ref = useRef<boolean | null>(null);
  if (ref.current === null && typeof window !== "undefined") {
    ref.current = window.matchMedia("(pointer: coarse)").matches;
  }
  return ref.current ?? false;
}

interface ListadoGridProps {
  items: Publicacion[];
  basePath: string;
}

export default function ListadoGrid({ items, basePath }: ListadoGridProps) {
  const ids = useMemo(() => items.map((i) => String(i.id)), [items]);
  const { favSet, toggleFavorito, loadingIds } = useFavoritos(ids);
  const isMobile = useIsMobile();
  const router = useRouter();

  const [previewData, setPreviewData] = useState<{
    fotos: string[];
    nombre: string;
    profileUrl: string;
  } | null>(null);

  const openPreview = useCallback((item: Publicacion) => {
    const fotos = item.fotos || [];
    if (fotos.length === 0) return false;
    setPreviewData({
      fotos,
      nombre: item.nombre || "Sin nombre",
      profileUrl: `${basePath}/${item.id}`,
    });
    return true;
  }, [basePath]);

  const closePreview = useCallback(() => setPreviewData(null), []);

  const handleCardClick = useCallback((e: React.MouseEvent, item: Publicacion) => {
    if (!isMobile) return;
    const fotos = item.fotos || [];
    if (fotos.length === 0) {
      router.push(`${basePath}/${item.id}`);
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    openPreview(item);
  }, [isMobile, openPreview, basePath, router]);

  const handleDesktopCardClick = useCallback((e: React.MouseEvent, item: Publicacion) => {
    if (isMobile) return;
    const fotos = item.fotos || [];
    if (fotos.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      openPreview(item);
    } else {
      router.push(`${basePath}/${item.id}`);
    }
  }, [isMobile, openPreview, basePath, router]);

  return (
    <>
      <div className="vv-grid">
        {items.map((item) => {
          const pubId = String(item.id);
          const nombre = item.nombre || "Sin nombre";
          const edad = item.edad || null;
          const zona = item.zona || item.ciudad || "";
          const disponible = item.disponible !== undefined ? item.disponible : true;
          const rating = item.rating != null ? item.rating : 4.8;
          const profileUrl = `${basePath}/${item.id}`;

          return (
            <div
              key={item.id}
              className="vv-card"
              data-testid={`card-${item.id}`}
            >
              {isMobile ? (
                <div
                  className="vv-card-link"
                  onClick={(e) => handleCardClick(e, item)}
                  role="button"
                  tabIndex={0}
                  style={{ cursor: "pointer" }}
                >
                  <div className="vv-card-img-wrap">
                    {item.cover_url ? (
                      <img
                        src={fixStorageUrl(item.cover_url)}
                        alt={nombre}
                        className="vv-card-img"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : <div className="vv-card-img-placeholder" />}
                    {disponible && <div className="vv-card-badge vv-card-badge-disponible" data-testid={`badge-disponible-${item.id}`}>Disponible</div>}
                    <PlanBadge planId={item.plan_actual || ""} hasDisponible={disponible} />
                    <div className="vv-card-overlay">
                      <p className="vv-card-name" data-testid={`text-name-${item.id}`}>{nombre}{edad ? `, ${edad}` : ""}</p>
                      {zona && <p className="vv-card-detail" data-testid={`text-zona-${item.id}`}>{zona}</p>}
                    </div>
                    <div className="vv-card-rating" data-testid={`text-rating-${item.id}`}><StarIcon />{rating.toFixed(1)}</div>
                  </div>
                </div>
              ) : (
                <div
                  className="vv-card-link"
                  onClick={(e) => handleDesktopCardClick(e, item)}
                  role="button"
                  tabIndex={0}
                  style={{ cursor: "pointer" }}
                >
                  <div className="vv-card-img-wrap">
                    {item.cover_url ? (
                      <img
                        src={fixStorageUrl(item.cover_url)}
                        alt={nombre}
                        className="vv-card-img"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : <div className="vv-card-img-placeholder" />}
                    {disponible && <div className="vv-card-badge vv-card-badge-disponible" data-testid={`badge-disponible-${item.id}`}>Disponible</div>}
                    <PlanBadge planId={item.plan_actual || ""} hasDisponible={disponible} />
                    <div className="vv-card-overlay">
                      <p className="vv-card-name" data-testid={`text-name-${item.id}`}>{nombre}{edad ? `, ${edad}` : ""}</p>
                      {zona && <p className="vv-card-detail" data-testid={`text-zona-${item.id}`}>{zona}</p>}
                    </div>
                    <div className="vv-card-rating" data-testid={`text-rating-${item.id}`}><StarIcon />{rating.toFixed(1)}</div>
                  </div>
                </div>
              )}
              <div className="vv-card-heart">
                <FavoritoButton
                  publicacionId={pubId}
                  size={18}
                  isFav={favSet.has(pubId)}
                  onToggle={toggleFavorito}
                  disabled={loadingIds.has(pubId)}
                />
              </div>
            </div>
          );
        })}
      </div>
      {previewData && (
        <MiniPreview
          fotos={previewData.fotos}
          nombre={previewData.nombre}
          profileUrl={previewData.profileUrl}
          onClose={closePreview}
        />
      )}
    </>
  );
}
