import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * Açık pencerelerin yığını: Escape yalnızca en üstteki pencereyi kapatır,
 * sayfa kaydırması son pencere kapanınca geri açılır.
 */
const stack: string[] = [];
let savedOverflow = "";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /**
   * side: masaüstünde sağdan açılan çekmece (detaylar için)
   * center: masaüstünde ortada pencere (onay ve form için)
   * Mobilde ikisi de alttan açılan sayfadır.
   */
  variant?: "side" | "center";
  size?: "sm" | "md" | "lg";
  /** İşlem sürerken dışarı tıklama ve Escape ile kapatmayı engeller */
  busy?: boolean;
}

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  variant = "side",
  size = "md",
  busy = false,
}: SheetProps) {
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const busyRef = useRef(busy);
  busyRef.current = busy;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    if (stack.length === 0) {
      savedOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    stack.push(id);
    panelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && stack[stack.length - 1] === id && !busyRef.current) {
        e.stopPropagation();
        closeRef.current();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      const i = stack.lastIndexOf(id);
      if (i >= 0) stack.splice(i, 1);
      if (stack.length === 0) document.body.style.overflow = savedOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, id]);

  if (!open || typeof document === "undefined") return null;

  const widths =
    variant === "side"
      ? { sm: "sm:max-w-md", md: "sm:max-w-lg", lg: "sm:max-w-2xl" }[size]
      : { sm: "sm:max-w-sm", md: "sm:max-w-md", lg: "sm:max-w-lg" }[size];

  return createPortal(
    <div className={cn("fixed inset-0", variant === "center" ? "z-[130]" : "z-[110]")}>
      <div
        className="absolute inset-0 bg-ink/40 animate-in fade-in duration-150"
        onClick={() => !busy && onClose()}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        tabIndex={-1}
        className={cn(
          "absolute flex flex-col bg-card outline-none",
          // Mobil: alttan açılan sayfa
          "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl animate-in slide-in-from-bottom-4 fade-in duration-200",
          variant === "side"
            ? "sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-full sm:rounded-none sm:slide-in-from-right-4 sm:slide-in-from-bottom-0 sm:border-l sm:border-line"
            : "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100%-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-h-[85dvh] sm:rounded-2xl sm:zoom-in-95 sm:slide-in-from-bottom-0 sm:border sm:border-line",
          widths,
        )}
      >
        {/* Mobilde sürükleme tutamağı görünümü */}
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line sm:hidden" aria-hidden />
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-4 pb-3 pt-2 sm:px-5 sm:pt-4">
          <div className="min-w-0">
            <h2 id={`${id}-title`} className="text-base font-semibold leading-snug text-ink">
              {title}
            </h2>
            {description ? <div className="mt-0.5 text-xs text-muted">{description}</div> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Kapat"
            className="-mr-1.5 grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-shell hover:text-ink disabled:opacity-40"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">{children}</div>
        {footer ? (
          <footer className="shrink-0 border-t border-line bg-card px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
