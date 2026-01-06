import Link from 'next/link';
import { ArrowUpRight, ClipboardPlus, FileText } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { overallProgressData, activityProgressData, reportLogs } from '@/lib/data';

export default function DashboardPage() {
  const recentLogs = reportLogs.slice(0, 3);
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's a summary of your construction site progress.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Overall Progress</CardTitle>
            <CardDescription>
              A timeline of the project's completion percentage.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ProgressChart
              data={overallProgressData}
              type="line"
              dataKey="progress"
              index="date"
            />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Progress by Activity</CardTitle>
            <CardDescription>
              Completion status of major construction phases.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProgressChart
              data={activityProgressData}
              type="bar"
              dataKey="progress"
              index="name"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>Recent Progress Logs</CardTitle>
              <CardDescription>
                The latest updates from the construction site.
              </CardDescription>
            </div>
            <Button asChild size="sm" className="ml-auto gap-1">
              <Link href="/reports">
                View All
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="font-medium">{log.activity}</div>
                      <div className="hidden text-sm text-muted-foreground md:inline">
                        {log.description.substring(0, 50)}...
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge
                        variant={
                          log.status === 'Completed' ? 'default' : 'secondary'
                        }
                        className={
                          log.status === 'Completed'
                            ? 'bg-primary/20 text-primary-foreground hover:bg-primary/30'
                            : ''
                        }
                      >
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{log.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Get started with common tasks.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Link href="/progress">
              <div className="flex items-center gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                <ClipboardPlus className="h-8 w-8 text-primary" />
                <div>
                  <h3 className="font-semibold">Log New Progress</h3>
                  <p className="text-sm text-muted-foreground">
                    Add a new update with photos and descriptions.
                  </p>
                </div>
              </div>
            </Link>
            <Link href="/reports">
              <div className="flex items-center gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <h3 className="font-semibold">Generate a Report</h3>
                  <p className="text-sm text-muted-foreground">
                    Compile logs into a shareable project report.
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
