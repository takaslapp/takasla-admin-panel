import { createFileRoute } from "@tanstack/react-router";
import { BannersPage } from "@/components/banners-page";

export const Route = createFileRoute("/bannerlar")({
  component: BannersPage,
});
