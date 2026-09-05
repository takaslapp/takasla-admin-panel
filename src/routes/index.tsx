import { createFileRoute } from "@tanstack/react-router";
import { OverviewPage } from "@/components/overview";

export const Route = createFileRoute("/")({ component: OverviewPage });
