import { createFileRoute } from "@tanstack/react-router";
import { ReportsPage } from "@/components/reports-page";

export const Route = createFileRoute("/sikayetler")({ component: ReportsPage });
