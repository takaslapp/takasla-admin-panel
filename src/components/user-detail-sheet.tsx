import { Bell } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Listing, User } from "@/lib/data";
import type { Suspension } from "@/lib/suspensions";
import { ListingStatusBadge, ListingThumb } from "./listing-detail";
import { Badge, CopyId, DetailList, SectionLabel } from "./ui/kit";
import { Button } from "./ui/button";
import { Sheet } from "./ui/sheet";
import { UserSuspensionSection } from "./user-suspension";

export function UserAvatar({ user, className }: { user: Pick<User, "avatar" | "name">; className?: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <img
      src={!broken && user.avatar ? user.avatar : "/images/takasla-icon.jpg"}
      alt=""
      loading="lazy"
      onError={() => setBroken(true)}
      className={className ?? "size-10 shrink-0 rounded-full bg-shell object-cover ring-1 ring-line"}
    />
  );
}

export function handle(username?: string) {
  if (!username) return "";
  return username.startsWith("@") ? username : `@${username}`;
}

/** Bildirim sayfasını bu kullanıcı alıcı olarak seçili halde açar. */
export function goToDirectNotification(user: User) {
  toast.info(`${user.name} için bildirim sayfası açılıyor…`);
  window.location.href = `/bildirimler?kullanici=${encodeURIComponent(user.id)}`;
}

interface Props {
  user: User | null;
  onClose: () => void;
  listings: Listing[];
  suspensions: Suspension[];
  /** Askıya alma / kaldırma sonrası verileri yeniler */
  onChanged: () => void;
  /** Çekmecenin üstünde gösterilecek bağlam (ör. hangi şikayetten açıldığı) */
  context?: React.ReactNode;
}

/** Kullanıcı detay çekmecesi: profil, ilanlar, askıya alma */
export function UserDetailSheet({ user, onClose, listings, suspensions, onChanged, context }: Props) {
  const userListings = user ? listings.filter((l) => l.ownerId === user.id) : [];
  const history = user ? suspensions.filter((s) => s.user_id === user.id) : [];
  const isSuspended = history.some((s) => !s.lifted_at);

  return (
    <Sheet
      open={!!user}
      onClose={onClose}
      title={
        user ? (
          <span className="flex items-center gap-3">
            <UserAvatar user={user} className="size-10 shrink-0 rounded-full bg-shell object-cover ring-1 ring-line" />
            <span className="min-w-0">
              <span className="block truncate">{user.name}</span>
              <span className="block truncate font-mono text-xs font-normal text-muted">{handle(user.username)}</span>
            </span>
          </span>
        ) : (
          ""
        )
      }
      footer={
        user ? (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" size="md" onClick={onClose}>
              Kapat
            </Button>
            <Button variant="primary" size="md" onClick={() => goToDirectNotification(user)}>
              <Bell className="size-4" />
              Bildirim gönder
            </Button>
          </div>
        ) : null
      }
    >
      {user ? (
        <div className="space-y-5">
          {context}
          <div className="flex flex-wrap gap-2">
            <Badge tone={user.role === "Yönetici" ? "info" : "mute"}>{user.role}</Badge>
            {isSuspended ? (
              <Badge tone="bad" dot>
                Askıda
              </Badge>
            ) : null}
          </div>

          <DetailList
            items={[
              { label: "Telefon", value: <span className="font-mono text-xs">{user.phone || "—"}</span> },
              { label: "Şehir", value: user.city || "—" },
              { label: "Aktif ilan", value: `${user.listingsCount || 0}` },
              { label: "Kayıt", value: user.joined || "—" },
            ]}
          />

          <div className="rounded-xl border border-line">
            <CopyId label="Kullanıcı ID" value={user.id} />
          </div>

          <div>
            <SectionLabel>Askıya alma</SectionLabel>
            {user.role === "Yönetici" ? (
              <p className="text-xs text-muted">Yönetici hesapları askıya alınamaz.</p>
            ) : (
              <UserSuspensionSection
                userId={user.id}
                userName={user.name}
                isAdminUser={false}
                history={history}
                onChanged={onChanged}
              />
            )}
          </div>

          <div>
            <SectionLabel>İlanları ({userListings.length})</SectionLabel>
            {userListings.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line p-4 text-center text-xs text-muted">
                Bu kullanıcının ilanı yok.
              </p>
            ) : (
              <ul className="divide-y divide-line rounded-xl border border-line">
                {userListings.map((l) => (
                  <li key={l.id} className="flex items-center gap-3 px-3 py-2.5">
                    <ListingThumb listing={l} className="size-10" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{l.title}</p>
                      <p className="truncate text-xs text-muted">
                        {l.category} · {l.city}
                      </p>
                    </div>
                    <ListingStatusBadge status={l.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}
