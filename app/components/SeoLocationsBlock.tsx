import Link from "next/link";

const locations = [
  { name: "Montevideo", slug: "montevideo", count: 621 },
  { name: "Pocitos", slug: "pocitos", count: 46 },
  { name: "Punta del Este", slug: "punta-del-este", count: 128 },
  { name: "Maldonado", slug: "maldonado", count: 128 },
  { name: "Centro", slug: "centro", count: 43 },
  { name: "Cordon", slug: "cordon", count: 36 },
];

export default function SeoLocationsBlock() {
  return (
    <nav className="vv-seo-locations" aria-label="Ubicaciones populares">
      <h2 className="vv-seo-locations-title">Encontra escorts en</h2>
      <ul className="vv-seo-locations-grid">
        {locations.map((loc) => (
          <li key={loc.slug} className="vv-seo-locations-item">
            <Link
              href={`/mujeres/${loc.slug}`}
              className="vv-seo-locations-link"
              data-testid={`seo-link-${loc.slug}`}
            >
              <span className="vv-seo-locations-name">{loc.name}</span>
              <span className="vv-seo-locations-count">{loc.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
