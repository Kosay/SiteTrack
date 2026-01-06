'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { HardHat } from 'lucide-react';

export function Header() {
  return (
    <header className="flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6">
      <SidebarTrigger className="md:hidden" />
      <div className="flex items-center gap-2 md:hidden">
        <HardHat className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold">Site Tracker</span>
      </div>
      <div className="w-full flex-1">
        {/* Future elements like search or user menu can go here */}
      </div>
    </header>
  );
}
