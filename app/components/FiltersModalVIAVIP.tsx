"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { type Filtros, DEFAULTS, DEPARTAMENTOS, ATIENDE_EN_OPTIONS, buildSearchParams } from "@/lib/filters";

interface FiltersModalProps {
  open: boolean;
  onClose: () => void;
  filtros: Filtros;
  serviciosOptions: string[];
}

function RangeSlider({
  label,
  min,
  max,
  valueMin,
  valueMax,
  onChange,
  formatValue,
  step,
}: {
  label: string;
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  onChange: (min: number, max: number) => void;
  formatValue: (v: number) => string;
  step?: number;
}) {
  const s = step || 1;
  const pctMin = ((valueMin - min) / (max - min)) * 100;
  const pctMax = ((valueMax - min) / (max - min)) * 100;

  return (
    <div className="vvf-range-group">
      <div className="vvf-range-label">{label}</div>
      <div className="vvf-range-values">
        <span>{formatValue(valueMin)}</span>
        <span>{formatValue(valueMax)}</span>
      </div>
      <div className="vvf-range-track-wrap">
        <div className="vvf-range-track">
          <div
            className="vvf-range-fill"
            style={{ left: `${pctMin}%`, width: `${pctMax - pctMin}%` }}
          />
        </div>
        <input
          type="range"
          className="vvf-range-input vvf-range-min"
          min={min}
          max={max}
          step={s}
          value={valueMin}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v <= valueMax) onChange(v, valueMax);
          }}
        />
        <input
          type="range"
          className="vvf-range-input vvf-range-max"
          min={min}
          max={max}
          step={s}
          value={valueMax}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v >= valueMin) onChange(valueMin, v);
          }}
        />
      </div>
    </div>
  );
}

function ChipSelect({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (val: string) => void;
}) {
  return (
    <div className="vvf-chip-group">
      <div className="vvf-range-label">{label}</div>
      <div className="vvf-chips-wrap">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`vvf-chip ${selected.includes(opt) ? "vvf-chip-active" : ""}`}
            onClick={() => onToggle(opt)}
            data-testid={`chip-${opt.toLowerCase().replace(/ /g, "-")}`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function FiltersModalVIAVIP({ open, onClose, filtros, serviciosOptions }: FiltersModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const modalBodyRef = useRef<HTMLDivElement>(null);

  const [local, setLocal] = useState<Filtros>({ ...filtros });

  useEffect(() => {
    if (open) setLocal({ ...filtros });
  }, [open, filtros]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      setTimeout(() => {
        modalBodyRef.current?.scrollTo({ top: 0, behavior: "auto" });
      }, 0);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const update = useCallback((patch: Partial<Filtros>) => {
    setLocal((prev) => ({ ...prev, ...patch }));
  }, []);

  const toggleArr = useCallback((key: "servicios" | "atiende_en", val: string) => {
    setLocal((prev) => {
      const arr = prev[key];
      return {
        ...prev,
        [key]: arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val],
      };
    });
  }, []);

  const handleApply = () => {
    const qs = buildSearchParams(local);
    router.push(`${pathname}${qs}`);
    onClose();
  };

  const handleClear = () => {
    setLocal({ ...DEFAULTS });
    router.push(pathname);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="vvf-overlay" onClick={onClose}>
      <div className="vvf-modal" onClick={(e) => e.stopPropagation()} data-testid="filters-modal">
        <div className="vvf-modal-header">
          <h2 className="vvf-modal-title">Filtros</h2>
          <button className="vvf-modal-close" onClick={onClose} data-testid="button-close-filters">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="22" height="22">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="vvf-modal-body" ref={modalBodyRef}>
          <div className="vvf-section">
            <div className="vvf-range-label">Ubicacion</div>
            <select
              className="vvf-select"
              value={local.dep || ""}
              onChange={(e) => update({ dep: e.target.value || undefined })}
              data-testid="select-departamento"
            >
              <option value="">Todos los departamentos</option>
              {DEPARTAMENTOS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <input
              className="vvf-input"
              type="text"
              placeholder="Zona (ej: Pocitos, Centro...)"
              value={local.zona || ""}
              onChange={(e) => update({ zona: e.target.value || undefined })}
              data-testid="input-zona"
            />
          </div>

          {serviciosOptions.length > 0 && (
            <ChipSelect
              label="Servicios"
              options={serviciosOptions}
              selected={local.servicios}
              onToggle={(v) => toggleArr("servicios", v)}
            />
          )}

          <ChipSelect
            label="Atencion en"
            options={ATIENDE_EN_OPTIONS}
            selected={local.atiende_en}
            onToggle={(v) => toggleArr("atiende_en", v)}
          />

          <RangeSlider
            label="Edad"
            min={18}
            max={56}
            valueMin={local.edad_min}
            valueMax={local.edad_max}
            onChange={(mn, mx) => update({ edad_min: mn, edad_max: mx })}
            formatValue={(v) => `${v} años`}
          />

          <RangeSlider
            label="Tarifa"
            min={800}
            max={10000}
            step={100}
            valueMin={local.tar_min}
            valueMax={local.tar_max}
            onChange={(mn, mx) => update({ tar_min: mn, tar_max: mx })}
            formatValue={(v) => `$${v.toLocaleString()} UYU`}
          />

          <RangeSlider
            label="Altura"
            min={140}
            max={184}
            valueMin={local.alt_min}
            valueMax={local.alt_max}
            onChange={(mn, mx) => update({ alt_min: mn, alt_max: mx })}
            formatValue={(v) => `${v} cm`}
          />
        </div>

        <div className="vvf-modal-footer">
          <button className="vvf-btn-clear" onClick={handleClear} data-testid="button-limpiar">
            Limpiar
          </button>
          <button className="vvf-btn-apply" onClick={handleApply} data-testid="button-aplicar-filtros">
            Buscar
          </button>
        </div>
      </div>
    </div>
  );
}
