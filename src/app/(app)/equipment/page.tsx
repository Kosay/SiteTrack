'use client';

import { useState } from 'react';
import { LoaderCircle, HardHat, PlusCircle, CalendarDays, User, Tag } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Equipment } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

export default function EquipmentPage() {
  const firestore = useFirestore();

  const equipmentCollectionRef = useMemoFirebase(() => {
    return collection(firestore, 'equipment');
  }, [firestore]);

  const { data: equipment, isLoading } =
    useCollection<Equipment>(equipmentCollectionRef);

  const getStatusVariant = (status: Equipment['status']) => {
    switch (status) {
      case 'Working':
        return 'default';
      case 'Broken':
        return 'destructive';
      case 'In Garage':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipment</h1>
          <p className="text-muted-foreground">
            Manage all company and rented equipment.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button disabled>
            <PlusCircle className="mr-2" />
            New Equipment
          </Button>
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <LoaderCircle className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Equipment Inventory</CardTitle>
            <CardDescription>
              {equipment?.length || 0} pieces of equipment are being tracked.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {equipment && equipment.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {equipment.map((item) => (
                  <Card key={item.id} className="flex flex-col">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="line-clamp-1">{item.plateNumber}</CardTitle>
                         <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                      </div>
                      <CardDescription>Type ID: {item.typeId}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm mt-auto pt-4 border-t">
                      {item.assignedTo && (
                        <div className="flex items-center gap-3">
                            <User className="text-muted-foreground" />
                            <span className="text-muted-foreground">Assigned: {item.assignedTo}</span>
                        </div>
                      )}
                       {item.projectId && (
                        <div className="flex items-center gap-3">
                            <Tag className="text-muted-foreground" />
                            <span className="text-muted-foreground">Project: {item.projectId}</span>
                        </div>
                      )}
                      {item.ownershipCertificateDate && (
                         <div className="flex items-center gap-3">
                            <CalendarDays className="text-muted-foreground" />
                            <span className="text-muted-foreground">Ownership Cert: {new Date(item.ownershipCertificateDate).toLocaleDateString()}</span>
                        </div>
                      )}
                       {item.thirdPartyCertificateDate && (
                         <div className="flex items-center gap-3">
                            <CalendarDays className="text-muted-foreground" />
                            <span className="text-muted-foreground">3rd Party Cert: {new Date(item.thirdPartyCertificateDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
                <HardHat className="w-12 h-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">
                  No Equipment Found
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Get started by adding a new piece of equipment.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
