import { ArrowLeftRight, ImageOff, Package } from "lucide-react";
import { useEffect, useState } from "react";
import type { Listing, ListingStatus } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Badge, Callout, CopyId, DetailList, SectionLabel, type Tone } from "./ui/kit";

/** İlan durumunun ekranda görünen adı ve rengi */
export function listingStatusMeta(status: ListingStatus): { label: string; tone: Tone } {
  switch (status) {
    case "pending":
    case "incelemede":
      return { label: "Onay bekliyor", tone: "warn" };
    case "revision_requested":
      return { label: "Düzenleme istendi", tone: "warn" };
    case "approved":
    case "yayinda":
      return { label: "Yayında", tone: "ok" };
    case "completed":
    case "takaslandi":
      return { label: "Takaslandı", tone: "info" };
    case "deleted":
      return { label: "Kaldırıldı", tone: "mute" };
    default:
      return { label: "Reddedildi", tone: "bad" };
  }
}

export function ListingStatusBadge({ status }: { status: ListingStatus }) {
  const m = listingStatusMeta(status);
  return (
    <Badge tone={m.tone} dot>
      {m.label}
    </Badge>
  );
}

/** Küçük ilan görseli (liste ve tablolar için) */
export function ListingThumb({ listing, className }: { listing: Listing; className?: string }) {
  const [broken, setBroken] = useState(false);
  const src = listing.images?.[0];
  return (
    <span className={cn("relative block shrink-0 overflow-hidden rounded-lg border border-line bg-shell", className ?? "size-12")}>
      {src && !broken ? (
        <img src={src} alt="" loading="lazy" className="size-full object-cover" onError={() => setBroken(true)} />
      ) : (
        <span className="grid size-full place-items-center text-muted/60">
          <Package className="size-5" />
        </span>
      )}
      {listing.images && listing.images.length > 1 ? (
        <span className="absolute bottom-0.5 right-0.5 rounded bg-ink/75 px-1 text-[10px] font-semibold leading-4 text-card">
          +{listing.images.length - 1}
        </span>
      ) : null}
    </span>
  );
}

function Gallery({ listing }: { listing: Listing }) {
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [listing.id]);
  const images = listing.images ?? [];

  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-line bg-shell/50 text-xs text-muted sm:aspect-video">
        <ImageOff className="size-5" />
        Bu ilanda fotoğraf yok.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-line bg-shell sm:aspect-video">
        <img src={images[index] || images[0]} alt={listing.title} className="size-full object-contain" />
        {images.length > 1 ? (
          <span className="absolute bottom-2 right-2 rounded-md bg-ink/75 px-2 py-0.5 text-xs font-medium text-card">
            {index + 1} / {images.length}
          </span>
        ) : null}
      </div>
      {images.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {images.map((img, i) => (
            <button
              key={img + i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`${i + 1}. fotoğraf`}
              aria-current={i === index}
              className={cn(
                "size-14 shrink-0 overflow-hidden rounded-lg border-2",
                i === index ? "border-forest" : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <img src={img} alt="" loading="lazy" className="size-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** İlan detay çekmecesinin içeriği (ilanlar ve şikayetler sayfalarında ortak) */
export function ListingDetailBody({ listing, notice }: { listing: Listing; notice?: React.ReactNode }) {
  const isCompleted = listing.status === "completed" || listing.status === "takaslandi";
  return (
    <div className="space-y-5">
      {notice}
      <Gallery listing={listing} />

      <div className="flex flex-wrap items-center gap-2">
        <ListingStatusBadge status={listing.status} />
        <Badge>{listing.category}</Badge>
        {listing.condition ? <Badge>{listing.condition}</Badge> : null}
      </div>

      {listing.adminNote ? (
        <Callout tone="warn">
          <p className="font-semibold">Yönetici notu (düzenleme / red nedeni)</p>
          <p className="mt-0.5 whitespace-pre-wrap">{listing.adminNote}</p>
        </Callout>
      ) : null}

      {isCompleted ? (
        <Callout>
          Bu ilanın takası tamamlandı. Geçmiş kaydı olarak korunur; düzenlenemez, kaldırılamaz veya tekrar yayına
          alınamaz.
        </Callout>
      ) : null}

      <div>
        <SectionLabel>İstenen takas</SectionLabel>
        <p className="flex items-start gap-2 rounded-xl border border-line bg-shell/50 p-3 text-sm text-ink">
          <ArrowLeftRight className="mt-0.5 size-4 shrink-0 text-forest" />
          <span className="min-w-0 break-words">{listing.wants?.trim() || "Açık teklif"}</span>
        </p>
      </div>

      <div>
        <SectionLabel>Açıklama</SectionLabel>
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink/90">
          {listing.description || "Açıklama girilmemiş."}
        </p>
      </div>

      <div>
        <SectionLabel>Bilgiler</SectionLabel>
        <DetailList
          items={[
            { label: "İlan sahibi", value: listing.ownerName },
            { label: "Telefon", value: <span className="font-mono text-xs">{listing.ownerPhone}</span> },
            { label: "Konum", value: listing.city },
            { label: "Eklenme", value: listing.created },
          ]}
        />
      </div>

      <div className="rounded-xl border border-line">
        <CopyId label="İlan ID" value={listing.id} />
      </div>
    </div>
  );
}
