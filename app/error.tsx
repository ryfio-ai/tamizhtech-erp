'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RefreshCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md border-0 shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-10 w-10 text-brand" />
          </div>
          <CardTitle className="text-2xl font-bold text-navy">Something went wrong!</CardTitle>
          <CardDescription className="pt-2 text-gray-500">
            We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-40">
                <p className="text-xs font-mono text-gray-600 break-all">
                    {error.message || "An unknown error occurred."}
                </p>
            </div>
        </CardContent>
        <CardFooter className="flex gap-4 pt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => window.location.href = '/'}
          >
            Go to Home
          </Button>
          <Button
            className="flex-1 bg-brand hover:bg-brand-dark text-white"
            onClick={() => reset()}
          >
            <RefreshCcw className="mr-2 h-4 w-4" /> Try Again
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
