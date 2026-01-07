
'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle, PlusCircle, Trash2, Edit, Boxes, ListChecks } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Company, Project, Activity, SubActivity, Unit } from '@/lib/types';
import { addActivity, updateActivity, deleteActivity, addSubActivity } from '@/lib/firebase-actions';

// Add Activity Form
function ActivityForm({ projectId, onSuccess, activityToEdit }: { projectId: string, onSuccess: () => void, activityToEdit?: Activity }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const name = formData.get('name') as string;
    const code = formData.get('code') as string;
    const description = formData.get('description') as string;

    if (!name || !code) {
      toast({ variant: 'destructive', title: 'Name and Code are required.' });
      setIsSubmitting(false);
      return;
    }

    try {
        const activityData = { name, code, description };
        if(activityToEdit) {
            await updateActivity(projectId, activityToEdit.id, activityData);
             toast({ title: 'Activity Updated', description: `${name} has been updated.` });
        } else {
            await addActivity(projectId, activityData);
            toast({ title: 'Activity Added', description: `${name} has been added to the project.` });
        }
      onSuccess();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Operation Failed', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Activity Name</Label>
        <Input id="name" name="name" placeholder="e.g., 'Foundation Works'" defaultValue={activityToEdit?.name} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="code">Activity Code</Label>
        <Input id="code" name="code" placeholder="e.g., 'FW-01'" defaultValue={activityToEdit?.code} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" placeholder="Describe the activity" defaultValue={activityToEdit?.description} />
      </div>
      <DialogFooter>
        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
          {activityToEdit ? 'Save Changes' : 'Add Activity'}
        </Button>
      </DialogFooter>
    </form>
  );
}

// Add SubActivity Form (BoQ)
function SubActivityForm({ projectId, activityId, units, onSuccess }: { projectId: string, activityId: string, units: Unit[], onSuccess: () => void }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(event.currentTarget);
        const name = formData.get('name') as string;
        const description = formData.get('description') as string;
        const unit = formData.get('unit') as string;
        const totalWork = parseFloat(formData.get('totalWork') as string);
        
        if (!name || !unit || isNaN(totalWork)) {
            toast({ variant: 'destructive', title: 'Name, Unit, and Total Work are required.' });
            setIsSubmitting(false);
            return;
        }

        try {
            await addSubActivity(projectId, activityId, { name, description, unit, totalWork, BoQ: 'N/A' });
            toast({ title: 'Sub-Activity Added', description: `BoQ item '${name}' has been added.` });
            onSuccess();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to add BoQ item', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
         <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name">Sub-Activity Name</Label>
                <Input id="name" name="name" placeholder="e.g., 'Concrete Pouring'" required />
            </div>
             <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" placeholder="Detailed description of the work" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="unit">Unit</Label>
                    <Select name="unit" required>
                        <SelectTrigger id="unit">
                            <SelectValue placeholder="Select a unit" />
                        </SelectTrigger>
                        <SelectContent>
                            {units.map((u) => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="totalWork">Total Work (Quantity)</Label>
                    <Input id="totalWork" name="totalWork" type="number" step="any" placeholder="e.g., 150.5" required />
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                Add BoQ Item
                </Button>
            </DialogFooter>
        </form>
    );
}

export default function ActivitiesPage() {
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBoQFormOpen, setIsBoQFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | undefined>(undefined);
  const [currentActivityForBoQ, setCurrentActivityForBoQ] = useState<string>('');

  const firestore = useFirestore();
  const { toast } = useToast();

  const companiesCollection = useMemoFirebase(() => collection(firestore, 'companies'), [firestore]);
  const { data: companies, isLoading: isLoadingCompanies } = useCollection<Company>(companiesCollection);

  const projectsQuery = useMemoFirebase(() => {
    if (!selectedCompany) return null;
    return query(collection(firestore, 'projects'), where('companyId', '==', selectedCompany));
  }, [firestore, selectedCompany]);
  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);
  
  const activitiesQuery = useMemoFirebase(() => {
    if(!selectedProject) return null;
    return collection(firestore, `projects/${selectedProject}/activities`);
  }, [firestore, selectedProject]);
  const { data: activities, isLoading: isLoadingActivities } = useCollection<Activity>(activitiesQuery);

  const subActivitiesQuery = useMemoFirebase(() => {
    if(!selectedProject || !activities) return null;
    // We can't do a group query here easily without knowing activity IDs, so we'll fetch them individually later or restructure
    return null; 
  }, [firestore, selectedProject, activities])

  const unitsCollection = useMemoFirebase(() => collection(firestore, 'units'), [firestore]);
  const { data: units, isLoading: isLoadingUnits } = useCollection<Unit>(unitsCollection);


  const handleCompanyChange = (companyId: string) => {
    setSelectedCompany(companyId);
    setSelectedProject('');
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProject(projectId);
  };
  
  const handleDeleteActivity = async (activity: Activity) => {
      if(!selectedProject) return;
      if (!confirm(`Are you sure you want to delete activity "${activity.name}"? This cannot be undone.`)) return;

      try {
        await deleteActivity(selectedProject, activity.id);
        toast({ title: 'Activity Deleted', description: `${activity.name} has been removed.` });
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Deletion Failed', description: error.message });
      }
  }

  const openEditDialog = (activity: Activity) => {
      setEditingActivity(activity);
      setIsFormOpen(true);
  }

  const openNewDialog = () => {
      setEditingActivity(undefined);
      setIsFormOpen(true);
  }
  
  const openBoQDialog = (activityId: string) => {
      setCurrentActivityForBoQ(activityId);
      setIsBoQFormOpen(true);
  }

  const isLoading = isLoadingCompanies || isLoadingProjects || isLoadingActivities;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Manage Activities</h1>
        <p className="text-muted-foreground">
          Add, edit, or delete activities and their Bill of Quantities (BoQ) for a project.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Project Selection</CardTitle>
          <CardDescription>First, select a company and then choose the project you want to manage.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Company</Label>
            {isLoadingCompanies ? <LoaderCircle className="animate-spin" /> :
              <Select onValueChange={handleCompanyChange} value={selectedCompany}>
                <SelectTrigger><SelectValue placeholder="Select a Company" /></SelectTrigger>
                <SelectContent>
                  {companies?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            }
          </div>
          <div className="space-y-2">
            <Label>Project</Label>
            {isLoadingProjects ? <LoaderCircle className="animate-spin" /> :
              <Select onValueChange={handleProjectChange} value={selectedProject} disabled={!selectedCompany || projects?.length === 0}>
                <SelectTrigger><SelectValue placeholder={!selectedCompany ? "Select a company first" : "Select a Project"} /></SelectTrigger>
                <SelectContent>
                  {projects?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            }
          </div>
        </CardContent>
      </Card>
      
      {selectedProject && (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Project Activities</CardTitle>
                    <CardDescription>
                        {activities?.length ?? 0} activities found for this project.
                    </CardDescription>
                </div>
                 <Dialog open={isFormOpen} onOpenChange={(isOpen) => { if(!isOpen) setEditingActivity(undefined); setIsFormOpen(isOpen);}}>
                    <DialogTrigger asChild>
                        <Button onClick={openNewDialog}><PlusCircle className="mr-2" />New Activity</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingActivity ? 'Edit Activity' : 'Add New Activity'}</DialogTitle>
                            <DialogDescription>
                                Fill in the details for the project activity below.
                            </DialogDescription>
                        </DialogHeader>
                        <ActivityForm 
                            projectId={selectedProject} 
                            activityToEdit={editingActivity}
                            onSuccess={() => setIsFormOpen(false)} 
                        />
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {isLoadingActivities ? <div className="flex items-center justify-center p-8"><LoaderCircle className="w-8 h-8 animate-spin text-primary" /></div> :
                 activities && activities.length > 0 ? (
                    <Accordion type="multiple" className="w-full">
                        {activities.map(activity => (
                             <AccordionItem value={activity.id} key={activity.id}>
                                <AccordionTrigger>
                                    <div className="flex items-center justify-between w-full pr-4">
                                        <div className="flex items-center gap-3 text-left">
                                            <ListChecks className="h-5 w-5 text-muted-foreground" />
                                            <div>
                                                <p className="font-semibold">{activity.name}</p>
                                                <p className="text-xs text-muted-foreground">{activity.code}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                             <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(activity)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteActivity(activity)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="bg-muted/30 p-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-semibold">Bill of Quantities (Sub-Activities)</h4>
                                         <Dialog open={isBoQFormOpen && currentActivityForBoQ === activity.id} onOpenChange={(isOpen) => { if(!isOpen) setCurrentActivityForBoQ(''); setIsBoQFormOpen(isOpen);}}>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="sm" onClick={() => openBoQDialog(activity.id)}><PlusCircle className="mr-2 h-4 w-4" />Add BoQ Item</Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Add BoQ Item to {activity.name}</DialogTitle>
                                                    <DialogDescription>Define a sub-activity with its quantity.</DialogDescription>
                                                </DialogHeader>
                                                {isLoadingUnits ? <LoaderCircle className="animate-spin" /> :
                                                    <SubActivityForm 
                                                        projectId={selectedProject} 
                                                        activityId={activity.id}
                                                        units={units || []} 
                                                        onSuccess={() => setIsBoQFormOpen(false)} 
                                                    />
                                                }
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-4">{activity.description || 'No description provided for this activity.'}</p>
                                    <div className="text-sm text-center text-muted-foreground py-4 border-2 border-dashed rounded-md">
                                        Sub-activity list coming soon...
                                    </div>
                                </AccordionContent>
                             </AccordionItem>
                        ))}
                    </Accordion>
                 ) : (
                    <div className="text-center p-8 border-2 border-dashed rounded-md">
                        <p className="font-semibold">No activities found.</p>
                        <p className="text-muted-foreground text-sm">Get started by adding a new activity.</p>
                    </div>
                 )}
            </CardContent>
        </Card>
      )}

    </div>
  );
}
