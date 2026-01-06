'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HardHat,
  LayoutGrid,
  ClipboardPlus,
  FileText,
  Building2,
  Users,
  Truck,
  Briefcase
} from 'lucide-react';

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { UserButton } from './user-button';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
  { label: 'Progress Log', href: '/progress', icon: ClipboardPlus },
  { label: 'Reports', href: '/reports', icon: FileText },
  { label: 'Companies', href: '/companies', icon: Building2 },
  { label: 'Users', href: '/users', icon: Users },
  { label: 'Projects', href: '/projects', icon: Briefcase },
  { label: 'Equipment', href: '/equipment', icon: HardHat },
  { label: 'Equipment Types', href: '/equipment-types', icon: Truck },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-3">
          <HardHat className="size-8 text-primary" />
          <h2 className="text-xl font-semibold text-sidebar-foreground">
            Site Tracker
          </h2>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(item.href)}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <UserButton />
      </SidebarFooter>
    </Sidebar>
  );
}

    