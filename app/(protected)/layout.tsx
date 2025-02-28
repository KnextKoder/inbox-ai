import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../globals.css';
import RightSidebar  from './components/right-sidebar';
import { WelcomeToast } from './components/welcome-toast';
import { Toaster } from 'sonner';
import { Suspense } from 'react';
import { currentUser } from '@clerk/nextjs/server';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Inbox AI',
  description: 'An email client template using the Next.js App Router.',
};


export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const user = await currentUser()
      if (!user) {
          return null
      }
  return (
    <div lang="en" className={`bg-white text-gray-800 ${inter.className}`}>
      <div className="flex h-screen">
        <main className="flex-grow overflow-hidden">{children}</main>
        <Suspense fallback={<RightSidebarSkeleton />}>
          <RightSidebar userId={user.id} />
        </Suspense>
        <Toaster closeButton />
        <WelcomeToast />
      </div>
    </div>
  );
}

function RightSidebarSkeleton() {
  return (
    <div className="hidden sm:flex flex-shrink-0 w-[350px] p-6 overflow-auto bg-neutral-50" />
  );
}
