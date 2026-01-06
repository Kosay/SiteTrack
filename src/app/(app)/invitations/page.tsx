
'use client';

import { useState, useMemo } from 'react';
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
import { LoaderCircle, UserPlus, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createInvitation } from '@/lib/firebase-actions';
import { useAuth, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { User, Company, Invitation } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

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
    const salaryNumber = formData.get('salaryNumber') as string;

    if (!name || !email || !position || !companyId) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Please fill out all required fields.' });
      setIsSubmitting(false);
      return;
    }

    try {
      await createInvitation({
        name,
        email,
        position,
        companyId,
        salaryNumber,
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
      <div className="space-y-2">
          <Label htmlFor="salaryNumber">Salary Number (S.N.)</Label>
          <Input id="salaryNumber" name="salaryNumber" placeholder="e.g., 12345" />
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

export default function InvitationsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const firestore = useFirestore();

  const companiesCollection = useMemoFirebase(() => collection(firestore, 'companies'), [firestore]);
  const invitationsCollection = useMemoFirebase(() => collection(firestore, 'invitations'), [firestore]);

  const { data: companies, isLoading: isLoadingCompanies } = useCollection<Company>(companiesCollection);
  const { data: invitations, isLoading: isLoadingInvitations } = useCollection<Invitation>(invitationsCollection);
  
  const companyMap = useMemo(() => new Map(companies?.map(c => [c.id, c.name])), [companies]);

  const { pendingInvitations, completedInvitations } = useMemo(() => {
    const pending: Invitation[] = [];
    const completed: Invitation[] = [];
    if (invitations) {
      for (const inv of invitations) {
        if (inv.status === 'pending') {
          pending.push(inv);
        } else {
          completed.push(inv);
        }
      }
    }
    return { pendingInvitations: pending, completedInvitations: completed };
  }, [invitations]);

  const isLoading = isLoadingCompanies || isLoadingInvitations;

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    return format(timestamp.toDate(), 'PPP');
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invitations</h1>
          <p className="text-muted-foreground">
            Invite new users and track the status of their invitations.
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
                    <TableHead>Company</TableHead>
                    <TableHead>Invited On</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingInvitations.length > 0 ? pendingInvitations.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.name}</TableCell>
                      <TableCell>{inv.email}</TableCell>
                      <TableCell>{companyMap.get(inv.companyId) || 'N/A'}</TableCell>
                      <TableCell>{formatDate(inv.createdAt)}</TableCell>
                      <TableCell><Badge variant="secondary">{inv.status}</Badge></TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No pending invitations.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Completed Invitations</CardTitle>
              <CardDescription>
                {completedInvitations.length} users have successfully signed up.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Completed On</TableHead>
                    <TableHead>Joined As</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedInvitations.length > 0 ? completedInvitations.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.name}</TableCell>
                      <TableCell>{inv.email}</TableCell>
                      <TableCell>{formatDate(inv.completedAt)}</TableCell>
                      <TableCell>{inv.usedBy || 'N/A'}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        No completed invitations yet.
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
