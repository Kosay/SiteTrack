
'use client';

import { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import type { User, Equipment, SubActivitySummary, Project } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, collectionGroup } from 'firebase/firestore';
import { HardHat, LoaderCircle } from 'lucide-react';
import { useFirestoreData } from '@/lib/hooks/use-firestore-data';
import { Label } from '@/components/ui/label';

const GradeChart = ({ data }: { data: any }) => {
    const chartData = [
        { 
            name: 'Grades', 
            gradeA: data.gradeAPercentage, 
            gradeB: data.gradeBPercentage, 
            gradeC: data.gradeCPercentage, 
            pending: data.pendingPercentage,
            remaining: data.remainingPercentage,
            // Raw quantities for tooltip
            gradeAQty: data.workGradeA,
            gradeBQty: data.workGradeB,
            gradeCQty: data.workGradeC,
            pendingQty: data.pendingWork,
            remainingQty: data.remainingWork,
        }
    ];

    const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        return (
          <div className="p-2 text-sm bg-background border rounded-md shadow-lg">
            <p className="font-bold mb-2">Work Grades</p>
            <p style={{ color: 'hsl(var(--chart-1))' }}>Grade A: {payload[0].payload.gradeAQty.toFixed(2)} ({payload[0].value.toFixed(2)}%)</p>
            <p style={{ color: 'hsl(var(--chart-2))' }}>Grade B: {payload[1].payload.gradeBQty.toFixed(2)} ({payload[1].value.toFixed(2)}%)</p>
            <p style={{ color: 'hsl(var(--chart-4))' }}>Grade C: {payload[2].payload.gradeCQty.toFixed(2)} ({payload[2].value.toFixed(2)}%)</p>
            <p style={{ color: 'hsl(var(--chart-3))' }}>Pending: {payload[3].payload.pendingQty.toFixed(2)} ({payload[3].value.toFixed(2)}%)</p>
            <p style={{ color: '#a0a0a0' }}>Remaining: {payload[4].payload.remainingQty.toFixed(2)} ({payload[4].value.toFixed(2)}%)</p>
          </div>
        );
      }
      return null;
    };

    return (
        <ResponsiveContainer width="100%" height={20}>
            <BarChart data={chartData} layout="vertical" stackOffset="expand">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip content={<CustomTooltip />} cursor={{fill: 'hsl(var(--muted))'}} />
                <Bar dataKey="gradeA" stackId="a" fill="hsl(var(--chart-1))" />
                <Bar dataKey="gradeB" stackId="a" fill="hsl(var(--chart-2))" />
                <Bar dataKey="gradeC" stackId="a" fill="hsl(var(--chart-4))" />
                <Bar dataKey="pending" stackId="a" fill="hsl(var(--chart-3))" />
                <Bar dataKey="remaining" stackId="a" fill="#e5e7eb" className="dark:fill-zinc-800" />
            </BarChart>
        </ResponsiveContainer>
    );
};

const DoneWorkChart = ({ data }: { data: any }) => {
     const chartData = [
        { 
            name: 'Work Done', 
            done: data.donePercentage, 
            remaining: 100 - data.donePercentage,
            doneQty: data.doneWork,
            remainingQty: data.totalWork - data.doneWork,
        }
    ];

    const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        return (
          <div className="p-2 text-sm bg-background border rounded-md shadow-lg">
            <p className="font-bold mb-2">Work Status</p>
            <p style={{ color: 'hsl(var(--chart-1))' }}>Done: {payload[0].payload.doneQty.toFixed(2)} ({payload[0].value.toFixed(2)}%)</p>
            <p style={{ color: '#a0a0a0' }}>Remaining: {payload[1].payload.remainingQty.toFixed(2)} ({payload[1].value.toFixed(2)}%)</p>
          </div>
        );
      }
      return null;
    };


    return (
        <ResponsiveContainer width="100%" height={20}>
            <BarChart data={chartData} layout="vertical" stackOffset="expand">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip content={<CustomTooltip />} cursor={{fill: 'hsl(var(--muted))'}}/>
                <Bar dataKey="done" stackId="a" fill="hsl(var(--chart-1))" />
                <Bar dataKey="remaining" stackId="a" fill="#e5e7eb" className="dark:fill-zinc-800" />
            </BarChart>
        </ResponsiveContainer>
    );
};

export function EngineerDashboard({ userProfile }: { userProfile: User | null }) {
  const firestore = useFirestore();
  const { userProjects, isLoading: isLoadingProjects } = useFirestoreData();
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  const equipmentQuery = useMemoFirebase(() => {
    if (!userProfile) return null;
    return query(collection(firestore, 'equipment'), where('assigneeId', '==', userProfile.id));
  }, [firestore, userProfile]);
  const { data: assignedEquipment, isLoading: isLoadingEquipment } = useCollection<Equipment>(equipmentQuery);

  const subActivitiesQuery = useMemoFirebase(() => {
    if (!userProjects || userProjects.length === 0) return null;
    
    // Get project IDs that the user is a member of.
    const projectIds = userProjects.map(p => p.id);
    if (projectIds.length === 0) return null;

    // This query is now valid. It finds all sub-activity summaries
    // by looking for documents that have a BoQ field, which the
    // main 'summary' document lacks.
    return query(
      collectionGroup(firestore, 'dashboards'),
      where('BoQ', '!=', ''),
      where('projectId', 'in', projectIds)
    );
  }, [firestore, userProjects]);

  const { data: subActivities, isLoading: isLoadingSubActivities } = useCollection<SubActivitySummary>(subActivitiesQuery);
  
  const chartData = useMemo(() => {
    if (!subActivities) return [];

    const filtered = selectedProject 
        ? subActivities.filter(sa => (sa as any).projectId === selectedProject) 
        : subActivities;
    
    return filtered.map(sa => {
        const total = sa.totalWork || 1;
        const done = sa.doneWork || 0;
        const pending = sa.pendingWork || 0;
        const gradeA = sa.workGradeA || 0;
        const gradeB = sa.workGradeB || 0;
        const gradeC = sa.workGradeC || 0;
        const remaining = Math.max(0, total - done - pending);
        
        return {
            id: (sa as any).id,
            name: sa.subActivityName,
            activityName: sa.activityName,
            BoQ: sa.BoQ,
            totalWork: total,
            doneWork: done,
            pendingWork: pending,
            workGradeA: gradeA,
            workGradeB: gradeB,
            workGradeC: gradeC,
            remainingWork: remaining,
            donePercentage: (done / total) * 100,
            pendingPercentage: (pending / total) * 100,
            gradeAPercentage: (gradeA / total) * 100,
            gradeBPercentage: (gradeB / total) * 100,
            gradeCPercentage: (gradeC / total) * 100,
            remainingPercentage: (remaining / total) * 100,
        }
    })
  }, [subActivities, selectedProject]);


  const isLoading = isLoadingEquipment || isLoadingSubActivities || isLoadingProjects;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Engineer's Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome, {userProfile?.name}. Here's your overview.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Assigned Equipment
            </CardTitle>
            <HardHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingEquipment ? <LoaderCircle className="animate-spin" /> : 
                <div className="text-2xl font-bold">{assignedEquipment?.length || 0}</div>
            }
            <p className="text-xs text-muted-foreground">
              Total equipment under your name
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <CardTitle>Sub-Activity Progress</CardTitle>
                <CardDescription>Detailed progress for each Bill of Quantities (BoQ) item.</CardDescription>
              </div>
              <div className="w-full md:w-64">
                <Label>Filter by Project</Label>
                 <Select onValueChange={(value) => setSelectedProject(value === 'all' ? null : value)} defaultValue="all">
                    <SelectTrigger>
                        <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Projects</SelectItem>
                        {userProjects.map((p: Project) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>
            </div>
        </CardHeader>
        <CardContent className="space-y-8">
            {isLoading && <div className="flex justify-center p-8"><LoaderCircle className="animate-spin w-8 h-8" /></div>}
            {!isLoading && chartData.length === 0 && <p className="text-center text-muted-foreground py-10">
                {selectedProject ? "No sub-activity data for this project." : "No sub-activity data available for your projects."}
            </p>}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-12">
                {chartData.map(sa => (
                    <div key={sa.id} className="space-y-4">
                        <div>
                            <p className="font-semibold">{sa.name} <span className="text-sm text-muted-foreground">({sa.BoQ})</span></p>
                            <p className="text-xs text-muted-foreground">{sa.activityName}</p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Work Done vs Remaining</Label>
                            <DoneWorkChart data={sa} />
                        </div>
                         <div className="space-y-2">
                             <Label className="text-xs text-muted-foreground">Work Grades & Status</Label>
                             <GradeChart data={sa} />
                        </div>
                    </div>
                ))}
            </div>
        </CardContent>
      </Card>

    </div>
  );
}
