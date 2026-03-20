import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'TamizhTech Admin',
      credentials: {
        username: { label: "Username", type: "text", placeholder: "admin" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials: any) {
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
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }: any) {
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

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
