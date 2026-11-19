import { Check, Copy, Search, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Sekmeler: mobilde yatay kaydırılır, sayılar sağda                    */
/* ------------------------------------------------------------------ */

export interface TabItem<T extends string> {
  value: T;
  label: string;
  count?: number;
  /** Bekleyen iş varsa sayı vurgulu gösterilir */
  attention?: boolean;
}

export function FilterTabs<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="-mx-3 overflow-x-auto no-scrollbar px-3 sm:mx-0 sm:px-0">
      <div role="tablist" aria-label={ariaLabel} className="flex min-w-max gap-1 border-b border-line">
        {items.map((t) => {
          const active = t.value === value;
          return (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(t.value)}
              className={cn(
                "relative -mb-px inline-flex h-11 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-sm font-medium transition-colors",
                active ? "border-forest text-ink" : "border-transparent text-muted hover:text-ink",
              )}
            >
              {t.label}
              {typeof t.count === "number" ? (
                <span
                  className={cn(
                    "min-w-5 rounded-full px-1.5 py-px text-center text-[11px] font-semibold tabular-nums",
                    t.attention && t.count > 0
                      ? "bg-warn text-white"
                      : active
                        ? "bg-forest text-card"
                        : "bg-shell text-muted",
                  )}
                >
                  {t.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Arama kutusu                                                         */
/* ------------------------------------------------------------------ */

export function SearchField({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <label className={cn("relative flex h-11 items-center", className)}>
      <span className="sr-only">{placeholder}</span>
      <Search className="pointer-events-none absolute left-3 size-4 text-muted" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-full w-full rounded-xl border border-line bg-card pl-9 pr-9 text-sm text-ink outline-none placeholder:text-muted/80 focus:border-forest focus:ring-2 focus:ring-forest/15 [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Aramayı temizle"
          className="absolute right-1.5 grid size-8 place-items-center rounded-lg text-muted hover:bg-shell hover:text-ink"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Seçim kutusu                                                         */
/* ------------------------------------------------------------------ */

export function SelectField({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label: string;
  className?: string;
}) {
  return (
    <label className={cn("relative block", className)}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-line bg-card pl-3 pr-8 text-sm text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted"
        fill="currentColor"
      >
        <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" />
      </svg>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Boş durum                                                            */
/* ------------------------------------------------------------------ */

export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      {Icon ? (
        <span className="mb-3 grid size-11 place-items-center rounded-full bg-shell text-muted">
          <Icon className="size-5" />
        </span>
      ) : null}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {hint ? <p className="mt-1 max-w-sm text-xs text-muted">{hint}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Rozet                                                                */
/* ------------------------------------------------------------------ */

export type Tone = "ok" | "warn" | "bad" | "mute" | "info";

const toneClass: Record<Tone, string> = {
  ok: "bg-accent-soft text-accent-fg",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  mute: "bg-shell text-muted",
  info: "bg-info-soft text-forest",
};

export function Badge({
  tone = "mute",
  children,
  className,
  dot,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
        toneClass[tone],
        className,
      )}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current" aria-hidden /> : null}
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Detay alanları                                                       */
/* ------------------------------------------------------------------ */

export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn("mb-2 text-xs font-semibold text-muted", className)}>{children}</h3>;
}

/** Etiket–değer listesi (dl) */
export function DetailList({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="divide-y divide-line rounded-xl border border-line">
      {items.map((it) => (
        <div key={it.label} className="flex items-start justify-between gap-4 px-3 py-2.5 text-sm">
          <dt className="shrink-0 text-muted">{it.label}</dt>
          <dd className="min-w-0 break-words text-right font-medium text-ink">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Kopyalanabilir kimlik satırı */
export function CopyId({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2">
      <div className="min-w-0">
        <p className="text-[11px] text-muted">{label}</p>
        <p className="truncate font-mono text-xs text-ink">{value}</p>
      </div>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(value).then(
            () => {
              setCopied(true);
              toast.success(`${label} kopyalandı.`);
              setTimeout(() => setCopied(false), 1500);
            },
            () => toast.error("Kopyalanamadı."),
          );
        }}
        aria-label={`${label} kopyala`}
        className="grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-shell hover:text-ink"
      >
        {copied ? <Check className="size-4 text-forest" /> : <Copy className="size-4" />}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Metin alanı                                                          */
/* ------------------------------------------------------------------ */

export function TextAreaField({
  id,
  label,
  hint,
  value,
  onChange,
  rows = 3,
  maxLength,
  placeholder,
  required,
}: {
  id: string;
  label: string;
  hint?: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
        {required ? <span className="text-bad"> *</span> : null}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        className="w-full rounded-xl border border-line bg-card p-3 text-sm leading-relaxed text-ink outline-none placeholder:text-muted/70 focus:border-forest focus:ring-2 focus:ring-forest/15"
      />
      {hint ? <p className="text-xs leading-relaxed text-muted">{hint}</p> : null}
    </div>
  );
}

/** Hazır metin seçenekleri (şablonlar) */
export function PresetChips({ presets, onPick }: { presets: string[]; onPick: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {presets.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPick(p)}
          className="rounded-lg border border-line bg-card px-2.5 py-1.5 text-left text-xs text-ink/80 hover:border-forest/40 hover:bg-shell"
        >
          {p}
        </button>
      ))}
    </div>
  );
}

/** Bilgi / uyarı kutusu */
export function Callout({
  tone = "info",
  children,
  icon: Icon,
}: {
  tone?: "info" | "warn" | "bad";
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const cls = {
    info: "border-line bg-shell/60 text-ink/80",
    warn: "border-warn/25 bg-warn-soft text-warn",
    bad: "border-bad/20 bg-bad-soft text-bad",
  }[tone];
  return (
    <div className={cn("flex items-start gap-2.5 rounded-xl border p-3 text-xs leading-relaxed", cls)}>
      {Icon ? <Icon className="mt-px size-4 shrink-0" /> : null}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
