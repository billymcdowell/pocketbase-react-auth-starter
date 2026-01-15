import { pb } from "@/services/pocketbase";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  const router = useRouter();

  const ctx = Route.useRouteContext();

  const logout = () => {
    pb.authStore.clear();

    router.navigate({ to: "/" });
  };

  return (
    <div className="flex h-svh w-full items-center justify-center">
      <div className="flex max-w-sm flex-1 flex-col gap-4">
        {ctx.isAuthenticated && (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <button onClick={logout}>
              Log Out
            </button>
          </>
        )}
        {!ctx.isAuthenticated && (
          <>
            <Link to="/auth/login">Log In</Link>
            <Link to="/auth/register">Register</Link>
          </>
        )}
      </div>
    </div>
  );
}
