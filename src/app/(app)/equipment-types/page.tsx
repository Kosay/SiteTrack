'use client';

import { useState } from 'react';
import { LoaderCircle, PlusCircle, Wrench, Trash2, Database } from 'lucide-react';
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
import type { EquipmentType } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { addEquipmentType, deleteEquipmentType } from '@/lib/firebase-actions';
import { Label } from '@/components/ui/label';

const SEED_DATA: Omit<EquipmentType, 'id'>[] = [
    { name: 'JCB' },
    { name: 'Bobcat' },
    { name: 'Excavator' },
    { name: 'Crane' },
    { name: 'Bulldozer' },
    { name: 'Grader' },
    { name: 'Tipper Truck' },
    { name: 'Concrete Mixer' },
    { name: 'Tower Crane' },
    { name: 'Paver' },
]

function EquipmentTypeForm({ onSuccess }: { onSuccess: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const name = formData.get('name') as string;

    if (!name) {
      toast({
        variant: 'destructive',
        title: 'Equipment Type name is required.',
      });
      setIsSubmitting(false);
      return;
    }

    try {
      await addEquipmentType({ name });
      toast({
        title: 'Equipment Type Created',
        description: `${name} has been added.`,
      });
      onSuccess();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to create equipment type',
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Equipment Type Name</Label>
        <Input
          id="name"
          name="name"
          placeholder="e.g., 'JCB', 'Bobcat'"
          required
        />
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && (
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
          )}
          Create Type
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function EquipmentTypesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const equipmentTypesCollectionRef = useMemoFirebase(() => {
    return collection(firestore, 'equipment_names');
  }, [firestore]);

  const { data: equipmentTypes, isLoading } =
    useCollection<EquipmentType>(equipmentTypesCollectionRef);

  const handleDelete = async (type: EquipmentType) => {
    try {
      await deleteEquipmentType(type.id);
      toast({
        title: `Equipment Type Deleted`,
        description: `${type.name} has been removed.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: error.message,
      });
    }
  };

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      const promises = SEED_DATA.map(equipment => addEquipmentType(equipment));
      await Promise.all(promises);
      toast({
        title: "Database Seeded",
        description: `${SEED_DATA.length} equipment types have been added.`,
      });
    } catch (error: any) {
       toast({
        variant: 'destructive',
        title: 'Seeding Failed',
        description: error.message,
      });
    } finally {
      setIsSeeding(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipment Types</h1>
          <p className="text-muted-foreground">
            Manage the categories for your equipment.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={handleSeedData}
            disabled={isSeeding || (equipmentTypes && equipmentTypes.length > 0)}
          >
            {isSeeding ? <LoaderCircle className="mr-2 animate-spin" /> : <Database className="mr-2" />}
            Seed Equipment
          </Button>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <Button onClick={() => setIsFormOpen(true)}>
              <PlusCircle className="mr-2" />
              New Type
            </Button>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create a New Equipment Type</DialogTitle>
                <DialogDescription>
                  Add a new category for your equipment inventory.
                </DialogDescription>
              </DialogHeader>
              <EquipmentTypeForm onSuccess={() => setIsFormOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <LoaderCircle className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Registered Equipment Types</CardTitle>
            <CardDescription>
              You have {equipmentTypes?.length || 0} equipment types defined.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {equipmentTypes && equipmentTypes.length > 0 ? (
              <ul className="space-y-3">
                {equipmentTypes.map((type) => (
                  <li
                    key={type.id}
                    className="flex items-center justify-between p-3 rounded-md border bg-card hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Wrench className="text-muted-foreground" />
                      <span className="font-medium">{type.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(type)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg">
                <Wrench className="w-12 h-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">
                  No Equipment Types
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Get started by seeding or creating a new equipment type.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
