"use server";

import { z } from "zod";
import { AuthError } from "next-auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { signIn } from "@/auth";
import { loginSchema } from "@/lib/schemas/login";
import { auditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/request-context";

export type LoginFormState = {
  errors?: {
    email?: string[];
    password?: string[];
  };
  message?: string;
};

function isNextRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export async function authenticateUser(
  _prevState: LoginFormState | undefined,
  formData: FormData
): Promise<LoginFormState> {
  const ip = await getClientIp();
  const { env } = getCloudflareContext();
  const { success: withinLimit } = await env.LOGIN_LIMITER.limit({
    key: `login:${ip}`,
  });
  if (!withinLimit) {
    auditLog({
      actor: ip,
      action: "user.login",
      outcome: "failure",
      details: { reason: "rate_limited" },
    });
    return { message: "Too many attempts. Try again in a minute." };
  }

  const validatedFields = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    const tree = z.treeifyError(validatedFields.error);
    return {
      errors: {
        email: tree.properties?.email?.errors,
        password: tree.properties?.password?.errors,
      },
      message: "Please fix the errors below.",
    };
  }

  const { email } = validatedFields.data;
  const redirectTo = formData.get("redirectTo");

  try {
    await signIn("credentials", {
      email,
      password: validatedFields.data.password,
      redirectTo: typeof redirectTo === "string" ? redirectTo : "/notebook",
    });
  } catch (error) {
    // signIn() redirects on success, which throws a NEXT_REDIRECT
    // control-flow error — that's the only way to observe a login success
    // here, since no code after a successful signIn() call ever runs.
    if (isNextRedirectError(error)) {
      auditLog({
        actor: email,
        action: "user.login",
        outcome: "success",
      });
      throw error;
    }

    if (error instanceof AuthError) {
      auditLog({
        actor: email,
        action: "user.login",
        outcome: "failure",
        details: { reason: error.type },
      });
      switch (error.type) {
        case "CredentialsSignin":
          return { message: "Invalid email or password." };
        default:
          return { message: "Something went wrong. Please try again." };
      }
    }
    throw error;
  }

  return {};
}
