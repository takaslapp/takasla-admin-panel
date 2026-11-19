import { createFileRoute } from "@tanstack/react-router";
import { AuditLogPage } from "@/components/audit-log-page";

export const Route = createFileRoute("/islem-kaydi")({ component: AuditLogPage });
