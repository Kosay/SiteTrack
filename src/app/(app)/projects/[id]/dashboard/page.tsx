'use client';

import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Project, ProjectDashboardSummary } from '@/lib/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LoaderCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';

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

  const isLoading = isLoadingProject || isLoadingSummary;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoaderCircle className="w-8 h-8 animate-spin text-primary" />
        <p className="ml-2">Loading Project Dashboard...</p>
      </div>
    );
  }

  if (!project || !summary) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold">Project Data Not Found</h2>
        <p className="text-muted-foreground">
          The project or its summary data could not be loaded.
        </p>
        <Button asChild className="mt-4">
          <Link href="/projects">Go Back</Link>
        </Button>
      </div>
    );
  }
  
  const progressPercent = summary.totalWork > 0 ? (summary.doneWork / summary.totalWork) * 100 : 0;
  const pendingPercent = summary.totalWork > 0 ? (summary.totalPendingWork / summary.totalWork) * 100 : 0;


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
          <CardDescription>
            Last report on:{' '}
            {summary.lastReportAt
              ? format(summary.lastReportAt.toDate(), 'PPP p')
              : 'N/A'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span>Overall Progress</span>
              <span>{progressPercent.toFixed(2)}%</span>
            </div>
            <Progress value={progressPercent} className="h-4" />
             <p className="text-xs text-muted-foreground">
                {summary.doneWork.toLocaleString()} / {summary.totalWork.toLocaleString()} units completed.
            </p>
          </div>
          
           <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium text-amber-600">
              <span>Pending Review</span>
              <span>{pendingPercent.toFixed(2)}%</span>
            </div>
            <Progress value={pendingPercent} className="h-2 [&>div]:bg-amber-500" />
            <p className="text-xs text-muted-foreground">
                {summary.totalPendingWork.toLocaleString()} units are awaiting consultant approval.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center pt-4 border-t">
             <div>
                <p className="text-2xl font-bold">{summary.totalWork.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Work</p>
            </div>
             <div>
                <p className="text-2xl font-bold text-green-600">{summary.doneWork.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Work Done</p>
            </div>
             <div>
                <p className="text-2xl font-bold text-amber-600">{summary.totalPendingWork.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Pending Work</p>
            </div>
             <div>
                <p className="text-2xl font-bold text-red-600">{(summary.totalWork - summary.doneWork - summary.totalPendingWork).toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Remaining</p>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
