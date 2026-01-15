import { useRealtime } from "@/components/hooks/use-realtime";
import { pb } from "@/services/pocketbase";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: users, loading, error } = useRealtime('users');

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  console.log(users);

  

  return <div>
    <h1>Dashboard</h1>
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