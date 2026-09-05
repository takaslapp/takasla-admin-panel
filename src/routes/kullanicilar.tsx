import { createFileRoute } from "@tanstack/react-router";
import { UsersPage } from "@/components/pages";

export const Route = createFileRoute("/kullanicilar")({ component: UsersPage });
