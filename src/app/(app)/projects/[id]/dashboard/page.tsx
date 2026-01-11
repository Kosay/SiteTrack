
'use client';

import { useParams, useRouter } from 'next/navigation';
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
import { ArrowLeft, LoaderCircle, ExternalLink, Boxes } from 'lucide-react';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export default function ProjectDashboardPage() {
  const params = useParams();
  const id = params.id as string;
  const firestore = useFirestore();

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
  const { data: subActivitiesSummary, isLoading: isLoadingSubActivitiesSummary } = useCollection<SubActivitySummary>(subActivitiesSummaryRef);

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
      <div className="text-center">
        <h2 className="text-2xl font-bold">Project Data Not Found</h2>
        <p className="text-muted-foreground">
          The project could not be loaded.
        </p>
        <Button asChild className="mt-4">
          <Link href="/projects">Go Back</Link>
        </Button>
      </div>
    );
  }
  
  const progressPercent = summary?.overallProgress || 0;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/projects">
            <ArrowLeft />
            <span className="sr-only">Back to Projects</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          <p className="text-muted-foreground">
            A high-level overview of project progress.
          </p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Progress Summary</CardTitle>
          {summary && (
            <CardDescription>
              Last report submitted on:{' '}
              {summary.lastReportAt
                ? format(summary.lastReportAt.toDate(), 'PPP p')
                : 'N/A'}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span>Overall Progress</span>
              <span>{progressPercent.toFixed(2)}%</span>
            </div>
            <Progress value={progressPercent} className="h-4" />
             {summary && (
                <p className="text-xs text-muted-foreground">
                    Based on the weighted average progress of {summary.subActivityCount} sub-activities.
                </p>
             )}
          </div>
          
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center pt-4 border-t">
                <div>
                    <p className="text-2xl font-bold">{summary.subActivityCount}</p>
                    <p className="text-sm text-muted-foreground">Total Sub-Activities</p>
                </div>
                <div>
                    <p className="text-2xl font-bold text-green-600">{(summary.totalProgressSum || 0).toFixed(2)}%</p>
                    <p className="text-sm text-muted-foreground">Sum of Percentages</p>
                </div>
                <div>
                    <p className="text-2xl font-bold text-blue-600">{progressPercent.toFixed(2)}%</p>
                    <p className="text-sm text-muted-foreground">Overall Average</p>
                </div>
                <div>
                    <p className="text-2xl font-bold text-red-600">{ (100 - progressPercent).toFixed(2) }%</p>
                    <p className="text-sm text-muted-foreground">Remaining</p>
                </div>
            </div>
          )}

        </CardContent>
      </Card>

       <Card>
        <CardHeader>
          <CardTitle>Work Breakdown Structure (BoQ)</CardTitle>
          <CardDescription>
            Detailed progress for each sub-activity (Bill of Quantities item).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {subActivitiesSummary && subActivitiesSummary.length > 0 ? (
                subActivitiesSummary.map(sa => {
                    const donePercentage = sa.totalWork > 0 ? (sa.doneWork / sa.totalWork) * 100 : 0;
                    return (
                        <div key={sa.id} className="p-4 border rounded-lg">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between">
                                <div>
                                    <h4 className="font-semibold flex items-center gap-2"><Boxes className="w-4 h-4 text-muted-foreground" /> {sa.subActivityName} <span className="text-sm text-muted-foreground">({sa.BoQ})</span></h4>
                                    <p className="text-xs text-muted-foreground ml-6">{sa.activityName}</p>
                                </div>
                                <div className="text-right mt-2 md:mt-0">
                                    <p className="font-bold text-lg">{donePercentage.toFixed(1)}%</p>
                                    <p className="text-xs text-muted-foreground">{sa.doneWork.toFixed(2)} / {sa.totalWork.toFixed(2)} {sa.unit}</p>
                                </div>
                            </div>
                            <div className="mt-3 space-y-3">
                                <Progress value={donePercentage} />
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                    <div className="flex justify-between items-center bg-green-100 dark:bg-green-900/50 p-1.5 rounded">
                                        <span className="font-medium">Grade A:</span>
                                        <Badge variant="secondary" className="bg-white dark:bg-green-900/30">{(sa.workGradeA || 0).toFixed(2)}</Badge>
                                    </div>
                                    <div className="flex justify-between items-center bg-orange-100 dark:bg-orange-900/50 p-1.5 rounded">
                                        <span className="font-medium">Grade B:</span>
                                        <Badge variant="secondary" className="bg-white dark:bg-orange-900/30">{(sa.workGradeB || 0).toFixed(2)}</Badge>
                                    </div>
                                    <div className="flex justify-between items-center bg-red-100 dark:bg-red-900/50 p-1.5 rounded">
                                        <span className="font-medium">Grade C:</span>
                                        <Badge variant="secondary" className="bg-white dark:bg-red-900/30">{(sa.workGradeC || 0).toFixed(2)}</Badge>
                                    </div>
                                     <div className="flex justify-between items-center bg-blue-100 dark:bg-blue-900/50 p-1.5 rounded">
                                        <span className="font-medium">Pending:</span>
                                        <Badge variant="secondary" className="bg-white dark:bg-blue-900/30">{(sa.pendingWork || 0).toFixed(2)}</Badge>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })
            ) : (
                <div className="text-center py-10 text-muted-foreground">No sub-activity data to display.</div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
