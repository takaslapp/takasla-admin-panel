export type UserStatus = "aktif" | "yeni";
export type ListingStatus = "yayinda" | "incelemede" | "reddedildi" | "silindi";
export type ReportStatus = "acik" | "inceleniyor" | "cozuldu" | "reddedildi";
export type SuggestionStatus = "yeni" | "degerlendiriliyor" | "uygulandi" | "arsiv";

export type User = {
  id: string;
  name: string;
  username: string;
  phone: string;
  city: string;
  avatar: string;
  listingsCount: number;
  joined: string;
  role: string;
};

export type Listing = {
  id: string;
  title: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  category: string;
  city: string;
  wants: string;
  condition: string;
  description: string;
  status: ListingStatus;
  created: string;
  rejectReason?: string;
};

export type Report = {
  id: string;
  subject: string;
  reporter: string;
  target: string;
  type: string;
  status: ReportStatus;
  created: string;
  detail: string;
};

export type Suggestion = {
  id: string;
  title: string;
  author: string;
  votes: number;
  status: SuggestionStatus;
  created: string;
};

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "Belirtilmemiş";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `0${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8, 10)}`;
  } else if (cleaned.length === 11 && cleaned.startsWith("0")) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 9)} ${cleaned.slice(9, 11)}`;
  }
  return phone;
}

export const USERS: User[] = [
  {
    id: "u-1",
    name: "Recep Aydoğan",
    username: "recep",
    phone: "0505 063 85 43",
    city: "Konya",
    avatar: "/avatars/ayse.jpg",
    listingsCount: 2,
    joined: "02.09.2026 01:11",
    role: "Kullanıcı",
  },
  {
    id: "u-2",
    name: "Selman Aydoğan",
    username: "selman",
    phone: "0555 123 45 67",
    city: "İstanbul",
    avatar: "/avatars/can.jpg",
    listingsCount: 3,
    joined: "01.09.2026 14:20",
    role: "Yönetici",
  },
];

export const LISTINGS: Listing[] = [
  {
    id: "l-1",
    title: "DJI Mini 5 Pro",
    ownerId: "u-1",
    ownerName: "Recep Aydoğan",
    ownerPhone: "0505 063 85 43",
    category: "Elektronik & Teknoloji",
    city: "İstanbul, Kadıköy",
    wants: "Iphone 15-16",
    condition: "Temiz / Sorunsuz Çalışıyor",
    description: "Drone Dji marka ve temizdir",
    status: "yayinda",
    created: "04.09.2026 22:06",
  },
];

export const REPORTS: Report[] = [];

export const SUGGESTIONS: Suggestion[] = [
  {
    id: "ON-88",
    title: "Takas işlemlerine güvenli kurye entegrasyonu",
    author: "Recep Aydoğan",
    votes: 42,
    status: "degerlendiriliyor",
    created: "02.09.2026",
  },
];
