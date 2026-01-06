import { AppSidebar } from '@/components/app-sidebar';
import { Header } from '@/components/header';
import { SidebarInset } from '@/components/ui/sidebar';
import { FirebaseClientProvider } from '@/firebase';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <AppSidebar />
      <div className="flex min-h-screen w-full flex-col">
        <Header />
        <SidebarInset>
          <main className="p-4 sm:p-6 lg:p-8">{children}</main>
        </SidebarInset>
      </div>
    </FirebaseClientProvider>
  );
}
