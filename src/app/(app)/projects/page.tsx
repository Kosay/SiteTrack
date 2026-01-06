'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  LoaderCircle,
  PlusCircle,
  MoreVertical,
  Building,
  User,
  CheckCircle,
  XCircle,
  Archive,
  Edit,
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
  useAuth,
} from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Project, Company, User as SiteUser } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { addProject, updateProject } from '@/lib/firebase-actions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';

function ProjectForm({
  companies,
  users,
  onSuccess,
}: {
  companies: Company[];
  users: SiteUser[];
  onSuccess: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const directors = useMemo(() => users.filter(u => u.position === 'Director'), [users]);
  const projectManagers = useMemo(() => users.filter(u => u.position === 'PM'), [users]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const name = formData.get('name') as string;
    const companyId = formData.get('companyId') as string;
    const directorId = formData.get('directorId') as string;
    const pmId = formData.get('pmId') as string;

    if (!name || !companyId || !directorId || !pmId) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please fill out all required project details.',
      });
      setIsSubmitting(false);
      return;
    }

    try {
      await addProject({
        name,
        companyId,
        directorId,
        pmId,
        status: 'active',
      });
      toast({
        title: 'Project Created',
        description: `${name} has been successfully created.`,
      });
      onSuccess();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to create project',
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Project Name</Label>
        <Input id="name" name="name" placeholder="e.g., 'Skyscraper Tower'" required />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div className="space-y-2">
          <Label htmlFor="companyId">Managing Company</Label>
          <Select name="companyId" required>
            <SelectTrigger>
              <SelectValue placeholder="Select a company" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
         <div className="space-y-2">
          <Label htmlFor="directorId">Project Director</Label>
          <Select name="directorId" required>
            <SelectTrigger>
              <SelectValue placeholder="Select a director" />
            </SelectTrigger>
            <SelectContent>
              {directors.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="pmId">Project Manager (PM)</Label>
           <Select name="pmId" required>
            <SelectTrigger>
              <SelectValue placeholder="Select a PM" />
            </SelectTrigger>
            <SelectContent>
              {projectManagers.map((pm) => (
                <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
              ))}
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
          Create Project
        </Button>
      </DialogFooter>
    </form>
  );
}


export default function ProjectsPage() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [showArchived, setShowArchived] = useState(false);

  const projectsCollection = useMemoFirebase(() => collection(firestore, 'projects'), [firestore]);
  const companiesCollection = useMemoFirebase(() => collection(firestore, 'companies'), [firestore]);
  const usersCollection = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);

  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsCollection);
  const { data: companies, isLoading: isLoadingCompanies } = useCollection<Company>(companiesCollection);
  const { data: users, isLoading: isLoadingUsers } = useCollection<SiteUser>(usersCollection);

  const companyMap = useMemo(() => new Map(companies?.map(c => [c.id, c.name])), [companies]);
  const userMap = useMemo(() => new Map(users?.map(u => [u.id, u.name])), [users]);
  
  const isLoading = isLoadingProjects || isLoadingCompanies || isLoadingUsers;

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    return projects.filter((project) =>
      showArchived ? true : !project.archived
    );
  }, [projects, showArchived]);

  const activeProjectsCount = useMemo(() => {
    return projects?.filter(p => !p.archived && p.status === 'active').length || 0;
  }, [projects]);


  const handleArchive = async (project: Project) => {
    if (!auth) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to archive a project.',
      });
      return;
    }
    try {
      await updateProject(project.id, { archived: !project.archived });
      toast({
        title: `Project ${project.archived ? 'Restored' : 'Archived'}`,
        description: `${project.name} has been ${
          project.archived ? 'restored' : 'archived'
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
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage all ongoing and completed projects.
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
          <Button asChild>
            <Link href="/projects/new">
              <PlusCircle className="mr-2" />
              New Project
            </Link>
          </Button>
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
              <CardTitle>Active Projects</CardTitle>
              <CardDescription>
                {activeProjectsCount} projects are currently active.
              </CardDescription>
            </CardHeader>
        </Card>
        {filteredProjects && filteredProjects.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <Card key={project.id} className={`flex flex-col ${
                    project.archived ? 'bg-muted/50' : ''
                  }`}>
                <CardHeader className="flex-row items-start justify-between gap-4 pb-4">
                    <div className="space-y-1.5">
                        <CardTitle className="line-clamp-1">{project.name}</CardTitle>
                        <CardDescription>{companyMap.get(project.companyId) || 'Unknown Company'}</CardDescription>
                    </div>
                     <div className="flex items-center gap-2">
                        <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                            {project.status}
                        </Badge>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                <MoreVertical />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                <Link href={`/projects/${project.id}/edit`}>
                                    <Edit className="mr-2" />
                                    <span>Edit</span>
                                </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleArchive(project)}>
                                <Archive className="mr-2" />
                                <span>
                                    {project.archived ? 'Restore' : 'Archive'}
                                </span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm mt-auto pt-4 border-t">
                  <div className="flex items-center gap-3">
                    <User className="text-muted-foreground" />
                    <span className="font-semibold mr-2">Director:</span>
                    <span className="text-muted-foreground">{userMap.get(project.directorId) || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <User className="text-muted-foreground" />
                    <span className="font-semibold mr-2">PM:</span>
                    <span className="text-muted-foreground">{userMap.get(project.pmId) || 'N/A'}</span>
                  </div>
                </CardContent>
                {project.archived && (
                    <div className="border-t text-center py-2 text-sm text-destructive font-semibold">
                        Archived
                    </div>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
            <Briefcase className="w-12 h-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Projects Found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
               {showArchived
                  ? 'There are no archived projects.'
                  : 'Get started by creating a new project.'}
            </p>
          </div>
        )}
        </>
      )}
    </div>
  );
}
