"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";
import { PLANS, PLAN_ORDER, getPlanConfig } from "@/lib/plans";

export default function PlanesPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [planEstado, setPlanEstado] = useState<string>("sin_plan");
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      if (!supabase) { setLoading(false); return; }
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      const { data: profile } = await supabase.from("profiles").select("plan_actual, plan_estado").eq("id", user.id).maybeSingle();
      if (profile) {
        setCurrentPlan(profile.plan_actual || "free");
        setPlanEstado(profile.plan_estado || "sin_plan");
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleActivate(planId: string) {
    if (!userId) { router.push("/login"); return; }
    setActivating(planId);
    setMessage(null);
    const supabase = getSupabase();
    if (!supabase) return;

    const now = new Date();
    const planConfig = getPlanConfig(planId);
    const endDate = new Date(now);
    if (planId === "free") {
      endDate.setDate(endDate.getDate() + 7);
    } else {
      endDate.setDate(endDate.getDate() + 30);
    }

    const updateData: Record<string, any> = {
      plan_actual: planId,
      plan_estado: "activo",
      plan_inicio: now.toISOString(),
      plan_fin: endDate.toISOString(),
    };
    if (planId === "free") { updateData.trial_usado = true; }

    const { error } = await supabase.from("profiles").update(updateData).eq("id", userId);
    if (error) {
      setMessage({ type: "error", text: `Error: ${error.message}` });
    } else {
      setCurrentPlan(planId);
      setPlanEstado("activo");
      setMessage({ type: "success", text: `Plan ${planConfig.name} activado correctamente.` });
    }
    setActivating(null);
  }

  return (
    <main className="vv-form-page">
      <div className="vv-planes-container">
        <div className="vv-form-header" style={{ textAlign: "center" }}>
          <h1 className="vv-form-title">Planes</h1>
          <p className="vv-form-subtitle">Elige el plan que mejor se adapte a vos.</p>
        </div>

        {!loading && !userId && (
          <div className="vv-form-error-box" style={{ marginBottom: 20, textAlign: "center" }}>
            <a href="/login" className="vv-form-link" data-testid="link-login-planes">Inicia sesion</a> para activar un plan.
          </div>
        )}

        {message && (
          <div className={message.type === "success" ? "vv-form-success-box" : "vv-form-error-box"} style={{ marginBottom: 20 }}>{message.text}</div>
        )}

        {loading ? (
          <p className="vv-form-loading">Cargando...</p>
        ) : (
          <>
            {currentPlan === "free" && (
              <div className="vv-plan-current-free" data-testid="plan-card-free">
                <div className="vv-plan-current-free-inner">
                  <span className="vv-plan-current-free-label">Tu plan actual</span>
                  <span className="vv-plan-current-free-name">Free</span>
                  <span className="vv-plan-current-free-desc">3 fotos, sin videos, sin metricas</span>
                </div>
              </div>
            )}

            <div className="vv-planes-grid">
              {PLAN_ORDER.filter(p => p !== "free").map((planId) => {
                const plan = PLANS[planId];
                const isCurrent = currentPlan === planId && planEstado === "activo";
                const currentRank = getPlanConfig(currentPlan).ranking_priority;
                const isUpgrade = !isCurrent && currentRank < plan.ranking_priority;
                const isDowngrade = !isCurrent && currentRank > plan.ranking_priority;

                return (
                  <div key={planId} className={`vv-plan-card ${planId === "diamante" ? "vv-plan-card-featured" : ""} ${isCurrent ? "vv-plan-card-active" : ""}`} data-testid={`plan-card-${planId}`}>
                    {planId === "diamante" && <div className="vv-plan-featured-label">Mejor opcion</div>}

                    <div className="vv-plan-badge" style={{ background: plan.badge_bg, color: plan.badge_text }}>{plan.name}</div>

                    <div className="vv-plan-price">
                      <span className="vv-plan-price-amount" style={{ color: plan.color }}>${plan.price_monthly}</span>
                      <span className="vv-plan-price-period">/mes</span>
                    </div>

                    <ul className="vv-plan-features">
                      {plan.features.map((f, i) => (
                        <li key={i} className="vv-plan-feature">
                          <svg viewBox="0 0 24 24" fill="none" stroke={plan.color} strokeWidth="2" className="vv-plan-check">
                            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          {f}
                        </li>
                      ))}
                    </ul>

                    {isCurrent ? (
                      <div className="vv-plan-current">Plan actual</div>
                    ) : (
                      <button
                        className="vv-btn vv-plan-btn"
                        disabled={!!activating || !userId}
                        onClick={() => handleActivate(planId)}
                        data-testid={`button-activate-${planId}`}
                      >
                        {activating === planId ? "Activando..." : isUpgrade ? "Mejorar plan" : isDowngrade ? "Cambiar plan" : "Activar"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        <p className="vv-planes-note">
          Los pagos estan en fase de simulacion. Proximamente se integrara Stripe para pagos automaticos.
        </p>
      </div>
    </main>
  );
}
