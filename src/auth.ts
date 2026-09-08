import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { findUserByEmail, type Role } from "@/lib/data/users";
import { verifyPassword } from "@/lib/auth/password";

declare module "next-auth" {
  interface User {
    role: Role;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      role: Role;
    };
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email =
          typeof credentials?.email === "string" ? credentials.email : null;
        const password =
          typeof credentials?.password === "string"
            ? credentials.password
            : null;

        if (!email || !password) return null;

        const user = await findUserByEmail(email);
        if (!user) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) (token as { role?: Role }).role = user.role;
      return token;
    },
    session: ({ session, token }) => {
      const role = (token as { role?: Role }).role;
      if (role) session.user.role = role;
      return session;
    },
  },
});
