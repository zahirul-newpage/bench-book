import { z } from "zod";

export const registerSchema = z.object({
  email: z.email("Enter a valid email address").trim(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(200, "Password must be 200 characters or fewer"),
  role: z.enum(["admin", "scientist"], "Select a role"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
