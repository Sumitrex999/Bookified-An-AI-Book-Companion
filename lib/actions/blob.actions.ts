'use server';

import { auth } from '@clerk/nextjs/server';
import { del } from '@vercel/blob';

export const deleteUploadedBlobs = async (pathnames: string[]) => {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Unauthorized');
  }

  const userPathPrefix = `books/${userId}/`;

  if (!pathnames.every((pathname) => pathname.startsWith(userPathPrefix))) {
    throw new Error('Invalid blob pathname');
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    throw new Error('Blob storage is not configured');
  }

  await del(pathnames, { token });
};
