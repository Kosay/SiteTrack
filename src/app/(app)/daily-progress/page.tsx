
'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle, Send } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Company, Project, Activity, SubActivity, Unit, Zone, User as SiteUser } from '@/lib/types';
import { createProgressReport } from '@/lib/firebase-actions';

export default function DailyProgressPage() {
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedActivity, setSelectedActivity] = useState<string>('');
  const [selectedSubActivity, setSelectedSubActivity] = useState<SubActivity | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const projectsCollection = useMemoFirebase(() => collection(firestore, 'projects'), [firestore]);
  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsCollection);

  const usersCollection = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<SiteUser>(usersCollection);

  const userCompanyId = useMemo(() => {
    if (!user || !users) return null;
    return users.find(u => u.id === user.uid)?.companyId;
  }, [user, users]);

  const userCompanyQuery = useMemoFirebase(() => {
      if(!userCompanyId) return null;
      return query(collection(firestore, 'companies'), where('id', '==', userCompanyId));
  }, [firestore, userCompanyId]);
  const {data: userCompany} = useCollection<Company>(userCompanyQuery);

  const currentProject = useMemo(() => projects?.find(p => p.id === selectedProject), [projects, selectedProject]);
  const projectPM = useMemo(() => users?.find(u => u.id === currentProject?.pmId), [users, currentProject]);
  
  const activitiesQuery = useMemoFirebase(() => {
    if (!selectedProject) return null;
    return collection(firestore, `projects/${selectedProject}/activities`);
  }, [firestore, selectedProject]);
  const { data: activities, isLoading: isLoadingActivities } = useCollection<Activity>(activitiesQuery);

  const subActivitiesQuery = useMemoFirebase(() => {
    if (!selectedProject || !selectedActivity) return null;
    return collection(firestore, `projects/${selectedProject}/activities/${selectedActivity}/subactivities`);
  }, [firestore, selectedProject, selectedActivity]);
  const { data: subActivities, isLoading: isLoadingSubActivities } = useCollection<SubActivity>(subActivitiesQuery);

  const zonesQuery = useMemoFirebase(() => {
    if (!selectedProject) return null;
    return collection(firestore, `projects/${selectedProject}/zones`);
  }, [firestore, selectedProject]);
  const { data: zones, isLoading: isLoadingZones } = useCollection<Zone>(zonesQuery);

  const constructionManagers = useMemo(() => users?.filter(u => u.position === 'CM'), [users]);
  
  useEffect(() => {
    setSelectedActivity('');
    setSelectedSubActivity(null);
  }, [selectedProject]);

  useEffect(() => {
    setSelectedSubActivity(null);
  }, [selectedActivity]);


  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!user || !currentProject) {
          toast({ variant: 'destructive', title: 'Error', description: 'User or project not found.' });
          return;
      }
      setIsSubmitting(true);
      const formData = new FormData(event.currentTarget);

      try {
          const reportData = {
              projectId: selectedProject,
              activityId: selectedActivity,
              subActivityId: selectedSubActivity?.id || '',
              cmId: formData.get('cmId') as string,
              zoneId: formData.get('zoneId') as string,
              quantity: parseFloat(formData.get('quantity') as string),
              generalForeman: formData.get('generalForeman') as string,
              foreman: formData.get('foreman') as string,
              road: formData.get('road') as string,
              subcontractor: formData.get('subcontractor') as string,
              remarks: formData.get('remarks') as string,
          };
          
          await createProgressReport(user, currentProject, reportData);
          toast({ title: 'Report Submitted', description: 'Your daily progress has been logged.' });
          event.currentTarget.reset();
          setSelectedSubActivity(null);
      } catch (error: any) {
           toast({ variant: 'destructive', title: 'Submission Failed', description: error.message });
      } finally {
          setIsSubmitting(false);
      }
  };


  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Daily Progress</h1>
        <p className="text-muted-foreground">
          Fill in the details to submit your daily progress report.
        </p>
      </header>

      <Card>
        <form onSubmit={handleSubmit}>
            <CardHeader>
                <CardTitle>Progress Report Form</CardTitle>
                <CardDescription>Select the project and fill in the work details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="project">Project</Label>
                        <Select onValueChange={setSelectedProject} value={selectedProject} name="projectId">
                            <SelectTrigger id="project">
                                <SelectValue placeholder="Select a project" />
                            </SelectTrigger>
                            <SelectContent>
                                {isLoadingProjects ? <LoaderCircle className="animate-spin" /> :
                                projects?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label>Project Manager (PM)</Label>
                        <Input value={projectPM?.name || currentProject?.pmName || 'Select a project first'} disabled />
                    </div>
                </div>

                {selectedProject && (
                    <>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="cm">Construction Manager (CM)</Label>
                                <Select name="cmId">
                                    <SelectTrigger id="cm">
                                        <SelectValue placeholder="Select a CM" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {isLoadingUsers ? <LoaderCircle className="animate-spin" /> :
                                        constructionManagers?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="zone">Zone</Label>
                                <Select name="zoneId">
                                    <SelectTrigger id="zone">
                                        <SelectValue placeholder="Select a zone" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {isLoadingZones ? <LoaderCircle className="animate-spin" /> :
                                        zones?.map(z => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-2">
                                <Label htmlFor="activity">Activity</Label>
                                <Select onValueChange={setSelectedActivity} value={selectedActivity} name="activityId">
                                    <SelectTrigger id="activity">
                                        <SelectValue placeholder="Select an activity" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {isLoadingActivities ? <LoaderCircle className="animate-spin" /> :
                                        activities?.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({a.code})</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="subActivity">Sub-Activity (BoQ Item)</Label>
                                <Select onValueChange={(val) => setSelectedSubActivity(subActivities?.find(sa => sa.id === val) || null)} name="subActivityId" disabled={!selectedActivity || isLoadingSubActivities}>
                                    <SelectTrigger id="subActivity">
                                        <SelectValue placeholder="Select a sub-activity" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {isLoadingSubActivities ? <LoaderCircle className="animate-spin" /> :
                                        subActivities?.map(sa => <SelectItem key={sa.id} value={sa.id}>{sa.name} ({sa.BoQ})</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        
                         {selectedSubActivity && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-md bg-muted/50">
                                <div className="space-y-2">
                                    <Label>BoQ Code</Label>
                                    <Input value={selectedSubActivity.BoQ} disabled />
                                </div>
                                <div className="space-y-2">
                                    <Label>Unit</Label>
                                    <Input value={selectedSubActivity.unit} disabled />
                                </div>
                            </div>
                         )}

                         <div className="space-y-2">
                            <Label htmlFor="quantity">Quantity</Label>
                            <Input id="quantity" name="quantity" type="number" step="any" placeholder="Enter quantity of work done" required />
                         </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="space-y-2">
                                <Label htmlFor="generalForeman">General Foreman</Label>
                                <Input id="generalForeman" name="generalForeman" placeholder="Enter name" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="foreman">Foreman</Label>
                                <Input id="foreman" name="foreman" placeholder="Enter name" />
                            </div>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="road">Road (Optional)</Label>
                                <Input id="road" name="road" placeholder="Enter road or location details" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="subcontractor">Company / Sub-contractor</Label>
                                <Input id="subcontractor" name="subcontractor" placeholder="Enter company name" defaultValue={userCompany?.[0]?.name} />
                            </div>
                         </div>
                         <div className="space-y-2">
                            <Label htmlFor="remarks">Remarks (Optional)</Label>
                            <Textarea id="remarks" name="remarks" placeholder="Add any remarks for this report" />
                         </div>

                    </>
                )}
            </CardContent>
            <CardContent>
                 <Button type="submit" disabled={isSubmitting || !selectedProject} className="w-full">
                    {isSubmitting && <LoaderCircle className="mr-2 animate-spin" />}
                    Submit Report
                    <Send className="ml-2" />
                </Button>
            </CardContent>
        </form>
      </Card>
    </div>
  );
}
