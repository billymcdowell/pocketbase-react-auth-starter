import { useRealtime } from "@/components/hooks/use-realtime";
import { pb } from "@/services/pocketbase";
import { createFileRoute, useRouter } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: users, loading, error } = useRealtime('users');
  const router = useRouter();
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const logout = () => {
    pb.authStore.clear();
    router.navigate({ to: "/auth/login" });
  };


  console.log(pb.authStore.model);
  console.log(users);
  return <div>
    <h1>Dashboard</h1>
    <button onClick={logout}>Sign Out</button>
    <p>Current Organization: {pb.authStore.model?.current_org}</p>
    <p>Organizations: {pb.authStore.model?.orgs.join(", ")}</p>

    <ul>
      {users.map((user) => (
        <li key={user.id}>

        <img src={pb.getFileUrl(user, user.avatar || '')} alt={user.name} />
         <p>{user.avatar}</p>
         <p>{user.collectionId}</p>
         <p>{user.collectionName}</p>
         <p>{user.created}</p>
         <p>{user.email}</p>
         <p>{user.emailVisibility}</p>
         <p>{user.id}</p>
         <p>{user.name}</p>
         <p>{user.updated}</p>
         <p>{user.verified}</p>
        </li>
      ))}
    </ul>
  </div>;
}