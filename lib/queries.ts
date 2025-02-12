// queries.ts

import { PrismaClient } from '@prisma/client';
import { toTitleCase } from './utils';

const prisma = new PrismaClient();

//
// 1. getFoldersWithThreadCount
//
export async function getFoldersWithThreadCount(): Promise<{
  specialFolders: { name: string; thread_count: number }[];
  otherFolders: { name: string; thread_count: number }[];
}> {
  // Get folders along with the count of associated threadFolders.
  const foldersWithCount = await prisma.folder.findMany({
    select: {
      name: true,
      _count: {
        select: { threadFolders: true },
      },
    },
  });

  const folderList = foldersWithCount.map((folder) => ({
    name: folder.name,
    thread_count: folder._count.threadFolders,
  }));

  const specialFoldersOrder = ['Inbox', 'Flagged', 'Sent'];
  const specialFolders = specialFoldersOrder
    .map((name) => folderList.find((folder) => folder.name === name))
    .filter((folder): folder is { name: string; thread_count: number } => Boolean(folder));
  const otherFolders = folderList.filter((folder) => !specialFoldersOrder.includes(folder.name));

  return { specialFolders, otherFolders };
}

//
// 2. getThreadsForFolder
//
export async function getThreadsForFolder(folderName: string) {
  const originalFolderName = toTitleCase(decodeURIComponent(folderName));

  // Find threads that belong to the given folder.
  const threadsWithEmails = await prisma.thread.findMany({
    where: {
      threadFolders: {
        some: {
          folder: {
            name: originalFolderName,
          },
        },
      },
    },
    include: {
      emails: {
        orderBy: { sentDate: 'desc' },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: { lastActivityDate: 'desc' },
  });

  return threadsWithEmails;
}

//
// 3. searchThreads
//
export async function searchThreads(search: string | undefined) {
  if (!search) return [];

  // Search threads whose subject or any of their emails (or associated sender data) match the search term.
  const threads = await prisma.thread.findMany({
    where: {
      OR: [
        { subject: { contains: search, mode: 'insensitive' } },
        {
          emails: {
            some: {
              OR: [
                { body: { contains: search, mode: 'insensitive' } },
                { sender: { firstName: { contains: search, mode: 'insensitive' } } },
                { sender: { lastName: { contains: search, mode: 'insensitive' } } },
                { sender: { email: { contains: search, mode: 'insensitive' } } },
              ],
            },
          },
        },
      ],
    },
    include: {
      // Fetch only the most recent email for display purposes.
      emails: {
        take: 1,
        orderBy: { sentDate: 'desc' },
        include: {
          sender: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
      // Optionally include folder info through the threadFolders relation.
      threadFolders: {
        include: { folder: true },
      },
    },
    orderBy: { lastActivityDate: 'desc' },
  });

  // Map the results to a structure similar to the Drizzle implementation.
  const results = threads.map((thread) => {
    const folderName = thread.threadFolders[0]?.folder.name || null;
    const latestEmail = thread.emails[0]
      ? {
          id: thread.emails[0].id,
          subject: thread.emails[0].subject,
          body: thread.emails[0].body,
          sentDate: thread.emails[0].sentDate,
          sender: thread.emails[0].sender,
        }
      : null;
    return {
      id: thread.id,
      subject: thread.subject,
      lastActivityDate: thread.lastActivityDate,
      folderName,
      latestEmail,
    };
  });

  return results;
}

//
// 4. getThreadInFolder
//
export async function getThreadInFolder(folderName: string, threadId: string) {
  const originalFolderName = toTitleCase(decodeURIComponent(folderName));
  // Retrieve a thread that belongs to a folder with the given name.
  const thread = await prisma.thread.findFirst({
    where: {
      id: threadId,
      threadFolders: {
        some: { folder: { name: originalFolderName } },
      },
    },
    include: {
      // We include one email (ordered by sentDate desc) to retrieve sender info.
      emails: {
        orderBy: { sentDate: 'desc' },
        include: {
          sender: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
        take: 1,
      },
    },
  });

  if (!thread) return null;

  // Flatten the result into the expected structure.
  return {
    id: thread.id,
    subject: thread.subject,
    lastActivityDate: thread.lastActivityDate,
    senderFirstName: thread.emails[0]?.sender.firstName,
    senderLastName: thread.emails[0]?.sender.lastName,
    senderEmail: thread.emails[0]?.sender.email,
  };
}

//
// 5. getEmailsForThread
//
export async function getEmailsForThread(threadId: string) {
  // Retrieve the thread and its emails sorted by sentDate.
  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    include: {
      emails: {
        orderBy: { sentDate: 'asc' },
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });

  if (!thread) return null;

  return {
    id: thread.id,
    subject: thread.subject,
    emails: thread.emails.map((email) => ({
      id: email.id,
      body: email.body,
      sentDate: email.sentDate,
      sender: email.sender,
      recipientId: email.recipientId,
    })),
  };
}

//
// 6. getAllEmailAddresses
//
export async function getAllEmailAddresses() {
  // Return all users with only their basic email info.
  return prisma.user.findMany({
    select: {
      firstName: true,
      lastName: true,
      email: true,
    },
  });
}

//
// 7. getUserProfile
//
export async function getUserProfile(userId: string) {
  // Get the user's profile details.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      jobTitle: true,
      company: true,
      location: true,
      avatarUrl: true,
      linkedin: true,
      twitter: true,
      github: true,
    },
  });

  if (!user) return null;

  // Retrieve the latest 3 threads where the user was the sender.
  const latestThreads = await prisma.thread.findMany({
    where: {
      emails: {
        some: { senderId: userId },
      },
    },
    orderBy: { lastActivityDate: 'desc' },
    take: 3,
    select: { subject: true },
  });

  return { ...user, latestThreads };
}
