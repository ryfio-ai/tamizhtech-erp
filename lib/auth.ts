import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'TamizhTech Admin',
      credentials: {
        username: { label: "Username", type: "text", placeholder: "admin" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (
          credentials?.username === "adminTT" &&
          credentials?.password === "adminTT"
        ) {
          return {
            id: '1',
            name: 'TamizhTech Admin',
            email: 'admin@tamizhtech.in',
          };
        }
        return null;
      }
    }),
  ],
  callbacks: {
    async signIn() {
       return true;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
        if (user) {
            token.id = user.id;
        }
        return token;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || 'tamizhtech-secret-key-123456',
};
