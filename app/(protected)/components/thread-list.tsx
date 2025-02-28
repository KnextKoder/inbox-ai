'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PenSquare, Search, PlusCircle, Inbox } from 'lucide-react';
import { NavMenu } from './menu';
import { formatEmailString } from '@/lib/utils';
import { ThreadActions } from '@/app/(protected)/components/thread-actions';
import { Button } from '@/components/ui/button';

type Agent = {
  id: string;
  name: string;
  email: string;
};

type Email = {
  id: string;
  subject: string | null;
  threadId: string | null;
  senderId: string | null;
  recipientId: string | null;
  body: string | null;
  sentDate: Date | null;
} & {
  sender: Pick<Agent, 'id' | 'name' | 'email'>;
};

type ThreadWithEmails = {
  id: string;
  subject: string | null;
  lastActivityDate: Date | null;
  emails: Email[];
};

interface ThreadListProps {
  folderName: string;
  threads: ThreadWithEmails[];
  searchQuery?: string;
}

export function ThreadHeader({
  folderName,
  count,
}: {
  folderName: string;
  count?: number | undefined;
}) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200 h-[70px]">
      <div className="flex items-center">
        <NavMenu />
        <h1 className="text-xl font-semibold flex items-center capitalize">
          {folderName}
          <span className="ml-2 text-sm text-gray-400">{count}</span>
        </h1>
      </div>
      <div className="flex items-center space-x-2">
        <Link
          href={`/f/${folderName}/new`}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
        >
          <PenSquare size={18} />
        </Link>
        <Link
          href="/search"
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
        >
          <Search size={18} />
        </Link>
      </div>
    </div>
  );
}

export function ThreadList({ folderName, threads }: ThreadListProps) {
  const [hoveredThread, setHoveredThread] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.matchMedia('(hover: none)').matches);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  const handleMouseEnter = (threadId: string) => {
    if (!isMobile) {
      setHoveredThread(threadId);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      setHoveredThread(null);
    }
  };

  if (threads.length === 0) {
    return <NoThreads folderName={folderName} />;
  }

  return (
    <div className="flex-grow border-r border-gray-200 overflow-hidden">
      <ThreadHeader folderName={folderName} count={threads.length} />
      <div className="overflow-auto h-[calc(100vh-64px)]">
        {threads.map((thread) => {
          const latestEmail = thread.emails[0];

          return (
            <Link
              key={thread.id}
              href={`/f/${folderName.toLowerCase()}/${thread.id}`}
              className="block hover:bg-gray-50 cursor-pointer border-b border-gray-100"
            >
              <div
                className="flex items-center"
                onMouseEnter={() => handleMouseEnter(thread.id)}
                onMouseLeave={handleMouseLeave}
              >
                <div className="flex-grow flex items-center overflow-hidden p-4">
                  <div className="w-[200px] flex-shrink-0 mr-4">
                    <span className="font-medium truncate">
                      {formatEmailString(latestEmail.sender)}
                    </span>
                  </div>
                  <div className="flex-grow flex items-center overflow-hidden">
                    <span className="font-medium truncate min-w-[175px] max-w-[400px] mr-2">
                      {thread.subject}
                    </span>
                    <span className="text-gray-600 truncate">
                      {latestEmail.body}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-end flex-shrink-0 w-40 p-4">
                  {!isMobile && hoveredThread === thread.id ? (
                    <ThreadActions threadId={thread.id} />
                  ) : (
                    <span className="text-sm text-gray-500">
                      {new Date(thread.lastActivityDate!).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

interface NoThreadsProps {
  folderName: string;
}

export function NoThreads({ folderName }: NoThreadsProps) {
  return (
    <div className="flex-grow border-r border-gray-200 overflow-hidden">
      <ThreadHeader folderName={folderName} count={0} />
      <div className="flex flex-col items-center justify-center w-full h-full p-8 text-center">
        <div className="bg-gray-100 rounded-full p-6 mb-6">
          <Inbox className="w-12 h-12 text-gray-400" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">
          No threads in {folderName}
        </h2>
        <p className="text-gray-500 mb-6 max-w-md">
          Looks like this folder is empty. Start a new thread or move existing
          ones here.
        </p>
        <Link href={`/f/${folderName}/new`} passHref>
          <Button className="flex items-center">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Thread
          </Button>
        </Link>
      </div>
    </div>
  );
}