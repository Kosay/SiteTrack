'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  Building2,
  LoaderCircle,
} from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { Company, User as SiteUser } from '@/lib/types';
import { updateCompany } from '@/lib/firebase-actions';
import Link from 'next/link';

const formSchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  contactPerson: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  mobile: z.string().optional(),
  address: z.string().optional(),
  description: z.string().optional(),
  directorId: z.string().optional(),
  pmId: z.string().optional(),
});

type CompanyFormValues = z.infer<typeof formSchema>;

export default function EditCompanyPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const companyRef = useMemoFirebase(
    () => doc(firestore, 'companies', id),
    [firestore, id]
  );
  const { data: company, isLoading: isLoadingCompany } = useDoc<Company>(companyRef);

  const usersCollectionRef = useMemoFirebase(
    () => collection(firestore, 'users'),
    [firestore]
  );
  const { data: users, isLoading: isLoadingUsers } = useCollection<SiteUser>(usersCollectionRef);

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (company) {
      form.reset({
        name: company.name,
        contactPerson: company.contactPerson || '',
        email: company.email || '',
        mobile: company.mobile || '',
        address: company.address || '',
        description: company.description || '',
        directorId: company.directorId || '',
        pmId: company.pmId || '',
      });
    }
  }, [company, form]);

  const directors = useMemo(
    () => users?.filter((u) => u.position === 'Director') || [],
    [users]
  );
  const projectManagers = useMemo(
    () => users?.filter((u) => u.position === 'PM') || [],
    [users]
  );

  const onSubmit = async (values: CompanyFormValues) => {
    if (!auth) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to update a company.',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await updateCompany(auth, id, values);
      toast({
        title: 'Company Updated',
        description: `${values.name} has been updated successfully.`,
      });
      router.push('/companies');
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

  const isLoading = isLoadingCompany || isLoadingUsers;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoaderCircle className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2">Loading Company Details...</span>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold">Company Not Found</h2>
        <p className="text-muted-foreground">The company you are looking for does not exist.</p>
        <Button asChild className="mt-4">
          <Link href="/companies">Go Back</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
       <header className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/companies">
            <ArrowLeft />
            <span className="sr-only">Back to Companies</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Company</h1>
          <p className="text-muted-foreground">Update the details for {company.name}.</p>
        </div>
      </header>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>
              Modify the fields below to update the company profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name</Label>
                <Input id="name" {...form.register('name')} />
                {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input id="contactPerson" {...form.register('contactPerson')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...form.register('email')} />
                 {form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile</Label>
                <Input id="mobile" type="tel" {...form.register('mobile')} />
              </div>
            </div>
             <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...form.register('address')} />
            </div>
             <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...form.register('description')} />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
               <div className="space-y-2">
                <Label htmlFor="directorId">Director</Label>
                 <Controller
                    control={form.control}
                    name="directorId"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a director" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {directors.map((d) => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
              </div>
               <div className="space-y-2">
                <Label htmlFor="pmId">Project Manager (PM)</Label>
                 <Controller
                    control={form.control}
                    name="pmId"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a PM" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {projectManagers.map((pm) => (
                            <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" asChild>
                <Link href="/companies">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
            </Button>
        </div>
      </form>
    </div>
  );
}