'use client'
// 1:59:00 -- book uploaded successfully

import { useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { ImageIcon, LoaderCircle, Trash2, Upload } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { voiceCategories, voiceOptions } from '@/lib/constants'
import { UploadSchema } from '@/lib/zod'
import { cn, generateSlug, parsePDFFile } from '@/lib/utils'
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { checkBookExists, createBook, saveBookSegments } from '@/lib/actions/book.actions';
import { deleteUploadedBlobs } from '@/lib/actions/blob.actions';
import { upload } from '@vercel/blob/client';



type UploadValues = z.infer<typeof UploadSchema>

function LoadingOverlay() {
  return (
    <div className="loading-wrapper" role="status" aria-live="polite" aria-label="Creating your book">
      <div className="loading-shadow-wrapper bg-white">
        <div className="loading-shadow">
          <LoaderCircle className="loading-animation size-10 text-[#663820]" />
          <p className="loading-title">Beginning synthesis…</p>
        </div>
      </div>
    </div>
  )
}

function FileDropzone({
  file,
  onChange,
  onRemove,
  accept,
  icon: Icon,
  text,
  hint,
  disabled,
}: {
  file?: File
  onChange: (file?: File) => void
  onRemove: () => void
  accept: string
  icon: typeof Upload
  text: string
  hint: string
  disabled: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div>
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(event) => onChange(event.target.files?.[0])}
      />
      <button
        type="button"
        className={cn('upload-dropzone w-full border-2 border-dashed border-[#d4c4a8]', file && 'upload-dropzone-uploaded')}
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
      >
        {file ? (
          <span className="flex items-center gap-3 px-6 text-[#663820]">
            <span className="max-w-96 truncate font-medium">{file.name}</span>
            <span
              role="button"
              tabIndex={0}
              className="upload-dropzone-remove"
              aria-label={`Remove ${file.name}`}
              onClick={(event) => {
                event.stopPropagation()
                onRemove()
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  event.stopPropagation()
                  onRemove()
                }
              }}
            >
              <Trash2 className="size-5" />
            </span>
          </span>
        ) : (
          <>
            <Icon className="upload-dropzone-icon" strokeWidth={1.8} />
            <span className="upload-dropzone-text">{text}</span>
            <span className="upload-dropzone-hint">{hint}</span>
          </>
        )}
      </button>
    </div>
  )
}

const UploadForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isLoaded, userId } = useAuth();
  const router = useRouter();

  const form = useForm<UploadValues>({
    resolver: zodResolver(UploadSchema),
    defaultValues: {
      title: '',
      author: '',
      persona: '',
      pdfFile: undefined,
      coverImage: undefined,
    },
  })

  const onSubmit = async (data: UploadValues) => {
    if (!isLoaded) {
      return;
    }

    if(!userId) {

      return toast.error('You must be logged in to upload a book.');
    }
    setIsSubmitting(true);
    let uploadedPdfPathname: string | undefined;
    let uploadedCoverPathname: string | undefined;
    let cleanupAttempted = false;

    const cleanupUploadedBlobs = async () => {
      if (cleanupAttempted) {
        return;
      }

      cleanupAttempted = true;
      const pathnames = [uploadedPdfPathname, uploadedCoverPathname].filter(
        (pathname): pathname is string => Boolean(pathname),
      );

      if (pathnames.length === 0) {
        return;
      }

      try {
        await deleteUploadedBlobs(pathnames);
      } catch (cleanupError) {
        console.error('Failed to clean up uploaded blobs:', cleanupError);
      }
    };

    // PostHog -> Track Book Uploads ...
    try {
      const existsCheck = await checkBookExists(data.title);
      if (existsCheck.exists && existsCheck.book) {
        toast.info('A book with this title already exists.');
        form.reset();
        router.push(`/books/${existsCheck.book.slug}`);
        return;
      }

      const fileTitle = generateSlug(data.title);
      const uploadPath = `books/${userId}/${fileTitle}`;
      const pdfFile = data.pdfFile;

      const parsedPDF = await parsePDFFile(pdfFile);

      if (parsedPDF.content.length === 0) {
        toast.error('This PDF does not contain readable text. Please choose another file.');
        return;
      }

      const uploadedPdfBlob = await upload(`${uploadPath}.pdf`, pdfFile, {
        access: 'public',
        handleUploadUrl: '/api/upload',
        contentType: 'application/pdf',
      });
      uploadedPdfPathname = uploadedPdfBlob.pathname;

      let coverUrl: string;

      if (data.coverImage) {
        const coverFile = data.coverImage;
        const uploadedCoverBlob = await upload(`${uploadPath}_cover.png`, coverFile, {
          access: 'public',
          handleUploadUrl: '/api/upload',
          contentType: coverFile.type,
        });
        uploadedCoverPathname = uploadedCoverBlob.pathname;
        coverUrl = uploadedCoverBlob.url;
      } else {
        const response = await fetch(parsedPDF.cover);
        const blob = await response.blob();

        const uploadedCoverBlob = await upload(`${uploadPath}_cover.png`, blob, {
          access: 'public',
          handleUploadUrl: '/api/upload',
          contentType: 'image/png',
        });
        uploadedCoverPathname = uploadedCoverBlob.pathname;
        coverUrl = uploadedCoverBlob.url;
      }

      const book = await createBook({
        title: data.title,
        author: data.author,
        persona: data.persona,
        fileURL: uploadedPdfBlob.url,
        fileBlobKey: uploadedPdfBlob.pathname,
        coverURL: coverUrl,
        fileSize: pdfFile.size,
      });

      if (!book.success) {
        await cleanupUploadedBlobs();
        toast.error('Failed to create the book. Please try again.');
        return;
      }

      if (book.alreadyExists) {
        await cleanupUploadedBlobs();
        toast.info('A book with this title already exists.');
        form.reset();
        router.push(`/books/${book.data.slug}`);
        return;
      }

      const segments = await saveBookSegments(book.data._id, parsedPDF.content);

      if (!segments?.success) {
        await cleanupUploadedBlobs();
        throw new Error('Failed to save book segments');
      }

      form.reset();
      router.push(`/books/${book.data.slug}`);
    } catch (error) {

      await cleanupUploadedBlobs();

      console.error(error);
      toast.error('Failed to upload book. Please try again later.');

    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {isSubmitting && <LoadingOverlay />}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="new-book-wrapper space-y-8" noValidate>
          <FormField control={form.control} name="pdfFile" render={({ field }) => (
            <FormItem>
              <FormLabel className="form-label">Book PDF File</FormLabel>
              <FormControl><FileDropzone file={field.value} onChange={field.onChange} onRemove={() => field.onChange(undefined)} accept="application/pdf" icon={Upload} text="Click to upload PDF" hint="PDF file (max 50MB)" disabled={isSubmitting || !isLoaded} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="coverImage" render={({ field }) => (
            <FormItem>
              <FormLabel className="form-label">Cover Image <span className="font-normal">(Optional)</span></FormLabel>
              <FormControl><FileDropzone file={field.value} onChange={field.onChange} onRemove={() => field.onChange(undefined)} accept="image/jpeg,image/png,image/webp" icon={ImageIcon} text="Click to upload cover image" hint="Leave empty to auto-generate from PDF" disabled={isSubmitting || !isLoaded} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="title" render={({ field }) => (
            <FormItem><FormLabel className="form-label">Title</FormLabel><FormControl><Input className="form-input h-auto border-0 shadow-[var(--shadow-soft-sm)]" placeholder="ex: Rich Dad Poor Dad" disabled={isSubmitting || !isLoaded} {...field} /></FormControl><FormMessage /></FormItem>
          )} />

          <FormField control={form.control} name="author" render={({ field }) => (
            <FormItem><FormLabel className="form-label">Author Name</FormLabel><FormControl><Input className="form-input h-auto border-0 shadow-[var(--shadow-soft-sm)]" placeholder="ex: Robert Kiyosaki" disabled={isSubmitting || !isLoaded} {...field} /></FormControl><FormMessage /></FormItem>
          )} />

          <FormField control={form.control} name="persona" render={({ field }) => (
            <FormItem>
              <FormLabel className="form-label">Choose Assistant Voice</FormLabel>
              {(['male', 'female'] as const).map((group) => (
                <div key={group} className="space-y-3">
                  <p className="text-sm font-medium text-[#555]">{group === 'male' ? 'Male Voices' : 'Female Voices'}</p>
                  <div className={cn('voice-selector-options', group === 'male' ? 'max-md:flex-col' : 'max-sm:flex-col')}>
                    {voiceCategories[group].map((voiceKey) => {
                      const voice = voiceOptions[voiceKey as keyof typeof voiceOptions]
                      const selected = field.value === voiceKey
                      return (
                        <label key={voiceKey} className={cn('voice-selector-option justify-start', selected ? 'voice-selector-option-selected' : 'voice-selector-option-default')}>
                          <input type="radio" className="size-4 accent-[#663820]" value={voiceKey} checked={selected} onChange={() => field.onChange(voiceKey)} disabled={isSubmitting || !isLoaded} />
                          <span><span className="block font-semibold text-[#333]">{voice.name}</span><span className="mt-1 block text-xs leading-4 text-[#666]">{voice.description}</span></span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
              <FormMessage />
            </FormItem>
          )} />

          <button type="submit" className="form-btn" disabled={isSubmitting || !isLoaded}>Begin Synthesis</button>
        </form>
      </Form>
    </>
  )
}

export default UploadForm
