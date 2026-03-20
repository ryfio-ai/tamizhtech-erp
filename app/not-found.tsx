import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FileQuestion, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md border-0 shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <FileQuestion className="h-10 w-10 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-navy">Page Not Found</CardTitle>
          <CardDescription className="pt-2 text-gray-500">
            The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-gray-400">
            Error Code: 404
        </CardContent>
        <CardFooter className="pt-4">
          <Button
            asChild
            className="w-full bg-brand hover:bg-brand-dark text-white font-bold py-6 rounded-xl"
          >
            <Link href="/" className="flex items-center justify-center">
              <Home className="mr-2 h-4 w-4" /> Go Back Home
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
