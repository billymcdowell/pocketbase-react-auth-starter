import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { pb } from "@/services/pocketbase";

export const Route = createFileRoute("/_authenticated")({
  component: Outlet,
  beforeLoad: ({ context }) => {
    if (!context.isAuthenticated) throw redirect({ to: "/auth/login" });
    if (context.isAuthenticated && pb.authStore.model?.orgs?.length === 0 && window.location.pathname !== "/create-organisation") throw redirect({ to: "/create-organisation" });
  },
});
