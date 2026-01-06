'use client';

import { useState, useMemo } from 'react';
import {
  Archive,
  Building2,
  LoaderCircle,
  MoreVertical,
  PlusCircle,
  X,
  Mail,
  Phone,
  User,
  MapPin,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  useFirestore,
  useUser,
  useCollection,
  useMemoFirebase,
} from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Company } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { addCompany, updateCompany } from '@/lib/firebase-actions';
import { useAuth } from '@/firebase';

function CompanyForm({ onSuccess }: { onSuccess: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const auth = useAuth();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const email = formData.get('email') as string;
    const mobile = formData.get('mobile') as string;
    const contactPerson = formData.get('contactPerson') as string;
    const address = formData.get('address') as string;

    if (!name) {
      toast({
        variant: 'destructive',
        title: 'Company name is required.',
      });
      setIsSubmitting(false);
      return;
    }

    try {
      await addCompany(auth, {
        name,
        description,
        email,
        mobile,
        contactPerson,
        address,
      });
      toast({
        title: 'Company Created',
        description: `${name} has been added to your list.`,
      });
      onSuccess();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to create company',
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
          <Label htmlFor="name">Company Name</Label>
          <Input
            id="name"
            name="name"
            placeholder="e.g., 'Innovate Construction'"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactPerson">Contact Person</Label>
          <Input
            id="contactPerson"
            name="contactPerson"
            placeholder="e.g., 'Jane Doe'"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="e.g., 'contact@innovate.com'"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mobile">Mobile</Label>
          <Input
            id="mobile"
            name="mobile"
            type="tel"
            placeholder="e.g., '+1-555-123-4567'"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input id="address" name="address" placeholder="e.g., '123 Main St, Anytown, USA'" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Company Description (Optional)</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="What does this company specialize in?"
          rows={3}
        />
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && (
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
          )}
          Create Company
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function CompaniesPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [showArchived, setShowArchived] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const companiesCollectionRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, `users/${user.uid}/companies`);
  }, [user, firestore]);

  const { data: companies, isLoading } =
    useCollection<Company>(companiesCollectionRef);

  const filteredCompanies = useMemo(() => {
    if (!companies) return [];
    return companies.filter((company) =>
      showArchived ? true : !company.archived
    );
  }, [companies, showArchived]);

  const activeCompanyCount = useMemo(() => {
    return companies?.filter((c) => !c.archived).length || 0;
  }, [companies]);

  const handleArchive = async (company: Company) => {
    try {
      await updateCompany(auth, company.id, { archived: !company.archived });
      toast({
        title: `Company ${company.archived ? 'Restored' : 'Archived'}`,
        description: `${company.name} has been ${
          company.archived ? 'restored' : 'archived'
        }.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message,
      });
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
          <p className="text-muted-foreground">
            Manage the companies you work with.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-archived"
              checked={showArchived}
              onCheckedChange={(checked) => setShowArchived(checked as boolean)}
            />
            <Label htmlFor="show-archived" className="text-sm font-medium">
              Show Archived
            </Label>
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <Button onClick={() => setIsFormOpen(true)}>
              <PlusCircle className="mr-2" />
              New Company
            </Button>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Create a New Company</DialogTitle>
                <DialogDescription>
                  Add a new company to your list to associate with projects and
                  logs.
                </DialogDescription>
              </DialogHeader>
              <CompanyForm onSuccess={() => setIsFormOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <LoaderCircle className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Active Companies</CardTitle>
              <CardDescription>
                You are currently tracking {activeCompanyCount} active
                compan{activeCompanyCount === 1 ? 'y' : 'ies'}.
              </CardDescription>
            </CardHeader>
          </Card>
          {filteredCompanies.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredCompanies.map((company) => (
                <Card
                  key={company.id}
                  className={`flex flex-col ${
                    company.archived ? 'bg-muted/50' : ''
                  }`}
                >
                  <CardHeader className="flex-row items-start justify-between gap-4 pb-4">
                    <div className="space-y-1.5">
                      <CardTitle>{company.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {company.description || 'No description provided.'}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleArchive(company)}>
                          <Archive className="mr-2" />
                          <span>
                            {company.archived ? 'Restore' : 'Archive'}
                          </span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm mt-auto pt-4 border-t">
                    {company.contactPerson && (
                       <div className="flex items-center gap-3">
                        <User className="text-muted-foreground" />
                        <span className="text-muted-foreground">{company.contactPerson}</span>
                      </div>
                    )}
                    {company.email && (
                       <div className="flex items-center gap-3">
                        <Mail className="text-muted-foreground" />
                        <a href={`mailto:${company.email}`} className="text-primary hover:underline">{company.email}</a>
                      </div>
                    )}
                    {company.mobile && (
                       <div className="flex items-center gap-3">
                        <Phone className="text-muted-foreground" />
                        <span className="text-muted-foreground">{company.mobile}</span>
                      </div>
                    )}
                     {company.address && (
                       <div className="flex items-center gap-3">
                        <MapPin className="text-muted-foreground" />
                        <span className="text-muted-foreground">{company.address}</span>
                      </div>
                    )}
                  </CardContent>
                   {company.archived && (
                      <div className="border-t text-center py-2 text-sm text-destructive font-semibold">
                          Archived
                      </div>
                    )}
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
              <Building2 className="w-12 h-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No Companies Found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {showArchived
                  ? 'There are no archived companies.'
                  : 'Get started by creating a new company.'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

    