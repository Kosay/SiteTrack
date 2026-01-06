import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { reportLogs } from '@/lib/data';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export default function ReportsPage() {
  const totalLogs = reportLogs.length;
  const completedLogs = reportLogs.filter(
    (log) => log.status === 'Completed'
  ).length;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            View and generate project progress reports.
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Generate Full Report</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Project Progress Report</DialogTitle>
              <DialogDescription>
                A comprehensive summary of all logged activities. You can print
                this page for distribution.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh]">
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Logs</p>
                    <p className="text-2xl font-bold">{totalLogs}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Completed Tasks
                    </p>
                    <p className="text-2xl font-bold">{completedLogs}</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-4">
                  {reportLogs.map((log) => (
                    <div key={log.id} className="space-y-2">
                      <div className="flex justify-between items-baseline">
                        <h3 className="font-semibold">{log.activity}</h3>
                        <p className="text-sm text-muted-foreground">{log.date}</p>
                      </div>
                      <p className="text-sm">{log.description}</p>
                      {log.image && (
                         <div className="w-full overflow-hidden rounded-md border">
                            <Image
                                src={log.image.imageUrl}
                                alt={`Image for ${log.activity}`}
                                width={800}
                                height={600}
                                className="object-cover"
                                data-ai-hint={log.image.imageHint}
                            />
                        </div>
                      )}
                       <Separator className="mt-4"/>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>All Progress Logs</CardTitle>
          <CardDescription>
            A detailed list of every update logged for the project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden w-[100px] sm:table-cell">
                  Image
                </TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="hidden sm:table-cell">
                    {log.image ? (
                      <Image
                        alt="Log image"
                        className="aspect-square rounded-md object-cover"
                        height="64"
                        src={log.image.imageUrl}
                        width="64"
                        data-ai-hint={log.image.imageHint}
                      />
                    ) : (
                      <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center text-muted-foreground">
                        <p className="text-xs">No img</p>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{log.activity}</TableCell>
                  <TableCell>
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
                  <TableCell className="hidden md:table-cell">
                    {log.date}
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{log.activity} - {log.date}</DialogTitle>
                           <DialogDescription>Status: {log.status}</DialogDescription>
                        </DialogHeader>
                         <p className="py-4">{log.description}</p>
                         {log.image && (
                          <div className="relative aspect-video w-full overflow-hidden rounded-md border">
                            <Image
                                src={log.image.imageUrl}
                                alt={`Image for ${log.activity}`}
                                fill
                                className="object-cover"
                                data-ai-hint={log.image.imageHint}
                            />
                        </div>
                         )}
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
