import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const AUTRE = '__autre__';

/** Liste déroulante d'un trait (idéal / travers), avec saisie libre « Autre ». */
export default function TraitSelect({ label, options, value, onChange }) {
  const dansListe = !value || options.includes(value);
  const [libre, setLibre] = useState(!dansListe);
  const selectValue = libre ? AUTRE : value || '';
  return (
    <div>
      <label className="block font-ui text-sm text-muted">
        {label}
        <span className="relative mt-1 block">
          <select
            value={selectValue}
            aria-label={label}
            onChange={(e) => {
              const v = e.target.value;
              if (v === AUTRE) {
                setLibre(true);
                if (options.includes(value)) onChange('');
              } else {
                setLibre(false);
                onChange(v);
              }
            }}
            className="min-h-[48px] w-full appearance-none rounded-xl bg-surface2 px-3 pr-10 text-[16px] text-ink outline-none rune-border focus:border-gold"
          >
            <option value="">— Aucun —</option>
            {options.map((o, i) => (
              <option key={o} value={o}>
                {i + 1}. {o}
              </option>
            ))}
            <option value={AUTRE}>Autre (saisie libre)…</option>
          </select>
          <ChevronDown size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
        </span>
      </label>
      {libre && (
        <input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} (texte libre)`}
          placeholder="Votre propre trait"
          className="mt-2 w-full rounded-xl bg-surface2 px-3 py-3 text-ink outline-none rune-border"
        />
      )}
    </div>
  );
}
