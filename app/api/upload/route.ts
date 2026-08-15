import { auth } from '@clerk/nextjs/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_PDF_TYPES,
  MAX_FILE_SIZE,
  MAX_IMAGE_SIZE,
} from '@/lib/constants';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;

    if (!token) {
      console.error('BLOB_READ_WRITE_TOKEN is not configured');
      return Response.json({ error: 'Blob storage is not configured' }, { status: 500 });
    }

    const body = (await request.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      token,
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith(`books/${userId}/`)) {
          throw new Error('Invalid upload pathname');
        }

        const isCover = pathname.endsWith('_cover.png');

        return {
          allowedContentTypes: isCover ? ACCEPTED_IMAGE_TYPES : ACCEPTED_PDF_TYPES,
          maximumSizeInBytes: isCover ? MAX_IMAGE_SIZE : MAX_FILE_SIZE,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const payload = tokenPayload ? JSON.parse(tokenPayload) : null;
        console.info('Blob upload completed', {
          pathname: blob.pathname,
          userId: payload?.userId,
        });
      },
    });

    return Response.json(jsonResponse);
  } catch (error) {
    console.error('Blob upload token generation failed:', error);
    return Response.json({ error: 'Unable to authorize upload' }, { status: 500 });
  }
}
