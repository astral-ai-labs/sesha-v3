/* ==========================================================================*/
// page.tsx — Dashboard page entry point
/* ==========================================================================*/
// Purpose: Authenticates user, fetches org, and renders the dashboard client component
// Sections: Imports, Component, Exports
/* ==========================================================================*/

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { getOrganization } from "@/db/dal";
import { getAuthenticatedUserServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/* ==========================================================================*/
// Component
/* ==========================================================================*/

export default async function DashboardPage() {
  const user = await getAuthenticatedUserServer();
  if (!user) {
    redirect("/login");
  }

  const organization = await getOrganization(user.orgId);

  if (!organization) {
    throw new Error("Organization not found for user");
  }

  return (
    <div className="w-full space-y-6 px-6">
      <DashboardClient orgName={organization.name} orgId={organization.id} />
    </div>
  );
}
