export type LocationItem = {
  label: string;
  slug: string;
  kind: "departamento" | "ciudad" | "zona";
};

export const LOCATIONS: LocationItem[] = [
  { label: "Montevideo", slug: "montevideo", kind: "departamento" },
  { label: "Pocitos", slug: "pocitos", kind: "zona" },
  { label: "Punta del Este", slug: "punta-del-este", kind: "ciudad" },
  { label: "Maldonado", slug: "maldonado", kind: "departamento" },
  { label: "Centro", slug: "centro", kind: "zona" },
  { label: "Cordón", slug: "cordon", kind: "zona" },
];
