import { createFileRoute } from "@tanstack/react-router";
import { ReportsPage } from "@/components/pages";

export const Route = createFileRoute("/sikayetler")({ component: ReportsPage });
