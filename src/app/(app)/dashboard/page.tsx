
'use client';

import Link from 'next/link';
import { ArrowUpRight, ClipboardPlus, FileText, LoaderCircle, Briefcase } from 'lucide-react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ProgressChart } from '@/components/progress-chart';
import { useFirestoreData } from '@/lib/hooks/use-firestore-data';

export default function DashboardPage() {
  const {
    userProjects,
    isLoading,
  } = useFirestoreData();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoaderCircle className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2">Loading Dashboard...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's a summary of your projects.
        </p>
      </header>

      <Card>
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>My Projects</CardTitle>
              <CardDescription>
                You are a member of {userProjects.length} project(s).
              </CardDescription>
            </div>
            <Button asChild size="sm" className="ml-auto gap-1">
              <Link href="/projects">
                View All
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {userProjects.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {userProjects.map((project) => (
                        <Card key={project.id} className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="line-clamp-1">{project.name}</CardTitle>
                                <CardDescription>{project.address || 'No address provided'}</CardDescription>
                            </CardHeader>
                             <CardContent className="mt-auto">
                                <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                                    {project.status}
                                </Badge>
                             </CardContent>
                             <CardFooter>
                                <Button asChild className="w-full">
                                    <Link href={`/projects/${project.id}/dashboard`}>View Dashboard</Link>
                                </Button>
                             </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-10 border-2 border-dashed rounded-md">
                    <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-900">No Projects Assigned</h3>
                    <p className="mt-1 text-sm text-gray-500">You are not yet a member of any projects.</p>
                </div>
            )}
          </CardContent>
        </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>Recent Actions</CardTitle>
              <CardDescription>
                Quick access to common tasks.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Link href="/daily-progress">
              <div className="flex items-center gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                <ClipboardPlus className="h-8 w-8 text-primary" />
                <div>
                  <h3 className="font-semibold">Log Daily Progress</h3>
                  <p className="text-sm text-muted-foreground">
                    Submit your daily work report with quantities and remarks.
                  </p>
                </div>
              </div>
            </Link>
            <Link href="/daily-report-review">
              <div className="flex items-center gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <h3 className="font-semibold">Review Your Reports</h3>
                  <p className="text-sm text-muted-foreground">
                    Review and export your past daily progress submissions.
                  </p>
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
