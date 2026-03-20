import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
});

export const config = {
  matcher: [
    '/',
    '/clients/:path*',
    '/invoices/:path*',
    '/payments/:path*',
    '/followups/:path*',
    '/applications/:path*',
    '/dashboard/:path*', // just in case
  ],
};
