
'use client';

import { useState, type FormEvent } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { HardHat, LoaderCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/firebase';

export function LoginForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const { toast } = useToast();
  const auth = useAuth();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please enter both email and password.',
      });
      setIsSubmitting(false);
      return;
    }

    try {
      if (isSigningUp) {
        await createUserWithEmailAndPassword(auth, email, password);
        toast({
          title: 'Account Created!',
          description: 'You have been successfully signed in.',
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast({
          title: 'Signed In',
          description: 'Welcome back!',
        });
      }
      // On success, the useUser hook will automatically handle the redirect
    } catch (error: any) {
      console.error('Authentication Error:', error);
      // Provide more specific error messages
      let description = 'An unexpected error occurred. Please try again.';
      switch (error.code) {
        case 'auth/user-not-found':
          description = 'No account found with this email. Please sign up first.';
          break;
        case 'auth/wrong-password':
          description = 'Incorrect password. Please try again.';
          break;
        case 'auth/email-already-in-use':
          description = 'An account already exists with this email address.';
          break;
        case 'auth/weak-password':
          description = 'The password is too weak. It must be at least 6 characters long.';
          break;
        default:
          description = error.message;
      }
      toast({
        variant: 'destructive',
        title: 'Authentication Failed',
        description: description,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4">
          <HardHat className="h-12 w-12 text-primary" />
        </div>
        <CardTitle className="text-2xl">
          {isSigningUp ? 'Create an Account' : 'Welcome Back!'}
        </CardTitle>
        <CardDescription>
          {isSigningUp
            ? 'Enter your email and password to get started.'
            : 'Enter your credentials to access your dashboard.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              name="email"
              placeholder="m@example.com"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" name="password" required />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && (
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isSigningUp ? 'Sign Up' : 'Sign In'}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm">
          {isSigningUp ? 'Already have an account?' : "Don't have an account?"}
          <Button
            variant="link"
            className="pl-1"
            onClick={() => setIsSigningUp(!isSigningUp)}
          >
            {isSigningUp ? 'Sign In' : 'Sign Up'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
