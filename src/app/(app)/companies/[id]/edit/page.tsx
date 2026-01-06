
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  Building,
  ChevronDown,
  LoaderCircle,
  Trash2,
  User,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { Company, User as SiteUser } from '@/lib/types';
import { updateCompany } from '@/lib/firebase-actions';
import Link from 'next/link';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';


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

interface UserSelectionDialogProps {
  users: SiteUser[];
  onSelect: (userId: string) => void;
  title: string;
}

function UserSelectionDialog({ users, onSelect, title }: UserSelectionDialogProps) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Change</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Command>
          <CommandInput placeholder="Search user..." />
          <CommandEmpty>No users found.</CommandEmpty>
          <CommandGroup>
            {users.map((user) => (
              <CommandItem
                key={user.id}
                value={user.name}
                onSelect={() => {
                  onSelect(user.id);
                  setOpen(false);
                }}
              >
                <User className={cn('mr-2 h-4 w-4')} />
                {user.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </DialogContent>
    </Dialog>
  );
}


export default function EditCompanyPage() {
  const params = useParams();
  const id = params.id as string;
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
  
  const userMap = useMemo(() => new Map(users?.map(u => [u.id, u.name])), [users]);

  const currentDirectorId = form.watch('directorId');
  const currentPmId = form.watch('pmId');

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
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 grid gap-6">
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
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-1 grid gap-6">
             <Card>
                <CardHeader>
                  <CardTitle>Company Roles</CardTitle>
                   <CardDescription>Assign key personnel to this company.</CardDescription>
                </CardHeader>
                 <CardContent className="space-y-6">
                    <div className="space-y-3">
                        <Label>Director</Label>
                        <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
                            <div className="flex items-center gap-3">
                                <User className="h-5 w-5 text-muted-foreground" />
                                <span className="text-sm font-medium">{currentDirectorId ? userMap.get(currentDirectorId) : 'Not Assigned'}</span>
                            </div>
                            <UserSelectionDialog users={directors} title="Select Director" onSelect={(userId) => form.setValue('directorId', userId)} />
                        </div>
                    </div>
                     <div className="space-y-3">
                        <Label>Project Manager (PM)</Label>
                         <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
                             <div className="flex items-center gap-3">
                                <User className="h-5 w-5 text-muted-foreground" />
                                <span className="text-sm font-medium">{currentPmId ? userMap.get(currentPmId) : 'Not Assigned'}</span>
                            </div>
                            <UserSelectionDialog users={projectManagers} title="Select Project Manager" onSelect={(userId) => form.setValue('pmId', userId)} />
                        </div>
                    </div>
                 </CardContent>
            </Card>
          </div>
        </div>

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
