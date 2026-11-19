import { createFileRoute } from "@tanstack/react-router";
import { ListingsPage } from "@/components/listings-page";

export const Route = createFileRoute("/ilanlar")({ component: ListingsPage });
