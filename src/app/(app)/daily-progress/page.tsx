
'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import { LoaderCircle, Send, PlusCircle, Trash2, CalendarIcon } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Company, Project, Activity, SubActivity, Zone, User as SiteUser, ReportItem } from '@/lib/types';
import { createDailyReport } from '@/lib/firebase-actions';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type StagedReportItem = Omit<ReportItem, 'id'> & {
    reportDate: Date;
    activityName: string;
    subActivityName: string;
    subActivityBoQ: string;
    unit: string;
};

export default function DailyProgressPage() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [selectedSubActivity, setSelectedSubActivity] = useState<SubActivity | null>(null);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [selectedCM, setSelectedCM] = useState<string>('');
  const [reportDate, setReportDate] = useState<Date>(new Date());
  
  const [quantity, setQuantity] = useState<number | string>('');
  const [generalForeman, setGeneralForeman] = useState('');
  const [foreman, setForeman] = useState('');
  const [road, setRoad] = useState('');
  const [subcontractor, setSubcontractor] = useState('');
  const [remarks, setRemarks] = useState('');

  const [stagedItems, setStagedItems] = useState<StagedReportItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const projectsCollection = useMemoFirebase(() => collection(firestore, 'projects'), [firestore]);
  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsCollection);

  const usersCollection = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<SiteUser>(usersCollection);
  
  const userMap = useMemo(() => new Map(users?.map(u => [u.id, u.name])), [users]);
  
  const companyId = selectedProject?.companyId;
  const companyQuery = useMemoFirebase(() => companyId ? query(collection(firestore, 'companies'), where('__name__', '==', companyId)) : null, [companyId, firestore]);
  const { data: companies } = useCollection<Company>(companyQuery);
  const companyName = companies?.[0]?.name || '';
  
  const activitiesQuery = useMemoFirebase(() => {
    if (!selectedProject) return null;
    return collection(firestore, `projects/${selectedProject.id}/activities`);
  }, [firestore, selectedProject]);
  const { data: activities, isLoading: isLoadingActivities } = useCollection<Activity>(activitiesQuery);

  const subActivitiesQuery = useMemoFirebase(() => {
    if (!selectedProject || !selectedActivity) return null;
    return collection(firestore, `projects/${selectedProject.id}/activities/${selectedActivity.id}/subactivities`);
  }, [firestore, selectedProject, selectedActivity]);
  const { data: subActivities, isLoading: isLoadingSubActivities } = useCollection<SubActivity>(subActivitiesQuery);

  const zonesQuery = useMemoFirebase(() => {
    if (!selectedProject) return null;
    return collection(firestore, `projects/${selectedProject.id}/zones`);
  }, [firestore, selectedProject]);
  const { data: zones, isLoading: isLoadingZones } = useCollection<Zone>(zonesQuery);

  const constructionManagers = useMemo(() => users?.filter(u => u.position === 'CM' && u.companyId === selectedProject?.companyId), [users, selectedProject]);
  const engineerName = useMemo(() => user && userMap.get(user.uid), [user, userMap]);

  useEffect(() => {
    setSelectedActivity(null);
    setSelectedSubActivity(null);
    setSelectedZone(null);
    setSubcontractor(companyName || '');
  }, [selectedProject, companyName]);

  useEffect(() => {
    setSelectedSubActivity(null);
  }, [selectedActivity]);

  const handleAddItem = () => {
    if (!selectedProject || !selectedActivity || !selectedSubActivity || !selectedZone || !quantity) {
        toast({ variant: 'destructive', title: 'Missing Information', description: 'Please fill all required fields to add an item.' });
        return;
    }
    
    const newItem: StagedReportItem = {
        reportDate: reportDate,
        activityId: selectedActivity.id,
        subActivityId: selectedSubActivity.id,
        zoneId: selectedZone.id,
        zoneName: selectedZone.name,
        quantity: Number(quantity),
        generalForeman: generalForeman,
        foreman: foreman,
        road: road,
        subcontractor: subcontractor || companyName,
        remarks: remarks,
        // Denormalized data for display
        activityName: selectedActivity.name,
        subActivityName: selectedSubActivity.name,
        subActivityBoQ: selectedSubActivity.BoQ,
        unit: selectedSubActivity.unit,
    };

    setStagedItems(prev => [...prev, newItem]);
    
    // Reset item-specific fields
    setSelectedSubActivity(null);
    setQuantity('');
    setRemarks('');
  };

  const handleRemoveItem = (index: number) => {
    setStagedItems(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleSubmitReport = async () => {
      if (!user || !selectedProject || !selectedCM || stagedItems.length === 0 || !engineerName) {
          toast({ variant: 'destructive', title: 'Incomplete Report', description: 'Please select project, CM, and add at least one item.' });
          return;
      }
      setIsSubmitting(true);

      // Stage 2: Group staged items by their reportDate
      const reportsByDate = stagedItems.reduce((acc, item) => {
        const dateString = format(item.reportDate, 'yyyy-MM-dd');
        if (!acc[dateString]) {
            acc[dateString] = [];
        }
        acc[dateString].push(item);
        return acc;
      }, {} as Record<string, StagedReportItem[]>);

      try {
        let successfulReports = 0;
        // Call the server function once for each date batch
        for (const dateString in reportsByDate) {
            const itemsForDate = reportsByDate[dateString];
            const date = itemsForDate[0].reportDate;
            
            await createDailyReport({
              projectId: selectedProject.id,
              companyId: selectedProject.companyId,
              engineerId: user.uid,
              engineerName: engineerName,
              pmId: selectedProject.pmId,
              cmId: selectedCM,
              reportDate: date,
              items: itemsForDate.map(item => {
                // Remove the extra fields used for display before sending to the server
                const {activityName, subActivityName, subActivityBoQ, unit, reportDate, ...rest} = item;
                return rest;
              }),
            });
            successfulReports++;
        }
        
        toast({ title: 'Reports Submitted', description: `${successfulReports} daily progress reports have been logged.` });
        setStagedItems([]); // Clear the queue on success

      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Submission Failed', description: error.message });
      } finally {
          setIsSubmitting(false);
      }
  }

  const isLoading = isLoadingProjects || isLoadingUsers || isLoadingActivities || isLoadingSubActivities || isLoadingZones;
  
  // Calculate the number of unique dates for the submit button label
  const uniqueDatesCount = useMemo(() => {
    const dates = new Set(stagedItems.map(item => format(item.reportDate, 'yyyy-MM-dd')));
    return dates.size;
  }, [stagedItems]);


  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Daily Progress</h1>
        <p className="text-muted-foreground">
          Fill in the details to submit your daily progress report.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Report Header</CardTitle>
                    <CardDescription>Select the project, date, and managers for this report.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Project</Label>
                            <Select onValueChange={(id) => setSelectedProject(projects?.find(p => p.id === id) || null)} value={selectedProject?.id || ''}>
                                <SelectTrigger><SelectValue placeholder="Select a project" /></SelectTrigger>
                                <SelectContent>
                                    {isLoadingProjects ? <LoaderCircle className="animate-spin" /> :
                                    projects?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label>Project Manager (PM)</Label>
                            <Input value={userMap.get(selectedProject?.pmId || '') || ''} disabled />
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Construction Manager (CM)</Label>
                            <Select onValueChange={setSelectedCM} value={selectedCM} disabled={!selectedProject}>
                                <SelectTrigger><SelectValue placeholder="Select a CM" /></SelectTrigger>
                                <SelectContent>
                                    {isLoadingUsers ? <LoaderCircle className="animate-spin" /> :
                                    constructionManagers?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label>Report Date</Label>
                             <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !reportDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {reportDate ? format(reportDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={reportDate}
                                    onSelect={(date) => setReportDate(date || new Date())}
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Submitting Engineer</Label>
                            <Input value={engineerName || 'Loading...'} disabled />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Add Progress Item</CardTitle>
                    <CardDescription>Define a single piece of work completed. The current selected date will be assigned to this item.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Activity</Label>
                            <Select onValueChange={(id) => setSelectedActivity(activities?.find(a => a.id === id) || null)} value={selectedActivity?.id || ''} disabled={!selectedProject}>
                                <SelectTrigger><SelectValue placeholder="Select an activity" /></SelectTrigger>
                                <SelectContent>
                                    {isLoadingActivities ? <LoaderCircle className="animate-spin" /> :
                                    activities?.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({a.code})</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Sub-Activity (BoQ Item)</Label>
                            <Select onValueChange={(id) => setSelectedSubActivity(subActivities?.find(sa => sa.id === id) || null)} value={selectedSubActivity?.id || ''} disabled={!selectedActivity}>
                                <SelectTrigger><SelectValue placeholder="Select a sub-activity" /></SelectTrigger>
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
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <Label>Zone</Label>
                            <Select onValueChange={(id) => setSelectedZone(zones?.find(z => z.id === id) || null)} value={selectedZone?.id || ''} disabled={!selectedProject}>
                                <SelectTrigger><SelectValue placeholder="Select a zone" /></SelectTrigger>
                                <SelectContent>
                                    {isLoadingZones ? <LoaderCircle className="animate-spin" /> :
                                    zones?.map(z => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Quantity</Label>
                            <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} type="number" step="any" placeholder="Enter quantity of work done" />
                        </div>
                     </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>General Foreman</Label>
                            <Input value={generalForeman} onChange={(e) => setGeneralForeman(e.target.value)} placeholder="Enter name" />
                        </div>
                        <div className="space-y-2">
                            <Label>Foreman</Label>
                            <Input value={foreman} onChange={(e) => setForeman(e.target.value)} placeholder="Enter name" />
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Road (Optional)</Label>
                            <Input value={road} onChange={(e) => setRoad(e.target.value)} placeholder="Enter road or location details" />
                        </div>
                        <div className="space-y-2">
                            <Label>Company / Sub-contractor</Label>
                            <Input value={subcontractor} onChange={(e) => setSubcontractor(e.target.value)} placeholder="Enter company name" />
                        </div>
                     </div>
                     <div className="space-y-2">
                        <Label>Remarks (Optional)</Label>
                        <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Add any remarks for this item" />
                     </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleAddItem} disabled={!selectedProject} className="ml-auto">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Item to Report
                    </Button>
                </CardFooter>
            </Card>
        </div>

        <div className="lg:col-span-1">
            <Card>
                 <CardHeader>
                    <CardTitle>Report Summary</CardTitle>
                    <CardDescription>{stagedItems.length} items to be submitted.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {stagedItems.length > 0 ? (
                        stagedItems.map((item, index) => (
                            <div key={index} className="border rounded-lg p-3 space-y-2 bg-muted/30 relative">
                                <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => handleRemoveItem(index)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                                <p className="font-semibold text-sm">{item.subActivityName} <span className="text-muted-foreground text-xs">({item.subActivityBoQ})</span></p>
                                <p className="text-xs text-muted-foreground">{item.activityName}</p>
                                <div className="flex justify-between items-center text-sm pt-2 border-t mt-2">
                                    <p><span className="text-muted-foreground">Zone:</span> {item.zoneName}</p>
                                    <p className="font-medium">{item.quantity} {item.unit}</p>
                                </div>
                                <p className="text-xs text-muted-foreground"><span className="font-medium">Date:</span> {format(item.reportDate, "PPP")}</p>
                                {item.remarks && <p className='text-xs text-muted-foreground italic pt-1'>"{item.remarks}"</p>}
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-sm text-muted-foreground py-10 border-2 border-dashed rounded-md">
                            Add items using the form to see them here.
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSubmitReport} disabled={isSubmitting || stagedItems.length === 0} className="w-full">
                        {isSubmitting && <LoaderCircle className="mr-2 animate-spin" />}
                        Submit {isSubmitting ? '...' : `Reports (${uniqueDatesCount})`}
                        <Send className="ml-2" />
                    </Button>
                </CardFooter>
            </Card>
        </div>
      </div>
    </div>
  );
}

    