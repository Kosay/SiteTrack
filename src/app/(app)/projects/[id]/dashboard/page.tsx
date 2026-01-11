
'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import type { Project, ProjectDashboardSummary, SubActivitySummary } from '@/lib/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LoaderCircle, Boxes, CheckCircle2, Clock, AlertTriangle, ShieldAlert, Filter, X } from 'lucide-react';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ProjectDashboardPage() {
  const params = useParams();
  const id = params.id as string;
  const firestore = useFirestore();

  // --- Filter State ---
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [gradeFilter, setGradeFilter] = useState<string>("all");

  const projectRef = useMemoFirebase(
    () => doc(firestore, 'projects', id),
    [firestore, id]
  );
  const { data: project, isLoading: isLoadingProject } = useDoc<Project>(projectRef);

  const summaryRef = useMemoFirebase(
    () => doc(firestore, `projects/${id}/dashboards/summary`),
    [firestore, id]
  );
  const { data: summary, isLoading: isLoadingSummary } =
    useDoc<ProjectDashboardSummary>(summaryRef);

  const subActivitiesSummaryRef = useMemoFirebase(
    () => query(collection(firestore, `projects/${id}/dashboards`), where('BoQ', '!=', '')),
    [firestore, id]
  );
  const { data: subActivitiesSummary, isLoading: isLoadingSubActivitiesSummary } = 
    useCollection<SubActivitySummary>(subActivitiesSummaryRef);

  // --- Filter Logic ---
  const uniqueActivities = useMemo(() => {
    if (!subActivitiesSummary) return [];
    const activities = subActivitiesSummary.map(sa => sa.activityName);
    return Array.from(new Set(activities)).sort();
  }, [subActivitiesSummary]);

  const filteredSubActivities = useMemo(() => {
    if (!subActivitiesSummary) return [];
    
    return subActivitiesSummary.filter(sa => {
      const matchesActivity = activityFilter === "all" || sa.activityName === activityFilter;
      
      let matchesGrade = true;
      if (gradeFilter === "gradeA") matchesGrade = (sa.workGradeA || 0) > 0;
      if (gradeFilter === "gradeB") matchesGrade = (sa.workGradeB || 0) > 0;
      if (gradeFilter === "gradeC") matchesGrade = (sa.workGradeC || 0) > 0;
      if (gradeFilter === "pending") matchesGrade = (sa.pendingWork || 0) > 0;

      return matchesActivity && matchesGrade;
    });
  }, [subActivitiesSummary, activityFilter, gradeFilter]);

  const resetFilters = () => {
    setActivityFilter("all");
    setGradeFilter("all");
  };

  const isLoading = isLoadingProject || isLoadingSummary || isLoadingSubActivitiesSummary;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoaderCircle className="w-8 h-8 animate-spin text-primary" />
        <p className="ml-2">Loading Project Dashboard...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Project Data Not Found</h2>
        <p className="text-muted-foreground">The project could not be loaded.</p>
        <Button asChild className="mt-4">
          <Link href="/projects">Go Back</Link>
        </Button>
      </div>
    );
  }

  const progressPercent = summary?.overallProgress || 0;

  return (
    <div className="flex flex-col gap-8 pb-12">
      <header className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          <p className="text-muted-foreground">Detailed project analytics.</p>
        </div>
      </header>

      {/* High-Level Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Boxes className="h-5 w-5 text-primary" />
            Overall Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
           <Progress value={summary?.overallProgress || 0} className="h-4" />
           <p className="text-right text-sm font-bold mt-2">{(summary?.overallProgress || 0).toFixed(2)}% Complete</p>
        </CardContent>
      </Card>

      {/* Detailed Section with Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Work Breakdown Structure (BoQ)</CardTitle>
              <CardDescription>Showing {filteredSubActivities.length} sub-activities</CardDescription>
            </div>
            
            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border">
                <Select value={activityFilter} onValueChange={setActivityFilter}>
                  <SelectTrigger className="w-[180px] h-9 border-none bg-transparent shadow-none">
                    <SelectValue placeholder="Activity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Activities</SelectItem>
                    {uniqueActivities.map(act => (
                      <SelectItem key={act} value={act}>{act}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="w-px h-4 bg-border" />

                <Select value={gradeFilter} onValueChange={setGradeFilter}>
                  <SelectTrigger className="w-[150px] h-9 border-none bg-transparent shadow-none">
                    <SelectValue placeholder="Grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Grade</SelectItem>
                    <SelectItem value="gradeA">Has Grade A</SelectItem>
                    <SelectItem value="gradeB">Has Grade B</SelectItem>
                    <SelectItem value="gradeC">Has Grade C</SelectItem>
                    <SelectItem value="pending">Has Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(activityFilter !== "all" || gradeFilter !== "all") && (
                <Button variant="ghost" size="sm" onClick={resetFilters} className="h-9 px-2 text-muted-foreground">
                  <X className="h-4 w-4 mr-1" /> Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col gap-6">
            {filteredSubActivities.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed rounded-xl">
                <Filter className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">No sub-activities match your filters.</p>
                <Button variant="link" onClick={resetFilters}>Reset all filters</Button>
              </div>
            ) : (
              filteredSubActivities.map((sa) => {
                const saProgress = sa.totalWork > 0 ? (sa.doneWork / sa.totalWork) * 100 : 0;
                return (
                  <div key={sa.id} className="p-5 border rounded-xl bg-card">
                    <div className="flex justify-between items-start mb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-mono">{sa.BoQ}</Badge>
                          <h3 className="font-bold">{sa.subActivityName}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground">Activity: {sa.activityName}</p>
                      </div>
                      <span className="text-lg font-black text-primary">{saProgress.toFixed(1)}%</span>
                    </div>

                    <Progress value={saProgress} className="h-2 mb-4" />

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <GradeBadge label="Grade A" value={sa.workGradeA} color="green" icon={<CheckCircle2 className="h-3 w-3" />} />
                      <GradeBadge label="Grade B" value={sa.workGradeB} color="orange" icon={<AlertTriangle className="h-3 w-3" />} />
                      <GradeBadge label="Grade C" value={sa.workGradeC} color="red" icon={<ShieldAlert className="h-3 w-3" />} />
                      <GradeBadge label="Pending" value={sa.pendingWork} color="blue" icon={<Clock className="h-3 w-3" />} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Small helper component for the quality stats
function GradeBadge({ label, value, color, icon }: { label: string, value?: number, color: string, icon: React.ReactNode }) {
  const colors: Record<string, string> = {
    green: "bg-green-50 text-green-700 border-green-100 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/30",
    orange: "bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/30",
    red: "bg-red-50 text-red-700 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30",
    blue: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30",
  };

  return (
    <div className={`flex flex-col p-2 rounded-lg border ${colors[color]}`}>
      <Label className="text-[10px] uppercase font-bold flex items-center gap-1 mb-1 opacity-80">
        {icon} {label}
      </Label>
      <span className="text-sm font-bold">{value || 0}</span>
    </div>
  );
}
