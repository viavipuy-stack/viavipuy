import CategoryTabs from "@/app/components/CategoryTabs";
import TrustBlock from "@/app/components/TrustBlock";

export const metadata = {
  title: "Punta del Este - VIAVIP",
  description: "Perfiles premium en Punta del Este. Proximamente en VIAVIP.",
};

export default function PdEPage() {
  return (
    <main>
      <CategoryTabs />
      <TrustBlock />

      <div className="vv-zone-empty" data-testid="pde-empty-state">
        <div className="vv-zone-empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="vv-zone-empty-svg">
            <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <h1 className="vv-zone-empty-title" data-testid="text-zone-title">Punta del Este</h1>
        <p className="vv-zone-empty-subtitle" data-testid="text-zone-subtitle">Proximamente perfiles en esta zona.</p>
        <div className="vv-zone-empty-line" />
      </div>
    </main>
  );
}
