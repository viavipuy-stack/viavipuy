"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";
import { getPlanConfig } from "@/lib/plans";
import { fixStorageUrl } from "@/lib/fixStorageUrl";
import MediaGallery from "@/app/components/MediaGallery";

interface ProfileData {
  verification_status?: string;
  plan_actual?: string;
  plan_estado?: string;
  paid_until?: string;
  trial_ends_at?: string;
  verified_at?: string;
  categoria?: string;
  nombre?: string;
  doc_frente_url?: string;
  doc_dorso_url?: string;
  selfie_url?: string;
}

interface PubData {
  id: string;
  nombre?: string;
  edad?: number;
  descripcion?: string;
  cover_url?: string;
  zona?: string;
  ciudad?: string;
  disponible?: boolean;
  rating?: number;
  telefono?: string;
  fotos?: string[];
  videos?: string[];
  servicios?: string[];
  fantasias?: string[];
  servicios_virtuales?: string[];
  tipos_masajes?: string[];
  idiomas?: string[];
}

const SERVICE_OPTIONS: Record<string, string[]> = {
  servicios: ["GFE", "Masajes", "Eventos", "Acompanante", "Cena", "Viajes", "Duo", "Trios", "Fiestas"],
  fantasias: ["Roleplay", "Disfraces", "Dominacion", "Sumision", "Lluvia dorada", "Fetichismo", "BDSM"],
  servicios_virtuales: ["Videollamada", "Sexting", "Contenido exclusivo", "Shows en vivo"],
  tipos_masajes: ["Relajante", "Erotico", "Tantra", "Nuru", "Body to body"],
  idiomas: ["Espanol", "Ingles", "Portugues", "Frances", "Italiano", "Aleman"],
};

const TAG_LABELS: Record<string, string> = {
  servicios: "Servicios",
  fantasias: "Fantasias",
  servicios_virtuales: "Servicios Virtuales",
  tipos_masajes: "Tipos de Masajes",
  idiomas: "Idiomas",
};

function ChipEditor({
  field,
  options,
  selected,
  onChange,
}: {
  field: string;
  options: string[];
  selected: string[];
  onChange: (vals: string[]) => void;
}) {
  function toggle(val: string) {
    onChange(selected.includes(val) ? selected.filter((s) => s !== val) : [...selected, val]);
  }
  return (
    <div className="vv-chip-edit-group">
      <label className="vv-label" style={{ marginBottom: 6 }}>{TAG_LABELS[field] || field}</label>
      <div className="vv-chip-selector">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`vv-chip-option ${selected.includes(opt) ? "vv-chip-option-selected" : ""}`}
            onClick={() => toggle(opt)}
            data-testid={`chip-${field}-${opt.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function MiCuentaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [emailConfirmed, setEmailConfirmed] = useState(false);

  const [pub, setPub] = useState<PubData | null>(null);
  const [fotos, setFotos] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [coverUrl, setCoverUrl] = useState("");
  const [tags, setTags] = useState<Record<string, string[]>>({
    servicios: [],
    fantasias: [],
    servicios_virtuales: [],
    tipos_masajes: [],
    idiomas: [],
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editingTags, setEditingTags] = useState(false);
  const [instagramUrl, setInstagramUrl] = useState("");
  const [onlyfansUrl, setOnlyfansUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [savingSocial, setSavingSocial] = useState(false);
  const [socialMsg, setSocialMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      if (!supabase) { setAuthError("Supabase no configurado."); setLoading(false); return; }
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) { setAuthError("Inicia sesion para ver tu cuenta."); setLoading(false); return; }
      setUserId(user.id);
      setUserEmail(user.email || "");
      const { data: profRows, error: profErr } = await supabase
        .from("profiles")
        .select("verification_status, plan_actual, plan_estado, paid_until, trial_ends_at, verified_at, categoria, nombre, doc_frente_url, doc_dorso_url, selfie_url, instagram_url, onlyfans_url, twitter_url, email_confirmed")
        .eq("id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (profErr) {
        console.error("Error fetching profile:", JSON.stringify(profErr));
      }

      const prof = profRows && profRows.length > 0 ? profRows[0] : null;
      const profileData = (prof as ProfileData) || {};
      setProfile(profileData);

      const emailConfirmedByAuth = !!(user.email_confirmed_at || (user as unknown as Record<string, unknown>).confirmed_at);
      const emailConfirmedByProfile = !!(prof as unknown as Record<string, unknown>)?.email_confirmed;
      setEmailConfirmed(emailConfirmedByAuth || emailConfirmedByProfile);

      if (prof) {
        setInstagramUrl((prof as Record<string, unknown>).instagram_url as string || "");
        setOnlyfansUrl((prof as Record<string, unknown>).onlyfans_url as string || "");
        setTwitterUrl((prof as Record<string, unknown>).twitter_url as string || "");
      }

      const { data: pubData } = await supabase
        .from("publicaciones")
        .select("id, nombre, edad, descripcion, cover_url, zona, ciudad, disponible, rating, telefono, fotos, videos, servicios, fantasias, servicios_virtuales, tipos_masajes, idiomas")
        .eq("user_id", user.id)
        .maybeSingle();

      if (pubData) {
        const p = pubData as PubData;
        setPub(p);
        setFotos(Array.isArray(p.fotos) ? p.fotos : []);
        setVideos(Array.isArray(p.videos) ? p.videos : []);
        setCoverUrl(p.cover_url || "");
        setTags({
          servicios: Array.isArray(p.servicios) ? p.servicios : [],
          fantasias: Array.isArray(p.fantasias) ? p.fantasias : [],
          servicios_virtuales: Array.isArray(p.servicios_virtuales) ? p.servicios_virtuales : [],
          tipos_masajes: Array.isArray(p.tipos_masajes) ? p.tipos_masajes : [],
          idiomas: Array.isArray(p.idiomas) ? p.idiomas : [],
        });
      }

      setLoading(false);
    }
    load();
  }, []);

  async function handleResendVerification() {
    const supabase = getSupabase();
    if (!supabase || !userEmail) return;
    setResending(true);
    setResendMsg(null);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: userEmail });
      setResendMsg(error ? "Error: " + error.message : "Email reenviado. Revisa tu bandeja de entrada.");
    } catch {
      setResendMsg("No se pudo reenviar el email.");
    }
    setResending(false);
  }

  async function handleSaveMedia() {
    if (!pub || !userId) return;
    setSaving(true);
    setSaveMsg(null);

    const supabase = getSupabase();
    if (!supabase) { setSaving(false); return; }

    const payload: Record<string, unknown> = {
      fotos: fotos.filter(Boolean),
      videos: videos.filter(Boolean),
      cover_url: coverUrl || null,
      servicios: tags.servicios,
      fantasias: tags.fantasias,
      servicios_virtuales: tags.servicios_virtuales,
      tipos_masajes: tags.tipos_masajes,
      idiomas: tags.idiomas,
    };

    const { error } = await supabase
      .from("publicaciones")
      .update(payload)
      .eq("id", pub.id)
      .eq("user_id", userId);

    if (error) {
      const hint = error.message.includes("column")
        ? " (Es posible que falte ejecutar la migracion SQL en Supabase)"
        : "";
      setSaveMsg({ type: "error", text: `Error: ${error.message}${hint}` });
    } else {
      setSaveMsg({ type: "success", text: "Cambios guardados." });
      setPub({ ...pub, fotos, videos, cover_url: coverUrl, ...tags });
    }
    setSaving(false);
  }

  function normalizeUrl(val: string): string | null {
    const trimmed = val.trim();
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return "https://" + trimmed;
  }

  async function handleSaveSocial() {
    if (!userId) return;
    setSavingSocial(true);
    setSocialMsg(null);
    const supabase = getSupabase();
    if (!supabase) { setSavingSocial(false); return; }

    const payload = {
      instagram_url: normalizeUrl(instagramUrl),
      onlyfans_url: normalizeUrl(onlyfansUrl),
      twitter_url: normalizeUrl(twitterUrl),
    };

    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", userId);

    if (error) {
      const hint = error.message.includes("column")
        ? " (Ejecuta la migracion SQL para agregar las columnas)"
        : "";
      setSocialMsg({ type: "error", text: `Error: ${error.message}${hint}` });
    } else {
      setSocialMsg({ type: "success", text: "Redes sociales guardadas." });
      setInstagramUrl(payload.instagram_url || "");
      setOnlyfansUrl(payload.onlyfans_url || "");
      setTwitterUrl(payload.twitter_url || "");
    }
    setSavingSocial(false);
  }

  async function handleLogout() {
    const supabase = getSupabase();
    if (supabase) { await supabase.auth.signOut(); }
    router.push("/");
  }

  if (loading) return <main className="vv-form-page"><div className="vv-form-container"><p className="vv-form-loading">Cargando...</p></div></main>;
  if (authError) return <main className="vv-form-page"><div className="vv-form-container"><div className="vv-form-error-box">{authError}</div><a href="/login" className="vv-form-link">Ir a Login</a></div></main>;

  const planId = profile?.plan_actual || "free";
  const planConfig = getPlanConfig(planId);
  const planEstado = profile?.plan_estado || "sin_plan";
  const planFin = profile?.paid_until ? new Date(profile.paid_until) : null;
  const isExpired = planFin ? planFin < new Date() : false;
  const verificado = profile?.verification_status === "approved";
  const identidadCompleta = !!(profile?.doc_frente_url && profile?.doc_dorso_url && profile?.selfie_url);
  const hasPub = !!pub;

  const estadoLabel: Record<string, string> = {
    activo: "Activo",
    vencido: "Vencido",
    cancelado: "Cancelado",
    sin_plan: "Sin plan",
  };

  const catRoute = profile?.categoria === "hombre" ? "/hombres" : profile?.categoria === "trans" ? "/trans" : "/mujeres";

  return (
    <main className="vv-form-page">
      <div className="vv-form-container">
        <div className="vv-form-header">
          <h1 className="vv-form-title">Mi Cuenta</h1>
          <p className="vv-form-subtitle">{userEmail}</p>
        </div>

        <div className="vv-cuenta-section">
          <h2 className="vv-cuenta-label">Estado de cuenta</h2>
          <div className="vv-cuenta-row">
            <span className="vv-cuenta-key">Email confirmado</span>
            <span className={`vv-admin-status vv-admin-status-${emailConfirmed ? "approved" : "pending"}`}>
              {emailConfirmed ? "Confirmado" : "Pendiente"}
            </span>
          </div>
          {!emailConfirmed && (
            <div style={{ marginTop: 10 }}>
              <p style={{ fontSize: "13px", color: "var(--text-secondary, #999999)", marginBottom: 8 }}>
                Confirma tu email para poder publicar.
              </p>
              {resendMsg && (
                <div className={resendMsg.startsWith("Error") ? "vv-form-error-box" : "vv-form-success-box"} style={{ marginBottom: 8, fontSize: "13px" }}>
                  {resendMsg}
                </div>
              )}
              <button
                className="vv-btn"
                style={{ width: "100%", fontSize: "13px" }}
                disabled={resending}
                onClick={handleResendVerification}
                data-testid="button-resend-verification"
              >
                {resending ? "Reenviando..." : "Reenviar email de verificacion"}
              </button>
            </div>
          )}
          <div className="vv-cuenta-row" style={{ marginTop: 12 }}>
            <span className="vv-cuenta-key">Identidad verificada</span>
            <span className={`vv-admin-status vv-admin-status-${identidadCompleta ? "approved" : "pending"}`}>
              {identidadCompleta ? "Completa" : "Incompleta"}
            </span>
          </div>
          {emailConfirmed && !identidadCompleta && (
            <div style={{ marginTop: 10 }}>
              <a href="/registro" className="vv-btn" style={{ display: "block", textAlign: "center", width: "100%", fontSize: "13px" }} data-testid="link-verificar-identidad">
                Verificar identidad
              </a>
            </div>
          )}
        </div>

        <div className="vv-cuenta-section">
          <h2 className="vv-cuenta-label">Plan</h2>
          <div className="vv-cuenta-plan-card">
            <div className="vv-cuenta-plan-header">
              <span className="vv-plan-badge" style={{ background: planConfig.badge_bg, color: planConfig.badge_text }}>
                {planConfig.name}
              </span>
              <span className={`vv-cuenta-plan-estado ${isExpired || planEstado === "vencido" ? "vv-cuenta-plan-vencido" : planEstado === "activo" ? "vv-cuenta-plan-activo" : ""}`}>
                {isExpired ? "Vencido" : estadoLabel[planEstado] || planEstado}
              </span>
            </div>

            {planFin && (
              <div className="vv-cuenta-row" style={{ marginTop: 10 }}>
                <span className="vv-cuenta-key">{isExpired ? "Vencio el" : "Vence el"}</span>
                <span className="vv-cuenta-val">{planFin.toLocaleDateString()}</span>
              </div>
            )}

            <div className="vv-cuenta-plan-limits">
              <span>Fotos: {planConfig.max_fotos === null ? "Ilimitadas" : `hasta ${planConfig.max_fotos}`}</span>
              <span>Videos: {planConfig.max_videos >= 999 ? "Ilimitados" : planConfig.max_videos}</span>
              <span>Metricas: {planConfig.metricas_avanzadas ? "Completas" : planConfig.metricas ? "Basicas" : "No"}</span>
            </div>
          </div>

          <a href="/planes" className="vv-btn" style={{ display: "block", textAlign: "center", marginTop: 12 }} data-testid="link-planes">
            {planEstado === "activo" && !isExpired ? "Mejorar plan" : "Ver planes"}
          </a>
        </div>

        {hasPub && (
          <div className="vv-cuenta-section">
            <h2 className="vv-cuenta-label">Vista previa</h2>
            <div className="vv-preview-card" data-testid="preview-card">
              <div className="vv-preview-img-wrap">
                {coverUrl ? (
                  <img src={fixStorageUrl(coverUrl)} alt={pub.nombre || ""} className="vv-preview-img" />
                ) : (
                  <div className="vv-preview-img-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="4" /><path d="M20 21c0-3.3-3.6-6-8-6s-8 2.7-8 6" /></svg>
                  </div>
                )}
                {pub.disponible !== false && (
                  <div className="vv-card-badge vv-card-badge-disponible" style={{ position: "absolute", top: 8, left: 8 }}>Disponible</div>
                )}
                {planId !== "free" && (
                  <div className="vv-card-plan-badge" style={{ background: planConfig.badge_bg, color: planConfig.badge_text, position: "absolute", top: 8, right: 8 }}>
                    {planConfig.name}
                  </div>
                )}
              </div>
              <div className="vv-preview-info">
                <p className="vv-preview-name">
                  {pub.nombre || "Sin nombre"}
                  {pub.edad ? `, ${pub.edad}` : ""}
                </p>
                <p className="vv-preview-zona">{pub.zona || pub.ciudad || ""}</p>
                {pub.descripcion && (
                  <p className="vv-preview-desc">{pub.descripcion.slice(0, 100)}{pub.descripcion.length > 100 ? "..." : ""}</p>
                )}
                <a href={`${catRoute}/${pub.id}`} className="vv-preview-link" data-testid="link-ver-perfil">Ver perfil completo</a>
              </div>
            </div>
          </div>
        )}

        {hasPub && userId && verificado && (
          <div className="vv-cuenta-section">
            <h2 className="vv-cuenta-label">Galeria de medios</h2>

            {saveMsg && (
              <div className={saveMsg.type === "error" ? "vv-form-error-box" : "vv-form-success-box"} style={{ fontSize: "13px", marginBottom: 10 }}>
                {saveMsg.text}
              </div>
            )}

            <MediaGallery
              userId={userId}
              fotos={fotos}
              videos={videos}
              maxFotos={planConfig.max_fotos}
              maxVideos={planConfig.max_videos}
              planName={planConfig.name}
              onFotosChange={setFotos}
              onVideosChange={setVideos}
              onCoverChange={setCoverUrl}
              coverUrl={coverUrl}
            />

            <div style={{ marginTop: 16 }}>
              <button
                type="button"
                className="vv-cuenta-toggle-btn"
                onClick={() => setEditingTags(!editingTags)}
                data-testid="button-toggle-tags"
              >
                {editingTags ? "Ocultar etiquetas" : "Editar etiquetas y servicios"}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, transform: editingTags ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>

            {editingTags && (
              <div className="vv-tags-editor" data-testid="tags-editor">
                {Object.entries(SERVICE_OPTIONS).map(([key, opts]) => (
                  <ChipEditor
                    key={key}
                    field={key}
                    options={opts}
                    selected={tags[key] || []}
                    onChange={(vals) => setTags((prev) => ({ ...prev, [key]: vals }))}
                  />
                ))}
              </div>
            )}

            <button
              type="button"
              className="vv-btn"
              style={{ width: "100%", marginTop: 16 }}
              disabled={saving}
              onClick={handleSaveMedia}
              data-testid="button-save-media"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        )}

        <div className="vv-cuenta-section">
          <h2 className="vv-cuenta-label">Historia Destacada</h2>
          <div className={`vv-story-card ${planId === "diamante" && planEstado === "activo" ? "vv-story-card-active" : "vv-story-card-locked"}`} data-testid="story-card">
            <div className="vv-story-card-icon">
              {planId === "diamante" && planEstado === "activo" ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
              )}
            </div>
            <div className="vv-story-card-content">
              <p className="vv-story-card-title">Historia Destacada</p>
              <p className="vv-story-card-desc">
                {planId === "diamante" && planEstado === "activo"
                  ? "Mostrate primero durante 24 horas"
                  : "Exclusivo para usuarias Diamante"}
              </p>
            </div>
            {planId === "diamante" && planEstado === "activo" ? (
              <a href="/story" className="vv-story-card-btn vv-story-card-btn-gold" data-testid="link-story">
                Gestionar historia
              </a>
            ) : (
              <a href="/planes" className="vv-story-card-btn vv-story-card-btn-locked" data-testid="link-upgrade-story">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                Exclusivo Diamante
              </a>
            )}
          </div>
        </div>

        <div className="vv-cuenta-section">
          <h2 className="vv-cuenta-label">Redes sociales</h2>
          {socialMsg && (
            <div className={socialMsg.type === "error" ? "vv-form-error-box" : "vv-form-success-box"} style={{ fontSize: "13px", marginBottom: 10 }}>
              {socialMsg.text}
            </div>
          )}
          <div className="vv-social-inputs">
            <div className="vv-social-input-row">
              <label className="vv-social-input-label" htmlFor="input-instagram">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.17.054 1.97.24 2.43.403a4.088 4.088 0 011.47.958c.458.458.779.91.958 1.47.163.46.35 1.26.404 2.43.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.054 1.17-.24 1.97-.404 2.43a4.088 4.088 0 01-.958 1.47 4.088 4.088 0 01-1.47.958c-.46.163-1.26.35-2.43.404-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.17-.054-1.97-.24-2.43-.404a4.088 4.088 0 01-1.47-.958 4.088 4.088 0 01-.958-1.47c-.163-.46-.35-1.26-.404-2.43C2.175 15.584 2.163 15.204 2.163 12s.012-3.584.07-4.85c.054-1.17.24-1.97.404-2.43a4.088 4.088 0 01.958-1.47 4.088 4.088 0 011.47-.958c.46-.163 1.26-.35 2.43-.404C8.416 2.175 8.796 2.163 12 2.163zm0-2.163C8.741 0 8.333.014 7.053.072 5.775.131 4.902.333 4.14.63a6.21 6.21 0 00-2.245 1.462A6.21 6.21 0 00.433 4.337C.136 5.1-.066 5.973.007 7.251.07 8.53.056 8.939.056 12.198c0 3.259.014 3.668.072 4.948.059 1.277.261 2.15.558 2.913a6.21 6.21 0 001.462 2.245 6.21 6.21 0 002.245 1.462c.762.297 1.636.499 2.913.558C8.53 24.383 8.939 24.397 12.198 24.397c3.259 0 3.668-.014 4.948-.072 1.277-.059 2.15-.261 2.913-.558a6.21 6.21 0 002.245-1.462 6.21 6.21 0 001.462-2.245c.297-.762.499-1.636.558-2.913.058-1.28.072-1.689.072-4.948 0-3.259-.014-3.668-.072-4.948-.059-1.277-.261-2.15-.558-2.913a6.21 6.21 0 00-1.462-2.245A6.21 6.21 0 0019.86.433C19.098.136 18.224-.066 16.947.007 15.668.07 15.259.056 12 .056zM12 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zm0 10.162a3.999 3.999 0 110-7.998 3.999 3.999 0 010 7.998zm6.406-10.845a1.44 1.44 0 11-2.88 0 1.44 1.44 0 012.88 0z"/></svg>
                Instagram
              </label>
              <input
                id="input-instagram"
                type="url"
                className="vv-social-input"
                placeholder="https://instagram.com/tu_usuario"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                data-testid="input-instagram-url"
              />
            </div>
            <div className="vv-social-input-row">
              <label className="vv-social-input-label" htmlFor="input-onlyfans">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 18.667a6.667 6.667 0 110-13.334 6.667 6.667 0 010 13.334zm0-10.667a4 4 0 100 8 4 4 0 000-8zm0 6a2 2 0 110-4 2 2 0 010 4z"/></svg>
                OnlyFans
              </label>
              <input
                id="input-onlyfans"
                type="url"
                className="vv-social-input"
                placeholder="https://onlyfans.com/tu_usuario"
                value={onlyfansUrl}
                onChange={(e) => setOnlyfansUrl(e.target.value)}
                data-testid="input-onlyfans-url"
              />
            </div>
            <div className="vv-social-input-row">
              <label className="vv-social-input-label" htmlFor="input-twitter">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                Twitter / X
              </label>
              <input
                id="input-twitter"
                type="url"
                className="vv-social-input"
                placeholder="https://x.com/tu_usuario"
                value={twitterUrl}
                onChange={(e) => setTwitterUrl(e.target.value)}
                data-testid="input-twitter-url"
              />
            </div>
          </div>
          <button
            type="button"
            className="vv-btn"
            style={{ width: "100%", marginTop: 14 }}
            disabled={savingSocial}
            onClick={handleSaveSocial}
            data-testid="button-save-social"
          >
            {savingSocial ? "Guardando..." : "Guardar redes sociales"}
          </button>
        </div>

        <div className="vv-cuenta-section">
          <h2 className="vv-cuenta-label">Acciones</h2>
          <div className="vv-cuenta-actions">
            <a href="/publicar" className="vv-cuenta-action-link" data-testid="link-publicar">
              {hasPub ? "Editar datos de publicacion" : "Crear publicacion"}
            </a>
            <a href="/metricas" className="vv-cuenta-action-link" data-testid="link-metricas">Ver estadisticas</a>
            <button className="vv-text-btn" style={{ color: "#888", marginTop: 8 }} onClick={handleLogout} data-testid="button-logout">
              Cerrar sesion
            </button>
          </div>
        </div>

        <a href="/" className="vv-form-back">Volver al inicio</a>
      </div>
    </main>
  );
}
