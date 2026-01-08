
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
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle, Download, CalendarIcon } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, getDocs, collectionGroup } from 'firebase/firestore';
import type { Company, Project, Activity, SubActivity, Zone, User as SiteUser, DailyReport, ReportItem } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, startOfDay, endOfDay } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import Papa from 'papaparse';


type EnrichedReport = DailyReport & {
    items: ReportItem[];
    projectName: string;
    cmName: string;
}

export default function DailyReportReviewPage() {
  const [dateRange, setDateRange] = useState<{ from?: Date, to?: Date }>({ from: new Date(), to: new Date() });
  const [reports, setReports] = useState<EnrichedReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const projectsCollection = useMemoFirebase(() => collection(firestore, 'projects'), [firestore]);
  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsCollection);
  
  const usersCollection = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<SiteUser>(usersCollection);

  const masterDataQuery = useMemoFirebase(() => {
    if (!projects?.length) return null;
    const projectIds = projects.map(p => p.id);
    const queries = projectIds.flatMap(id => [
        collection(firestore, `projects/${id}/activities`),
        collection(firestore, `projects/${id}/zones`),
        collection(firestore, `projects/${id}/activities`) // placeholder for sub-activities
    ]);
    // This is a bit of a hack to get a dependency for useMemoFirebase
    return query(collection(firestore, `projects/${projectIds[0]}/activities`));
  }, [projects, firestore]);

  const { data: masterData, isLoading: isLoadingMaster } = useCollection(masterDataQuery);


  const [activitiesMap, subActivitiesMap, zonesMap, userMap, projectMap] = useMemo(() => {
    const actMap = new Map<string, Activity>();
    const subActMap = new Map<string, SubActivity>();
    const zMap = new Map<string, Zone>();
    const uMap = new Map(users?.map(u => [u.id, u.name]));
    const pMap = new Map(projects?.map(p => [p.id, p.name]));
    return [actMap, subActMap, zMap, uMap, pMap];
  }, [users, projects]);


  useEffect(() => {
    const fetchMasterData = async () => {
      if (!projects) return;

      const newActivitiesMap = new Map<string, Activity>();
      const newSubActivitiesMap = new Map<string, SubActivity>();
      const newZonesMap = new Map<string, Zone>();
      
      for (const project of projects) {
        const activitiesSnap = await getDocs(collection(firestore, `projects/${project.id}/activities`));
        for (const activityDoc of activitiesSnap.docs) {
          const activity = { id: activityDoc.id, ...activityDoc.data() } as Activity;
          newActivitiesMap.set(activity.id, activity);

          const subActivitiesSnap = await getDocs(collection(firestore, activityDoc.ref.path, 'subactivities'));
          subActivitiesSnap.forEach(subDoc => {
             const subActivity = { id: subDoc.id, ...subDoc.data() } as SubActivity;
             newSubActivitiesMap.set(subDoc.id, subActivity);
          });
        }
        
        const zonesSnap = await getDocs(collection(firestore, `projects/${project.id}/zones`));
        zonesSnap.forEach(zoneDoc => {
            const zone = { id: zoneDoc.id, ...zoneDoc.data() } as Zone;
            newZonesMap.set(zoneDoc.id, zone);
        });
      }
      
      (activitiesMap as any) = newActivitiesMap;
      (subActivitiesMap as any) = newSubActivitiesMap;
      (zonesMap as any) = newZonesMap;
    };

    fetchMasterData();
  }, [projects, firestore, activitiesMap, subActivitiesMap, zonesMap]);


  const handleSearch = async () => {
    if (!user || !dateRange.from || !dateRange.to) {
        toast({ variant: 'destructive', title: 'Missing Information', description: 'Please select a valid date range.' });
        return;
    }
    setIsLoading(true);

    try {
        const reportsQuery = query(
            collectionGroup(firestore, 'daily_reports'),
            where('engineerId', '==', user.uid),
            where('reportDate', '>=', startOfDay(dateRange.from)),
            where('reportDate', '<=', endOfDay(dateRange.to))
        );

        const querySnapshot = await getDocs(reportsQuery);
        const fetchedReports: EnrichedReport[] = [];

        for (const reportDoc of querySnapshot.docs) {
            const reportData = { id: reportDoc.id, ...reportDoc.data() } as DailyReport;
            
            const itemsSnap = await getDocs(collection(firestore, reportDoc.ref.path, 'items'));
            const items = itemsSnap.docs.map(itemDoc => ({ id: itemDoc.id, ...itemDoc.data() } as ReportItem));

            fetchedReports.push({
                ...reportData,
                items,
                projectName: projectMap.get(reportData.projectId) || 'Unknown Project',
                cmName: userMap.get(reportData.cmId) || 'Unknown CM',
            });
        }

        fetchedReports.sort((a,b) => b.reportDate.toMillis() - a.reportDate.toMillis());
        setReports(fetchedReports);
        if(fetchedReports.length === 0) {
            toast({ title: "No Reports Found", description: "No reports were submitted by you in this date range."});
        }
    } catch(error: any) {
        console.error("Error fetching reports:", error);
        toast({ variant: 'destructive', title: 'Search Failed', description: error.message });
    } finally {
        setIsLoading(false);
    }
  }

  const handleExport = () => {
    if (reports.length === 0) {
        toast({ variant: 'destructive', title: 'No data to export', description: 'Please search for reports first.' });
        return;
    }
    
    const dataToExport = reports.flatMap(report => 
        report.items.map(item => ({
            'ReportDate': format(report.reportDate.toDate(), 'yyyy-MM-dd'),
            'ProjectName': report.projectName,
            'EngineerName': report.engineerName,
            'CMName': report.cmName,
            'Activity': activitiesMap.get(item.activityId)?.name || item.activityId,
            'SubActivity (BoQ)': subActivitiesMap.get(item.subActivityId)?.BoQ || item.subActivityId,
            'SubActivityName': subActivitiesMap.get(item.subActivityId)?.name || '',
            'Zone': zonesMap.get(item.zoneId)?.name || item.zoneId,
            'Quantity': item.quantity,
            'Unit': subActivitiesMap.get(item.subActivityId)?.unit || '',
            'GeneralForeman': item.generalForeman,
            'Foreman': item.foreman,
            'Road': item.road,
            'Subcontractor': item.subcontractor,
            'Remarks': item.remarks,
        }))
    );

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const fromDate = format(dateRange.from || new Date(), 'yyyy-MM-dd');
    const toDate = format(dateRange.to || new Date(), 'yyyy-MM-dd');
    link.setAttribute('download', `daily_reports_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Daily Report Review</h1>
        <p className="text-muted-foreground">
          Search and review your submitted daily progress reports.
        </p>
      </header>
        <Card>
            <CardHeader>
                <CardTitle>Filter Reports</CardTitle>
                <CardDescription>Select a date range to search for your reports.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row gap-4 items-end">
                <div className="grid gap-2">
                    <Label>From</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn("w-[280px] justify-start text-left font-normal", !dateRange.from && "text-muted-foreground")}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange.from ? format(dateRange.from, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={dateRange.from} onSelect={(d) => setDateRange(prev => ({...prev, from: d}))} initialFocus />
                        </PopoverContent>
                    </Popover>
                </div>
                 <div className="grid gap-2">
                    <Label>To</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn("w-[280px] justify-start text-left font-normal", !dateRange.to && "text-muted-foreground")}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange.to ? format(dateRange.to, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={dateRange.to} onSelect={(d) => setDateRange(prev => ({...prev, to: d}))} initialFocus />
                        </PopoverContent>
                    </Popover>
                </div>
                <Button onClick={handleSearch} disabled={isLoading}>
                    {isLoading && <LoaderCircle className="mr-2 animate-spin" />}
                    Search
                </Button>
                <Button onClick={handleExport} variant="outline" className="ml-auto" disabled={reports.length === 0}>
                    <Download className="mr-2"/>
                    Export CSV
                </Button>
            </CardContent>
        </Card>
      
        {isLoading ? (
            <div className="flex items-center justify-center h-64"><LoaderCircle className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
            <div className="space-y-4">
            {reports.length > 0 ? (
                 <Accordion type="multiple" className="w-full">
                    {reports.map(report => (
                        <AccordionItem value={report.id} key={report.id}>
                             <AccordionTrigger>
                                <div className="flex justify-between w-full pr-4">
                                    <div className="flex flex-col text-left">
                                        <p className="font-semibold">{report.projectName}</p>
                                        <p className="text-sm text-muted-foreground">Report for {format(report.reportDate.toDate(), 'PPP')}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={report.status === 'Approved' ? 'default' : 'secondary'}>{report.status}</Badge>
                                        <Badge variant="outline">{report.items.length} items</Badge>
                                    </div>
                                </div>
                             </AccordionTrigger>
                             <AccordionContent className="p-4 space-y-3 bg-muted/30">
                                {report.items.map(item => (
                                    <div key={item.id} className="p-3 border rounded-md bg-background">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <p className="font-semibold text-sm">{subActivitiesMap.get(item.subActivityId)?.name || 'Unknown'}</p>
                                                <p className="text-xs text-muted-foreground">{activitiesMap.get(item.activityId)?.name || 'Unknown'}</p>
                                            </div>
                                             <p className="text-base font-bold">{item.quantity} <span className="font-normal text-sm text-muted-foreground">{subActivitiesMap.get(item.subActivityId)?.unit}</span></p>
                                        </div>
                                        <div className="text-xs text-muted-foreground grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 mt-2 pt-2 border-t">
                                            <p><span className="font-medium">Zone:</span> {zonesMap.get(item.zoneId)?.name}</p>
                                            <p><span className="font-medium">Foreman:</span> {item.foreman}</p>
                                            <p><span className="font-medium">Subcontractor:</span> {item.subcontractor}</p>
                                            <p><span className="font-medium">Road:</span> {item.road || 'N/A'}</p>
                                        </div>
                                        {item.remarks && <p className="text-xs italic text-muted-foreground mt-2">"{item.remarks}"</p>}
                                    </div>
                                ))}
                             </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            ) : (
                <Card>
                    <CardContent className="py-20 text-center text-muted-foreground">
                        <p>No reports found for the selected criteria. Please adjust your search and try again.</p>
                    </CardContent>
                </Card>
            )}
            </div>
        )}
    </div>
  );
}

