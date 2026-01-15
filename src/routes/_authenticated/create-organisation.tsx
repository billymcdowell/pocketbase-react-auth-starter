import { createFileRoute } from '@tanstack/react-router'
import { CreateOrganizationForm } from '@/components/interfaces/auth/auth'

export const Route = createFileRoute('/_authenticated/create-organisation')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>
    <h1>Create Organisation</h1>
    <CreateOrganizationForm />
  </div>
}
