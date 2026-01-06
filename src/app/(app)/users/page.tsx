'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LoaderCircle, PlusCircle, UserPlus, Users, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createInvitation } from '@/lib/firebase-actions';
import { useAuth, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { User, Company, Invitation } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';


function InviteUserForm({ companies, onSuccess }: { companies: Company[], onSuccess: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const auth = useAuth();
  
  const userPositions: User['position'][] = ["Admin", "CEO", "Director", "PM", "CM", "Engineer", "General Foreman", "Safety Officer", "Safety Manager", "Logistic", "Document Controller", "Accountant", "progress_control"];

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!auth?.currentUser) {
       toast({
        variant: 'destructive',
        title: 'Authentication Required',
        description: 'You must be logged in to invite users.',
      });
      return;
    }
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const position = formData.get('position') as User['position'];
    const companyId = formData.get('companyId') as string;

    if (!name || !email || !position || !companyId) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Please fill out all fields.' });
      setIsSubmitting(false);
      return;
    }

    try {
      await createInvitation({
        name,
        email,
        position,
        companyId,
        creatorId: auth.currentUser.uid,
        creatorName: auth.currentUser.displayName || 'Admin',
      });
      toast({
        title: 'Invitation Sent',
        description: `${name} has been invited to join.`,
      });
      onSuccess();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to send invitation',
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
     <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input id="name" name="name" placeholder="e.g., Jane Doe" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="e.g., jane.doe@example.com" required />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="position">Position</Label>
          <Select name="position" required>
            <SelectTrigger>
              <SelectValue placeholder="Select a position" />
            </SelectTrigger>
            <SelectContent>
              {userPositions.map(pos => <SelectItem key={pos} value={pos}>{pos}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="companyId">Company</Label>
          <Select name="companyId" required>
            <SelectTrigger>
              <SelectValue placeholder="Select a company" />
            </SelectTrigger>
            <SelectContent>
              {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
          Send Invitation
        </Button>
      </DialogFooter>
    </form>
  )
}


export default function UsersPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const firestore = useFirestore();

  const usersCollection = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const companiesCollection = useMemoFirebase(() => collection(firestore, 'companies'), [firestore]);
  const invitationsCollection = useMemoFirebase(() => collection(firestore, 'invitations'), [firestore]);

  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersCollection);
  const { data: companies, isLoading: isLoadingCompanies } = useCollection<Company>(companiesCollection);
  const { data: invitations, isLoading: isLoadingInvitations } = useCollection<Invitation>(invitationsCollection);
  
  const companyMap = useMemo(() => new Map(companies?.map(c => [c.id, c.name])), [companies]);

  const pendingInvitations = useMemo(() => invitations?.filter(inv => inv.status === 'pending') || [], [invitations]);

  const isLoading = isLoadingUsers || isLoadingCompanies || isLoadingInvitations;

  return (
    <div className="flex flex-col gap-8">
       <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Invite and manage users in your organization.
          </p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <Button onClick={() => setIsFormOpen(true)}>
            <UserPlus className="mr-2" />
            Invite User
          </Button>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Invite a New User</DialogTitle>
              <DialogDescription>
                They will receive an email with instructions to sign up and join the company.
              </DialogDescription>
            </DialogHeader>
            {isLoadingCompanies ? <LoaderCircle className="animate-spin" /> : 
              <InviteUserForm companies={companies || []} onSuccess={() => setIsFormOpen(false)} />
            }
          </DialogContent>
        </Dialog>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <LoaderCircle className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>Registered Users</CardTitle>
                    <CardDescription>
                        {users?.length || 0} users have created an account.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Position</TableHead>
                            <TableHead>Company</TableHead>
                             <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {users && users.length > 0 ? users.map((user) => (
                            <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.name}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>{user.position}</TableCell>
                            <TableCell>{companyMap.get(user.companyId) || 'N/A'}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon" asChild>
                                  <Link href={`/users/${user.id}/edit`}>
                                    <Edit className="h-4 w-4" />
                                    <span className="sr-only">Edit User</span>
                                  </Link>
                                </Button>
                            </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No registered users yet.
                                </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Pending Invitations</CardTitle>
                    <CardDescription>
                        {pendingInvitations.length} users have been invited but have not yet signed up.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {pendingInvitations.length > 0 ? pendingInvitations.map((inv) => (
                            <TableRow key={inv.id}>
                            <TableCell className="font-medium">{inv.name}</TableCell>
                            <TableCell>{inv.email}</TableCell>
                            <TableCell><Badge variant="secondary">{inv.status}</Badge></TableCell>
                            </TableRow>
                        )) : (
                             <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                    No pending invitations.
                                </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
}
