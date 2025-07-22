"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createUser } from "@/db/dal";

/* ==========================================================================*/
/* Types */
/* ==========================================================================*/

type ActionResult = {
  errors: Record<string, string[]>;
  message: string;
};

/* ==========================================================================*/
/* Validation Schemas */
/* ==========================================================================*/

const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  orgId: z.string().min(1, "Organization ID is required").transform(val => val.trim()),
});

/* ==========================================================================*/
/* Login Action */
/* ==========================================================================*/
export async function login(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    return {
      errors: {},
      message: error.message || "Failed to sign in. Please check your credentials.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

/* ==========================================================================*/
/* Signup Action */
/* ==========================================================================*/
export async function signup(
  prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();

  // Extract and validate form data
  const rawData = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    firstName: formData.get("firstName") as string,
    lastName: formData.get("lastName") as string,
    orgId: formData.get("orgId") as string,
  };


  // Validate the input data
  const validationResult = signupSchema.safeParse(rawData);
  
  if (!validationResult.success) {
    // Return validation errors to the form
    return {
      errors: validationResult.error.flatten().fieldErrors,
      message: "Please check the form for errors and try again.",
    };
  }

  const { email, password, firstName, lastName, orgId } = validationResult.data;

  // Create user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    return {
      errors: {},
      message: authError.message || "Failed to create account. Please try again.",
    };
  }

  if (!authData.user) {
    return {
      errors: {},
      message: "Failed to create account. Please try again.",
    };
  }

  // Create user record in our database
  try {
    await createUser({
      email,
      firstName,
      lastName,
      orgId: parseInt(orgId, 10),
      role: "member",
      isVerified: false,
    });
  } catch (dbError) {
    // If database creation fails, we should clean up the auth user
    // For now, just return an error
    console.error("Database user creation failed:", dbError);
    return {
      errors: {}, 
      message: "Failed to complete registration. Please contact support.",
    };
  }

  // Success - redirect to digest page
  revalidatePath("/", "layout");
  redirect("/digest");
}

/* ==========================================================================*/
/* Logout Action */
/* ==========================================================================*/
export async function logout() {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    redirect("/error");
  }

  revalidatePath("/", "layout");
  redirect("/login");
}
