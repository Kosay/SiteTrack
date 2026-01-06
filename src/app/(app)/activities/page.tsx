'use client';

import { useState, useMemo, useRef, ChangeEvent } from 'react';
import { LoaderCircle, PlusCircle, ListChecks, Trash2, Edit, MoreVertical, Briefcase, Upload, Download } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Project, Activity, Company } from '@/lib/types';
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
import { useToast } from '@/hooks/use-toast';
import { addActivity, updateActivity, deleteActivity } from '@/lib/firebase-actions';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import Papa from 'papaparse';


function ActivityForm({
  projectId,
  activity,
  onSuccess,
}: {
  projectId: string;
  activity?: Activity;
  onSuccess: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const formRef = React.useRef<HTMLFormElement>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const name = formData.get('name') as string;
    const code = formData.get('code') as string;
    const description = formData.get('description') as string;

    if (!name || !code) {
      toast({ variant: 'destructive', title: 'Name and code are required.' });
      setIsSubmitting(false);
      return;
    }

    try {
      if (activity) {
        await updateActivity(projectId, activity.id, { name, code, description });
        toast({ title: 'Activity Updated', description: `${name} has been updated.` });
      } else {
        await addActivity(projectId, { name, code, description });
        toast({ title: 'Activity Created', description: `${name} has been added.` });
      }
      onSuccess();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Operation Failed', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Activity Name</Label>
        <Input id="name" name="name" placeholder="e.g., 'Foundation Works'" defaultValue={activity?.name} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="code">Activity Code</Label>
        <Input id="code" name="code" placeholder="e.g., 'FW-01'" defaultValue={activity?.code} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea id="description" name="description" placeholder="Describe the activity..." defaultValue={activity?.description} />
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
          {activity ? 'Save Changes' : 'Create Activity'}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function ActivitiesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | undefined>(undefined);
  const importInputRef = useRef<HTMLInputElement>(null);
  
  const companiesCollectionRef = useMemoFirebase(() => collection(firestore, 'companies'), [firestore]);
  const { data: companies, isLoading: isLoadingCompanies } = useCollection<Company>(companiesCollectionRef);
  
  const projectsQuery = useMemoFirebase(() => {
    if (!selectedCompanyId) return null;
    return query(collection(firestore, 'projects'), where('companyId', '==', selectedCompanyId));
  }, [firestore, selectedCompanyId]);
  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);

  const activitiesCollectionRef = useMemoFirebase(() => {
    if (!selectedProjectId) return null;
    return collection(firestore, `projects/${selectedProjectId}/activities`);
  }, [firestore, selectedProjectId]);
  const { data: activities, isLoading: isLoadingActivities } = useCollection<Activity>(activitiesCollectionRef);

  const handleSelectCompany = (companyId: string) => {
    setSelectedCompanyId(companyId);
    setSelectedProjectId(null); // Reset project when company changes
  };

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
  };
  
  const handleOpenForm = (activity?: Activity) => {
    setEditingActivity(activity);
    setIsFormOpen(true);
  }
  
  const handleCloseForm = () => {
    setEditingActivity(undefined);
    setIsFormOpen(false);
  }

  const handleDelete = async (activityId: string) => {
    if (!selectedProjectId) return;
    try {
      await deleteActivity(selectedProjectId, activityId);
      toast({ title: 'Activity Deleted', description: 'The activity has been removed.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
    }
  };

  const handleExport = () => {
    if (!activities || activities.length === 0) {
      toast({ variant: 'destructive', title: 'No activities to export' });
      return;
    }

    const dataToExport = activities.map(({ name, code, description }) => ({
      name,
      code,
      description: description || '',
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'activities_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Export successful' });
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedProjectId) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const parsedData = results.data as { name: string; code: string; description?: string }[];
        let successCount = 0;

        for (const row of parsedData) {
          if (row.name && row.code) {
            try {
              await addActivity(selectedProjectId, {
                name: row.name,
                code: row.code,
                description: row.description || '',
              });
              successCount++;
            } catch (error) {
              console.error('Failed to import activity row:', row, error);
            }
          }
        }
        toast({
          title: 'Import Complete',
          description: `${successCount} activities were imported successfully.`,
        });
      },
      error: (error) => {
        toast({ variant: 'destructive', title: 'CSV Parsing Error', description: error.message });
      },
    });

    if (event.target) {
      event.target.value = '';
    }
  };

  const isLoading = isLoadingCompanies || isLoadingProjects || isLoadingActivities;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Activities</h1>
        <p className="text-muted-foreground">Manage activities for each project.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Select Company</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingCompanies ? <LoaderCircle className="animate-spin" /> :
              <Select onValueChange={handleSelectCompany} value={selectedCompanyId || ''}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  {companies?.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          </CardContent>
        </Card>

        {selectedCompanyId && (
            <Card>
                <CardHeader>
                <CardTitle>Step 2: Select Project</CardTitle>
                </CardHeader>
                <CardContent>
                {isLoadingProjects ? <LoaderCircle className="animate-spin" /> :
                    <Select onValueChange={handleSelectProject} value={selectedProjectId || ''} disabled={!projects || projects.length === 0}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                        {projects?.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                }
                {!isLoadingProjects && projects?.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-2">No projects found for this company.</p>
                )}
                </CardContent>
            </Card>
        )}
      </div>

      {selectedProjectId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Project Activities</CardTitle>
              <CardDescription>
                {activities?.length || 0} activities found for the selected project.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={importInputRef}
                className="hidden"
                accept=".csv"
                onChange={handleImport}
              />
              <Button variant="outline" size="sm" onClick={() => importInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" /> Import
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                  <Button onClick={() => handleOpenForm()}>
                    <PlusCircle className="mr-2" /> New Activity
                  </Button>
                  <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>{editingActivity ? 'Edit Activity' : 'Create New Activity'}</DialogTitle>
                        <DialogDescription>
                          {editingActivity ? 'Update the details for this activity.' : 'Add a new activity to this project.'}
                        </DialogDescription>
                      </DialogHeader>
                      <ActivityForm projectId={selectedProjectId} activity={editingActivity} onSuccess={handleCloseForm} />
                  </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingActivities ? <div className="flex justify-center p-8"><LoaderCircle className="w-8 h-8 animate-spin" /></div> :
              activities && activities.length > 0 ? (
                <ul className="space-y-3">
                  {activities.map((activity) => (
                    <li key={activity.id} className="flex items-center justify-between p-3 rounded-md border bg-card hover:bg-muted/50">
                      <div className="flex items-center gap-4">
                        <ListChecks className="text-muted-foreground" />
                        <div className="flex flex-col">
                            <span className="font-medium">{activity.name} <span className="text-muted-foreground font-mono text-sm">({activity.code})</span></span>
                            <span className="text-sm text-muted-foreground">{activity.description}</span>
                        </div>
                      </div>
                       <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <MoreVertical />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenForm(activity)}>
                                    <Edit className="mr-2" />
                                    <span>Edit</span>
                                </DropdownMenuItem>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" className="w-full justify-start text-sm font-normal text-destructive hover:bg-destructive/10 hover:text-destructive px-2 py-1.5 relative select-none items-center rounded-sm outline-none transition-colors">
                                            <Trash2 className="mr-2" />
                                            <span>Delete</span>
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the activity and all associated sub-activities.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(activity.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg">
                  <Briefcase className="w-12 h-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No Activities Found</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Get started by creating a new activity for this project.
                  </p>
                </div>
              )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
