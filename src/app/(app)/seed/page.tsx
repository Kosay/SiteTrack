
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { LoaderCircle, Database } from 'lucide-react';
import type { User } from '@/lib/types';

const companyId = 'Zhc43Afe8Q2Kyq6gIGvy';

const usersToSeed: Omit<User, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // PMs
  { name: 'Khalid Al-Farsi', email: 'khalid.pm@nbhh.com', position: 'PM', companyId },
  { name: 'Fatima Al-Marzouqi', email: 'fatima.pm@nbhh.com', position: 'PM', companyId },
  // CMs
  { name: 'Ahmed Al-Mansoori', email: 'ahmed.cm@nbhh.com', position: 'CM', companyId },
  { name: 'Noura Al-Shehhi', email: 'noura.cm@nbhh.com', position: 'CM', companyId },
  { name: 'Sultan Al-Kaabi', email: 'sultan.cm@nbhh.com', position: 'CM', companyId },
  // Engineers
  { name: 'Yusuf Al-Hashemi', email: 'yusuf.eng@nbhh.com', position: 'Engineer', companyId },
  { name: 'Mariam Al-Amiri', email: 'mariam.eng@nbhh.com', position: 'Engineer', companyId },
  { name: 'Abdullah Al-Jaber', email: 'abdullah.eng@nbhh.com', position: 'Engineer', companyId },
  { name: 'Aisha Al-Nuaimi', email: 'aisha.eng@nbhh.com', position: 'Engineer', companyId },
  { name: 'Hassan Al-Mazrouei', email: 'hassan.eng@nbhh.com', position: 'Engineer', companyId },
  { name: 'Zainab Al-Ketbi', email: 'zainab.eng@nbhh.com', position: 'Engineer', companyId },
  { name: 'Omar Al-Muhairi', email: 'omar.eng@nbhh.com', position: 'Engineer', companyId },
  { name: 'Layla Al-Remeithi', email: 'layla.eng@nbhh.com', position: 'Engineer', companyId },
  { name: 'Mohammed Al-Qubaisi', email: 'mohammed.eng@nbhh.com', position: 'Engineer', companyId },
  { name: 'Hessa Al-Falasi', email: 'hessa.eng@nbhh.com', position: 'Engineer', companyId },
  { name: 'Ali Al-Shamsi', email: 'ali.eng@nbhh.com', position: 'Engineer', companyId },
  { name: 'Sara Al-Zaabi', email: 'sara.eng@nbhh.com', position: 'Engineer', companyId },
];


export default function SeedPage() {
  const [isSeeding, setIsSeeding] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
        const usersCollectionRef = collection(firestore, 'users');
        const batch = writeBatch(firestore);

        usersToSeed.forEach(user => {
            const newDocRef = doc(usersCollectionRef); // Create a new doc with a random ID
            batch.set(newDocRef, {
                ...user,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        });

        await batch.commit();

      toast({
        title: 'Database Seeded Successfully!',
        description: `${usersToSeed.length} users have been added to the NBHH company.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Seeding Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Seed Database</h1>
        <p className="text-muted-foreground">
          Use this page to populate your Firestore database with initial data for development.
        </p>
      </header>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Seed Company Users</CardTitle>
          <CardDescription>
            Click the button below to add 17 sample users (PMs, CMs, and Engineers) to the "NBHH" company (ID: {companyId}). This action is irreversible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSeed} disabled={isSeeding}>
            {isSeeding ? (
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Database className="mr-2 h-4 w-4" />
            )}
            {isSeeding ? 'Seeding...' : `Seed ${usersToSeed.length} Users`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
