import { createFileRoute } from "@tanstack/react-router";
import { ListingsPage } from "@/components/pages";

export const Route = createFileRoute("/ilanlar")({ component: ListingsPage });
