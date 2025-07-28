/* ==========================================================================*/
// page.tsx — Register page for user registration
/* ==========================================================================*/
// Purpose: Form interface for new user registration with validation and prefilled orgId
// Sections: Imports, Component, Exports

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// React core ---
import React from "react";

// Next.js core ---
import Link from "next/link";

// Components ---
import { RegisterForm } from "@/components/auth/register-form";

/* ==========================================================================*/
// Component
/* ==========================================================================*/

/**
 * RegisterPage
 *
 * Registration form component with user details and validation.
 * Supports prefilled orgId from search params which disables the field.
 */
async function RegisterPage({ searchParams }: { searchParams: Promise<{ orgId?: string }> }) {
  // Parse search parameters ---
  const { orgId } = await searchParams;

  console.log("orgId", orgId);

  return (
    <div className="space-y-6">
      {/* Start of Header --- */}
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Create Account</h1>
        <p className="text-sm text-muted-foreground">Enter your details to create a new account</p>
      </div>
      {/* End of Header ---- */}

      {/* Start of Registration Form --- */}
      <RegisterForm orgId={orgId} />
      {/* End of Registration Form ---- */}

      {/* Start of Footer Links --- */}
      <div className="space-y-2 text-center text-sm">
        <p className="text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
        <p className="text-xs text-muted-foreground">For admin use only. Contact support for organization setup.</p>
      </div>
      {/* End of Footer Links ---- */}
    </div>
  );
}

/* ==========================================================================*/
// Public Component Exports
/* ==========================================================================*/
export default RegisterPage;
