'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  useAuth,
  useCollection,
  useDoc,
  useFirestore,
  useMemoFirebase,
} from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { User, Company } from '@/lib/types';
import { updateUser } from '@/lib/firebase-actions';
import Link from 'next/link';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  position: z.string().min(1, 'Position is required'),
  companyId: z.string().min(1, 'Company is required'),
  salaryNumber: z.string().optional(),
});

type UserFormValues = z.infer<typeof formSchema>;

export default function EditUserPage() {
  const params = useParams();
  const id = params.id as string;
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userRef = useMemoFirebase(() => doc(firestore, 'users', id), [
    firestore,
    id,
  ]);
  const { data: user, isLoading: isLoadingUser } = useDoc<User>(userRef);

  const companiesCollectionRef = useMemoFirebase(
    () => collection(firestore, 'companies'),
    [firestore]
  );
  const { data: companies, isLoading: isLoadingCompanies } =
    useCollection<Company>(companiesCollectionRef);
    
  const userPositions: User['position'][] = ["Admin", "CEO", "Director", "PM", "CM", "Engineer", "General Foreman", "Safety Officer", "Safety Manager", "Logistic", "Document Controller", "Accountant", "progress_control"];


  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (user) {
      reset({
        name: user.name,
        position: user.position,
        companyId: user.companyId,
        salaryNumber: user.salaryNumber || '',
      });
    }
  }, [user, reset]);

  const onSubmit = async (values: UserFormValues) => {
    if (!auth) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to update a user.',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await updateUser(id, values);
      toast({
        title: 'User Updated',
        description: `${values.name}'s profile has been updated successfully.`,
      });
      router.push('/users');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isLoadingUser || isLoadingCompanies;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoaderCircle className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2">Loading User Details...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold">User Not Found</h2>
        <p className="text-muted-foreground">
          The user you are looking for does not exist.
        </p>
        <Button asChild className="mt-4">
          <Link href="/users">Go Back</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/users">
            <ArrowLeft />
            <span className="sr-only">Back to Users</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit User</h1>
          <p className="text-muted-foreground">
            Update the details for {user.name}.
          </p>
        </div>
      </header>
      <div className="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
              <CardDescription>
                Modify the user's profile and assignments.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" {...register('name')} />
                  {errors.name && (
                    <p className="text-sm text-destructive">
                      {errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salaryNumber">Salary Number (S.N.)</Label>
                  <Input id="salaryNumber" {...register('salaryNumber')} />
                </div>
              </div>
               <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={user.email || ''} disabled />
                 <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Controller
                    name="position"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a position" />
                        </SelectTrigger>
                        <SelectContent>
                          {userPositions.map((pos) => (
                            <SelectItem key={pos} value={pos}>
                              {pos}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.position && (
                    <p className="text-sm text-destructive">
                      {errors.position.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyId">Company</Label>
                  <Controller
                    name="companyId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a company" />
                        </SelectTrigger>
                        <SelectContent>
                          {companies?.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.companyId && (
                    <p className="text-sm text-destructive">
                      {errors.companyId.message}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" asChild>
              <Link href="/users">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
