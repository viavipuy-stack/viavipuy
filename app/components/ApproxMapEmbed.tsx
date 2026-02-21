interface ApproxMapEmbedProps {
  zona?: string | null;
  ciudad?: string | null;
  departamento?: string | null;
}

export default function ApproxMapEmbed({ zona, ciudad, departamento }: ApproxMapEmbedProps) {
  if (!ciudad && !departamento) return null;

  const parts = [zona, ciudad, departamento, "Uruguay"].filter(Boolean) as string[];
  const q = encodeURIComponent(parts.join(", "));

  return (
    <div className="vv-approx-map">
      <h3 className="vv-approx-map-title">Ubicacion aproximada</h3>
      <p className="vv-approx-map-subtitle">Zona estimada (no exacta)</p>
      <div className="vv-approx-map-frame">
        <iframe
          src={`https://www.google.com/maps?q=${q}&output=embed`}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen={false}
          title="Ubicacion aproximada"
        />
      </div>
    </div>
  );
}
