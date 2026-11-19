import { ChevronRight, RefreshCw, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { User } from "@/lib/data";
import { useAdminStore } from "@/lib/store";
import { activeSuspensionMap, fetchSuspensions, type Suspension } from "@/lib/suspensions";
import { AdminShell } from "./admin-shell";
import { Badge, EmptyState, FilterTabs, SearchField, SelectField } from "./ui/kit";
import { Button } from "./ui/button";
import { handle, UserAvatar, UserDetailSheet } from "./user-detail-sheet";

type Filter = "all" | "with_listings" | "no_listings" | "suspended" | "admin";
type Sort = "newest" | "listings" | "name";

function parseDateString(d?: string): number {
  if (!d) return 0;
  const t = Date.parse(d);
  if (!isNaN(t)) return t;
  const match = d.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (match) {
    const [, day, month, year] = match;
    return new Date(Number(year), Number(month) - 1, Number(day)).getTime();
  }
  return 0;
}

/** "12.11.2026 10:20" → "12.11.2026" (listede saat gereksiz) */
const dateOnly = (s?: string) => (s ? s.split(" ")[0] : "—");

export function UsersPage() {
  const fetchDashboardData = useAdminStore((s) => s.fetchDashboardData);
  const users = useAdminStore((s) => s.users);
  const listings = useAdminStore((s) => s.listings);
  const isLoading = useAdminStore((s) => s.isLoading);

  const [q, setQ] = useState("");
  const [activeFilter, setActiveFilter] = useState<Filter>("all");
  const [sortBy, setSortBy] = useState<Sort>("newest");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Askı kayıtları (aktif + geçmiş)
  const [suspensions, setSuspensions] = useState<Suspension[]>([]);
  const reloadSuspensions = () => {
    fetchSuspensions().then(setSuspensions);
  };
  useEffect(reloadSuspensions, []);
  const suspendedMap = useMemo(() => activeSuspensionMap(suspensions), [suspensions]);

  const counts = useMemo(
    () => ({
      all: users.length,
      with_listings: users.filter((u) => (u.listingsCount || 0) > 0).length,
      no_listings: users.filter((u) => (u.listingsCount || 0) === 0).length,
      suspended: users.filter((u) => suspendedMap.has(u.id)).length,
      admin: users.filter((u) => u.role === "Yönetici").length,
    }),
    [users, suspendedMap],
  );

  const rows = useMemo(() => {
    let result = users;
    if (activeFilter === "with_listings") result = result.filter((u) => (u.listingsCount || 0) > 0);
    else if (activeFilter === "no_listings") result = result.filter((u) => (u.listingsCount || 0) === 0);
    else if (activeFilter === "admin") result = result.filter((u) => u.role === "Yönetici");
    else if (activeFilter === "suspended") result = result.filter((u) => suspendedMap.has(u.id));

    if (q.trim()) {
      const query = q.toLowerCase().replace("@", "").trim();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(query) ||
          u.username.toLowerCase().replace("@", "").includes(query) ||
          u.city.toLowerCase().includes(query) ||
          (u.phone && u.phone.includes(query)) ||
          u.id.toLowerCase().includes(query),
      );
    }

    return [...result].sort((a, b) => {
      if (sortBy === "newest") {
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : parseDateString(a.joined);
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : parseDateString(b.joined);
        return tB - tA;
      }
      if (sortBy === "listings") return (b.listingsCount || 0) - (a.listingsCount || 0);
      if (sortBy === "name") return a.name.localeCompare(b.name, "tr");
      return 0;
    });
  }, [users, suspendedMap, q, activeFilter, sortBy]);

  const selectedUser: User | null = useMemo(
    () => (selectedId ? (users.find((u) => u.id === selectedId) ?? null) : null),
    [users, selectedId],
  );

  const tabs = [
    { value: "all" as const, label: "Tümü", count: counts.all },
    { value: "with_listings" as const, label: "İlanı olanlar", count: counts.with_listings },
    { value: "no_listings" as const, label: "İlansız", count: counts.no_listings },
    { value: "suspended" as const, label: "Askıda", count: counts.suspended },
    { value: "admin" as const, label: "Yöneticiler", count: counts.admin },
  ];

  const StatusCell = ({ u }: { u: User }) =>
    suspendedMap.has(u.id) ? (
      <Badge tone="bad" dot>
        Askıda
      </Badge>
    ) : u.role === "Yönetici" ? (
      <Badge tone="info">Yönetici</Badge>
    ) : (
      <Badge tone="ok" dot>
        Aktif
      </Badge>
    );

  return (
    <AdminShell
      compact
      kicker="Topluluk"
      title="Kullanıcılar"
      actions={
        <Button
          variant="pill"
          size="sm"
          onClick={() => {
            fetchDashboardData();
            reloadSuspensions();
            toast.info("Kullanıcı listesi güncellendi.");
          }}
          disabled={isLoading}
        >
          <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Yenile
        </Button>
      }
    >
      <div className="space-y-4">
        <FilterTabs items={tabs} value={activeFilter} onChange={setActiveFilter} ariaLabel="Kullanıcı filtresi" />

        <div className="flex flex-col gap-2 sm:flex-row">
          <SearchField
            value={q}
            onChange={setQ}
            placeholder="İsim, @kullanıcı adı, telefon, şehir veya ID"
            className="sm:flex-1"
          />
          <SelectField
            label="Sıralama"
            value={sortBy}
            onChange={(v) => setSortBy(v as Sort)}
            className="sm:w-48"
            options={[
              { value: "newest", label: "En yeni kayıt" },
              { value: "listings", label: "En çok ilanı olan" },
              { value: "name", label: "İsim (A–Z)" },
            ]}
          />
        </div>

        <section className="overflow-hidden rounded-2xl border border-line bg-card">
          {rows.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Kullanıcı bulunamadı"
              hint="Farklı bir isim, @kullanıcı adı veya şehir dene."
            />
          ) : (
            <>
              {/* Mobil liste */}
              <ul className="divide-y divide-line md:hidden">
                {rows.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(u.id)}
                      className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-shell/60"
                    >
                      <UserAvatar user={u} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-ink">{u.name}</span>
                          {suspendedMap.has(u.id) ? (
                            <Badge tone="bad" className="shrink-0">
                              Askıda
                            </Badge>
                          ) : u.role === "Yönetici" ? (
                            <Badge tone="info" className="shrink-0">
                              Yönetici
                            </Badge>
                          ) : null}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {handle(u.username)} · {u.city || "—"}
                        </span>
                        <span className="block text-xs text-muted">
                          {u.listingsCount || 0} ilan · Kayıt {dateOnly(u.joined)}
                        </span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted" />
                    </button>
                  </li>
                ))}
              </ul>

              {/* Masaüstü tablo */}
              <table className="hidden w-full table-fixed text-left text-sm md:table">
                <thead className="border-b border-line bg-shell/50 text-xs text-muted">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Kullanıcı</th>
                    <th className="w-40 px-2 py-2.5 font-medium">Telefon</th>
                    <th className="hidden w-32 px-2 py-2.5 font-medium lg:table-cell">Şehir</th>
                    <th className="w-20 px-2 py-2.5 text-right font-medium">İlan</th>
                    <th className="hidden w-32 px-2 py-2.5 font-medium lg:table-cell">Kayıt</th>
                    <th className="w-28 px-2 py-2.5 font-medium">Durum</th>
                    <th className="w-10 px-2 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((u) => (
                    <tr
                      key={u.id}
                      onClick={() => setSelectedId(u.id)}
                      className="cursor-pointer transition-colors hover:bg-shell/60"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar user={u} />
                          <div className="min-w-0">
                            <button
                              type="button"
                              className="block max-w-full truncate text-left font-medium text-ink hover:underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedId(u.id);
                              }}
                            >
                              {u.name}
                            </button>
                            <p className="truncate font-mono text-xs text-muted">{handle(u.username)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="truncate px-2 py-3 font-mono text-xs text-muted">{u.phone || "—"}</td>
                      <td className="hidden truncate px-2 py-3 text-muted lg:table-cell">{u.city || "—"}</td>
                      <td className="px-2 py-3 text-right tabular-nums text-ink">{u.listingsCount || 0}</td>
                      <td className="hidden px-2 py-3 text-xs text-muted lg:table-cell">{dateOnly(u.joined)}</td>
                      <td className="px-2 py-3">
                        <StatusCell u={u} />
                      </td>
                      <td className="px-2 py-3 text-muted">
                        <ChevronRight className="size-4" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>
        {rows.length > 0 ? (
          <p className="px-1 text-xs text-muted">
            {rows.length} / {users.length} kullanıcı gösteriliyor
          </p>
        ) : null}
      </div>

      <UserDetailSheet
        user={selectedUser}
        onClose={() => setSelectedId(null)}
        listings={listings}
        suspensions={suspensions}
        onChanged={() => {
          reloadSuspensions();
          fetchDashboardData();
        }}
      />
    </AdminShell>
  );
}
