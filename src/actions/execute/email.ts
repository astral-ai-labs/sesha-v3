"use server";

/* ==========================================================================*/
// email.ts — Email Service for Pipeline Notifications
/* ==========================================================================*/
// Purpose: Handle email notifications for pipeline completion
// Sections: Imports, Configuration, Email Functions, Exports

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// Core Modules ---
import "server-only";

// Local Utils ----
import { getAuthenticatedUserServer } from "@/lib/supabase/server";

/* ==========================================================================*/
// Configuration
/* ==========================================================================*/

const baseUrl = process.env.NEXT_PUBLIC_URL;

// Validate API URL
if (!baseUrl) {
  console.error("⚠️ Missing NEXT_PUBLIC_URL environment variable. Email notifications will not work correctly.");
}

/* ==========================================================================*/
// Email Functions
/* ==========================================================================*/

/**
 * sendCompletionEmail
 *
 * Send completion email to user when pipeline succeeds.
 *
 * @param slug - Article slug for URL
 * @param currentVersion - Current version number (null for new articles)
 * @returns Promise that resolves when email is sent
 */
export async function sendCompletionEmail(
  slug: string, 
  currentVersion: number | null,
): Promise<void> {
  try {
    // Get user email from database
    const user = await getAuthenticatedUserServer();
    
    if (!user || !user.email) {
      console.log("⚠️ Could not fetch user email for completion notification");
      return;
    }

    // Calculate version for URL
    const version = currentVersion ? currentVersion : 1;

    // Construct href URL
    const href = `${baseUrl}/article?slug=${slug}&version=${version}`;

    // Send email
    const emailResponse = await fetch(`${baseUrl}/api/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: [user.email],
        subject: `Article Complete: ${slug} version ${version}`,
        href: href,
        name: user.firstName || "User",
        slug: slug,
        version: version,
      }),
    });

    if (!emailResponse.ok) {
      throw new Error(`Email API request failed: ${emailResponse.statusText}`);
    }

    console.log(`📧 Completion email sent to: ${user.email}`);
  } catch (error) {
    console.error("Failed to send completion email:", error);
    // Don't throw error - email failure shouldn't break pipeline
  }
}
