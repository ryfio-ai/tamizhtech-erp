import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "admin@tamizhtech.in" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const email = credentials.email.trim().toLowerCase();
          const user = await prisma.user.findFirst({
            where: { 
              email: { equals: email, mode: "insensitive" } 
            }
          });

          if (!user || !user.passwordHash) {
            console.warn(`[AUTH] Login failed: User not found for ${email}`);
            return null;
          }

          const isValid = await bcrypt.compare(credentials.password, user.passwordHash);

          if (!isValid) {
            console.warn(`[AUTH] Login failed: Invalid password for ${email}`);
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error: any) {
          console.error("[AUTH] Database error during authorize:", error);
          throw new Error(error.message || "Database connection error during authentication.");
        }
      }
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "2588c5fd44fb0ef1766e4542e3d5610329423b0f04df86b3b996955468fbebda",
};
