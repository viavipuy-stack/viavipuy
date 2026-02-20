"use client";

import { useState } from "react";
import type { Filtros } from "@/lib/filters";
import type { PublicacionItem } from "@/lib/queryPublicaciones";
import FilterBarSticky from "./FilterBarSticky";
import FiltersModalVIAVIP from "./FiltersModalVIAVIP";
import ListadoGrid from "./ListadoGrid";

interface ListadoFilteredProps {
  items: PublicacionItem[];
  count: number;
  filtros: Filtros;
  basePath: string;
  hasFilters: boolean;
  serviciosOptions: string[];
}

export default function ListadoFiltered({
  items,
  count,
  filtros,
  basePath,
  hasFilters,
  serviciosOptions,
}: ListadoFilteredProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const gridItems = items.map(({ user_id, ...rest }) => rest);

  return (
    <>
      <FilterBarSticky
        count={count}
        onOpenModal={() => setModalOpen(true)}
        hasFilters={hasFilters}
      />
      <ListadoGrid items={gridItems} basePath={basePath} />
      <FiltersModalVIAVIP
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        filtros={filtros}
        serviciosOptions={serviciosOptions}
      />
    </>
  );
}
