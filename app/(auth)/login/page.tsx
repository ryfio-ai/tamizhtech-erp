'use client';

import { signIn, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, User } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/');
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error('Invalid credentials');
        setLoading(false);
      } else {
        toast.success('Logged in successfully');
        window.location.href = '/';
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-navy">
        <Loader2 className="h-12 w-12 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-navy p-4 overflow-hidden relative">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl lg:block hidden"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl lg:block hidden"></div>

      <Card className="w-full max-w-md border-0 bg-white/95 backdrop-blur-sm shadow-2xl relative z-10 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-brand"></div>
        <CardHeader className="flex flex-col items-center space-y-4 pt-10">
          <div className="flex items-center space-x-3">
            <div className="h-14 w-14 bg-brand rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-brand/30 transform transition-transform hover:scale-110">
              T
            </div>
            <div>
              <h1 className="text-3xl font-black text-navy tracking-tighter leading-none">TamizhTech</h1>
              <p className="text-[10px] text-brand font-bold tracking-[0.2em] uppercase mt-1">Robotics & Innovation</p>
            </div>
          </div>
          <div className="text-center pt-4">
            <CardTitle className="text-2xl font-bold text-navy">Admin Access</CardTitle>
            <CardDescription className="text-gray-500 mt-2">
              Enter your credentials to access the tracking system.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pb-10 pt-4 px-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <User className="w-3 h-3" /> Username
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-gray-50 border-gray-100 focus:border-brand h-12 rounded-xl transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Lock className="w-3 h-3" /> Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-gray-50 border-gray-100 focus:border-brand h-12 rounded-xl transition-all"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-brand hover:bg-brand-dark text-white font-bold py-7 rounded-2xl transition-all shadow-xl shadow-brand/20 hover:shadow-brand/40 active:scale-[0.98]"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Login System"
              )}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-[10px] text-gray-400 font-medium leading-relaxed uppercase tracking-[0.1em]">
              Secured Enterprise Access Port<br />
              Authorized TamizhTech Personnel Only
            </p>
          </div>
        </CardContent>
      </Card>

      <p className="mt-8 text-gray-500 text-xs font-medium">
        &copy; 2026 TamizhTech Coimbatore. All Rights Reserved.
      </p>
    </div>
  );
}
