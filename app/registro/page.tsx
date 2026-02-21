"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";

type Step = "loading" | "signup" | "welcome" | "doc_type" | "camera" | "capture" | "selfie" | "done" | "email_not_confirmed";

const DOC_TYPES = [
  { value: "cedula", label: "Cedula de Identidad" },
  { value: "pasaporte", label: "Pasaporte" },
  { value: "licencia", label: "Licencia de conducir" },
];

export default function RegistroPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [categoria, setCategoria] = useState("");
  const [docType, setDocType] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [docFrenteUploaded, setDocFrenteUploaded] = useState(false);
  const [docDorsoUploaded, setDocDorsoUploaded] = useState(false);
  const [selfieUploaded, setSelfieUploaded] = useState(false);
  const [captureStep, setCaptureStep] = useState<"frente" | "dorso">("frente");
  const [uploading, setUploading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentStepNum = (() => {
    if (step === "doc_type") return 1;
    if (step === "camera" || step === "capture") return 2;
    if (step === "selfie") return 3;
    return 0;
  })();

  useEffect(() => {
    async function checkAuth() {
      const supabase = getSupabase();
      if (!supabase) { setStep("signup"); return; }

      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      if (!user) {
        setStep("signup");
        return;
      }

      setUserId(user.id);
      setEmail(user.email || "");

      const emailConfirmed = !!(user.email_confirmed_at || (user as unknown as Record<string, unknown>).confirmed_at);

      if (!emailConfirmed) {
        setStep("email_not_confirmed");
        return;
      }

      const { data: profRows } = await supabase
        .from("profiles")
        .select("doc_frente_url, doc_dorso_url, selfie_url")
        .eq("id", user.id)
        .limit(1);

      const prof = profRows && profRows.length > 0 ? profRows[0] : null;

      if (prof?.doc_frente_url && prof?.doc_dorso_url && prof?.selfie_url) {
        setDocFrenteUploaded(true);
        setDocDorsoUploaded(true);
        setSelfieUploaded(true);
        setStep("done");
      } else {
        if (prof?.doc_frente_url) setDocFrenteUploaded(true);
        if (prof?.doc_dorso_url) setDocDorsoUploaded(true);
        if (prof?.selfie_url) setSelfieUploaded(true);
        setStep("welcome");
      }
    }
    checkAuth();
  }, []);

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      if (cameraStream) { cameraStream.getTracks().forEach((t) => t.stop()); }
    };
  }, [cameraStream]);

  async function startCamera() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) { videoRef.current.srcObject = stream; }
      return true;
    } catch {
      setCameraError("No se pudo acceder a la camara. Verifica los permisos en tu navegador.");
      return false;
    }
  }

  async function startFrontCamera() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) { videoRef.current.srcObject = stream; }
      return true;
    } catch {
      setCameraError("No se pudo acceder a la camara frontal.");
      return false;
    }
  }

  function capturePhoto(): Blob | null {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const byteString = atob(dataUrl.split(",")[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) { ia[i] = byteString.charCodeAt(i); }
    return new Blob([ab], { type: "image/jpeg" });
  }

  async function uploadToStorage(blob: Blob, path: string): Promise<string | null> {
    const supabase = getSupabase();
    if (!supabase) return null;
    const { error } = await supabase.storage.from("verificaciones").upload(path, blob, { contentType: "image/jpeg", upsert: true });
    if (error) { setMessage({ type: "error", text: `Error al subir imagen: ${error.message}` }); return null; }
    return path;
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!email.trim() || !password || !confirmPassword || !categoria) { setMessage({ type: "error", text: "Completa todos los campos." }); return; }
    if (password !== confirmPassword) { setMessage({ type: "error", text: "Las contrasenas no coinciden." }); return; }
    if (password.length < 6) { setMessage({ type: "error", text: "La contrasena debe tener al menos 6 caracteres." }); return; }

    const supabase = getSupabase();
    if (!supabase) { setMessage({ type: "error", text: "Supabase no configurado." }); return; }

    setLoading(true);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${siteUrl}/auth/callback` },
    });
    if (error) { setMessage({ type: "error", text: error.message }); setLoading(false); return; }

    const uid = data.user?.id;
    if (uid) {
      setUserId(uid);
      await supabase.from("profiles").upsert({ id: uid, email: email.trim(), verification_status: "pending", categoria }, { onConflict: "id" });
    }
    setLoading(false);
    setStep("done");
  }

  async function handleCameraPermission() {
    setLoading(true);
    const ok = await startCamera();
    setLoading(false);
    if (ok) { setCaptureStep("frente"); setStep("capture"); }
  }

  async function handleCaptureDoc() {
    const blob = capturePhoto();
    if (!blob || !userId) return;
    setUploading(true);
    const side = captureStep === "frente" ? "frente" : "dorso";
    const path = `${userId}/doc_${side}_${Date.now()}.jpg`;
    const storagePath = await uploadToStorage(blob, path);
    if (storagePath) {
      const supabase = getSupabase();
      if (supabase) {
        if (side === "frente") {
          setDocFrenteUploaded(true);
          await supabase.from("profiles").update({ doc_frente_url: storagePath }).eq("id", userId);
          setCaptureStep("dorso");
        } else {
          setDocDorsoUploaded(true);
          await supabase.from("profiles").update({ doc_dorso_url: storagePath }).eq("id", userId);
          stopCamera();
          setStep("selfie");
        }
      }
    }
    setUploading(false);
  }

  async function handleStartSelfie() {
    setLoading(true);
    stopCamera();
    await new Promise((r) => setTimeout(r, 300));
    const ok = await startFrontCamera();
    setLoading(false);
    if (!ok) return;
  }

  async function handleCaptureSelfie() {
    const blob = capturePhoto();
    if (!blob || !userId) return;
    setUploading(true);
    const path = `${userId}/selfie_${Date.now()}.jpg`;
    const storagePath = await uploadToStorage(blob, path);
    if (storagePath) {
      setSelfieUploaded(true);
      const supabase = getSupabase();
      if (supabase) {
        await supabase.from("profiles").update({
          selfie_url: storagePath,
          verification_status: "in_review",
          verified_at: new Date().toISOString(),
        }).eq("id", userId);
      }
      stopCamera();
      setStep("done");
    }
    setUploading(false);
  }

  async function handleResendEmail() {
    const supabase = getSupabase();
    if (!supabase || !email) return;
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) {
        setMessage({ type: "error", text: "Error: " + error.message });
      } else {
        setMessage({ type: "success", text: "Email reenviado. Revisa tu bandeja de entrada." });
      }
    } catch {
      setMessage({ type: "error", text: "No se pudo reenviar el email." });
    }
    setLoading(false);
  }

  useEffect(() => {
    if (step === "selfie" && !cameraStream) { handleStartSelfie(); }
  }, [step]);

  useEffect(() => {
    if (videoRef.current && cameraStream) { videoRef.current.srcObject = cameraStream; }
  }, [cameraStream, step]);

  if (step === "loading") {
    return (
      <main className="vv-form-page">
        <div className="vv-form-container">
          <p className="vv-form-loading">Cargando...</p>
        </div>
      </main>
    );
  }

  const isVerificationDone = docFrenteUploaded && docDorsoUploaded && selfieUploaded;
  const isPostSignup = step === "done" && !userId;
  const isVerificationComplete = step === "done" && isVerificationDone;

  return (
    <main className="vv-form-page">
      <div className="vv-form-container">

        {step !== "signup" && step !== "welcome" && step !== "done" && step !== "email_not_confirmed" && (
          <div className="vv-progress">
            <div className="vv-progress-bar">
              <div className="vv-progress-fill" style={{ width: `${(currentStepNum / 3) * 100}%` }} />
            </div>
            <span className="vv-progress-text">Paso {currentStepNum}/3</span>
          </div>
        )}

        {message && (
          <div className={message.type === "success" ? "vv-form-success-box" : "vv-form-error-box"}>{message.text}</div>
        )}

        {step === "signup" && (
          <>
            <div className="vv-form-header">
              <h1 className="vv-form-title">Crear cuenta</h1>
              <p className="vv-form-subtitle">Registrate para publicar tu perfil.</p>
            </div>
            <form onSubmit={handleSignup} className="vv-form">
              <div className="vv-field">
                <label htmlFor="email" className="vv-label">Email</label>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="vv-input" placeholder="tu@email.com" required data-testid="input-email" />
              </div>
              <div className="vv-field">
                <label htmlFor="password" className="vv-label">Contrasena</label>
                <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="vv-input" placeholder="Minimo 6 caracteres" required data-testid="input-password" />
              </div>
              <div className="vv-field">
                <label htmlFor="confirmPassword" className="vv-label">Confirmar contrasena</label>
                <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="vv-input" placeholder="Repeti tu contrasena" required data-testid="input-confirm-password" />
              </div>
              <div className="vv-field">
                <label htmlFor="categoria" className="vv-label">Categoria *</label>
                <select id="categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} className="vv-input" required data-testid="select-categoria">
                  <option value="">Seleccionar...</option>
                  <option value="mujer">Mujer</option>
                  <option value="hombre">Hombre</option>
                  <option value="trans">Trans</option>
                </select>
              </div>
              <button type="submit" className="vv-btn" disabled={loading} data-testid="button-signup">
                {loading ? "Creando cuenta..." : "Crear cuenta"}
              </button>
            </form>
            <div className="vv-auth-links">
              <a href="/login" className="vv-text-btn" data-testid="link-login">Ya tengo cuenta</a>
            </div>
          </>
        )}

        {step === "email_not_confirmed" && (
          <div className="vv-welcome">
            <div className="vv-welcome-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 48, height: 48, color: "#f59e0b" }}>
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="vv-form-title" style={{ textAlign: "center" }}>Confirma tu email</h1>
            <p className="vv-welcome-text">
              Primero necesitas confirmar tu email antes de verificar tu identidad.
              Revisa tu bandeja de entrada y haz clic en el enlace de confirmacion.
            </p>
            <button
              className="vv-btn"
              style={{ width: "100%", marginTop: 12 }}
              disabled={loading}
              onClick={handleResendEmail}
              data-testid="button-resend-email"
            >
              {loading ? "Reenviando..." : "Reenviar email de confirmacion"}
            </button>
            <button className="vv-btn" style={{ width: "100%", marginTop: 12, background: "transparent", border: "1px solid #333", color: "#ccc" }} onClick={() => router.push("/login")} data-testid="button-go-login">
              Ir a Login
            </button>
          </div>
        )}

        {step === "welcome" && (
          <div className="vv-welcome">
            <div className="vv-welcome-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 48, height: 48, color: "#22c55e" }}>
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="vv-form-title" style={{ textAlign: "center" }}>Verificacion de identidad</h1>
            <p className="vv-welcome-text">
              Necesitamos verificar tu identidad y comprobar que sos mayor de edad.
              Este proceso es obligatorio para poder publicar.
            </p>
            <div className="vv-welcome-steps">
              <div className="vv-welcome-step"><span className="vv-welcome-step-num">1</span><span>Selecciona tu tipo de documento</span></div>
              <div className="vv-welcome-step"><span className="vv-welcome-step-num">2</span><span>Captura frente y dorso del documento</span></div>
              <div className="vv-welcome-step"><span className="vv-welcome-step-num">3</span><span>Toma una selfie para confirmar tu identidad</span></div>
            </div>
            <p className="vv-welcome-privacy">Tus datos se tratan de forma confidencial y solo se usan para verificacion.</p>
            <button className="vv-btn vv-btn-verify" style={{ width: "100%" }} onClick={() => setStep("doc_type")} data-testid="button-start-verification">
              Empezar verificacion
            </button>
          </div>
        )}

        {step === "doc_type" && (
          <>
            <div className="vv-form-header">
              <h1 className="vv-form-title">Tipo de documento</h1>
              <p className="vv-form-subtitle">Selecciona el documento que vas a presentar.</p>
            </div>
            <div className="vv-doc-options">
              {DOC_TYPES.map((dt) => (
                <button
                  key={dt.value}
                  className={`vv-doc-option ${docType === dt.value ? "vv-doc-option-selected" : ""}`}
                  onClick={async () => {
                    setDocType(dt.value);
                    const supabase = getSupabase();
                    if (supabase && userId) { await supabase.from("profiles").update({ tipo_documento: dt.value }).eq("id", userId); }
                  }}
                  data-testid={`button-doc-${dt.value}`}
                >
                  <span className="vv-doc-option-radio">{docType === dt.value ? "\u25CF" : "\u25CB"}</span>
                  {dt.label}
                </button>
              ))}
            </div>
            <button className="vv-btn vv-btn-verify" style={{ width: "100%", marginTop: 16 }} disabled={!docType} onClick={() => setStep("camera")} data-testid="button-continue-doc">
              Continuar
            </button>
          </>
        )}

        {step === "camera" && (
          <>
            <div className="vv-form-header">
              <h1 className="vv-form-title">Permiso de camara</h1>
              <p className="vv-form-subtitle">Necesitamos acceder a tu camara para capturar las fotos del documento.</p>
            </div>
            {cameraError && <div className="vv-form-error-box">{cameraError}</div>}
            <button className="vv-btn vv-btn-verify" style={{ width: "100%" }} disabled={loading} onClick={handleCameraPermission} data-testid="button-allow-camera">
              {loading ? "Solicitando permiso..." : "Permitir camara"}
            </button>
          </>
        )}

        {step === "capture" && (
          <>
            <div className="vv-form-header">
              <h1 className="vv-form-title">{captureStep === "frente" ? "Frente del documento" : "Dorso del documento"}</h1>
              <p className="vv-form-subtitle">{captureStep === "frente" ? "Posiciona el frente de tu documento dentro del recuadro." : "Ahora da vuelta el documento y captura el dorso."}</p>
            </div>
            <div className="vv-camera-wrapper">
              <video ref={videoRef} autoPlay playsInline muted className="vv-camera-video" />
              <canvas ref={canvasRef} style={{ display: "none" }} />
            </div>
            {captureStep === "frente" && docFrenteUploaded && <p className="vv-form-subtitle" style={{ color: "#4ade80", marginTop: 8 }}>Frente capturado</p>}
            <button className="vv-btn vv-btn-verify" style={{ width: "100%", marginTop: 12 }} disabled={uploading} onClick={handleCaptureDoc} data-testid="button-capture-doc">
              {uploading ? "Subiendo..." : `Capturar ${captureStep}`}
            </button>
          </>
        )}

        {step === "selfie" && (
          <>
            <div className="vv-form-header">
              <h1 className="vv-form-title">Selfie</h1>
              <p className="vv-form-subtitle">Toma una selfie clara mirando a la camara.</p>
            </div>
            {cameraError && <div className="vv-form-error-box">{cameraError}</div>}
            <div className="vv-camera-wrapper vv-camera-selfie">
              <video ref={videoRef} autoPlay playsInline muted className="vv-camera-video" />
              <canvas ref={canvasRef} style={{ display: "none" }} />
            </div>
            <button className="vv-btn vv-btn-verify" style={{ width: "100%", marginTop: 12 }} disabled={uploading || loading} onClick={handleCaptureSelfie} data-testid="button-capture-selfie">
              {uploading ? "Subiendo..." : loading ? "Iniciando camara..." : "Capturar selfie"}
            </button>
          </>
        )}

        {step === "done" && !isVerificationComplete && (
          <div className="vv-welcome">
            <div className="vv-welcome-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 48, height: 48, color: "#22c55e" }}>
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="vv-form-title" style={{ textAlign: "center" }}>Revisa tu email</h1>
            <p className="vv-welcome-text">
              Te enviamos un email de confirmacion a <strong>{email}</strong>.
              Confirmalo y luego inicia sesion para verificar tu identidad.
            </p>
            <p className="vv-welcome-privacy">Si no lo ves, revisa tu carpeta de spam.</p>
            <button className="vv-btn" style={{ width: "100%" }} onClick={() => router.push("/login")} data-testid="button-go-login">
              Ir a Login
            </button>
          </div>
        )}

        {step === "done" && isVerificationComplete && (
          <div className="vv-welcome">
            <div className="vv-welcome-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 48, height: 48, color: "#22c55e" }}>
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="vv-form-title" style={{ textAlign: "center" }}>Verificacion enviada</h1>
            <p className="vv-welcome-text">
              Tu documentacion fue enviada correctamente. Revisaremos tu identidad y te notificaremos.
            </p>
            <div className="vv-welcome-steps" style={{ marginTop: 12 }}>
              <div className="vv-welcome-step"><span style={{ color: "#4ade80" }}>Documento frente</span><span style={{ color: "#4ade80" }}>Subido</span></div>
              <div className="vv-welcome-step"><span style={{ color: "#4ade80" }}>Documento dorso</span><span style={{ color: "#4ade80" }}>Subido</span></div>
              <div className="vv-welcome-step"><span style={{ color: "#4ade80" }}>Selfie</span><span style={{ color: "#4ade80" }}>Subido</span></div>
            </div>
            <button className="vv-btn" style={{ width: "100%", marginTop: 16 }} onClick={() => router.push("/mi-cuenta")} data-testid="button-go-account">
              Ir a Mi Cuenta
            </button>
          </div>
        )}

        <a href="/mi-cuenta" className="vv-form-back" style={{ display: "block", marginTop: 24 }}>Volver al inicio</a>
      </div>
    </main>
  );
}
