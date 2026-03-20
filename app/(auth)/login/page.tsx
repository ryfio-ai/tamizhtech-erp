'use client';

import { signIn, useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-navy">
        <Loader2 className="h-12 w-12 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-navy p-4">
      <Card className="w-full max-w-md border-0 bg-white shadow-2xl">
        <CardHeader className="flex flex-col items-center space-y-4 pt-8">
          <div className="flex items-center space-x-2">
            <div className="h-12 w-12 bg-brand rounded-lg flex items-center justify-center text-white font-bold text-2xl">
              T
            </div>
            <h1 className="text-3xl font-bold text-navy tracking-tight">TamizhTech</h1>
          </div>
          <CardTitle className="text-xl font-semibold text-gray-800">Admin Portal</CardTitle>
          <CardDescription className="text-center text-gray-500">
            Sign in to manage clients, invoices, and follow-ups.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-8">
          <Button
            onClick={() => signIn('google')}
            className="w-full bg-brand hover:bg-brand-dark text-white font-medium py-6 rounded-xl transition-all shadow-lg hover:shadow-brand/20"
          >
            <svg className="mr-2 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
              <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
            </svg>
            Sign in with Google
          </Button>
          
          <div className="mt-6 text-center text-xs text-gray-400">
            This application is restricted to TamizhTech admin.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
