'use client'

import { useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { ImageIcon, LoaderCircle, Trash2, Upload } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { DEFAULT_VOICE, voiceCategories, voiceOptions } from '@/lib/constants'
import { UploadSchema } from '@/lib/zod'
import { cn } from '@/lib/utils'

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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const form = useForm<UploadValues>({
    resolver: zodResolver(UploadSchema),
    defaultValues: { title: '', author: '', voice: DEFAULT_VOICE, cover: undefined },
  })

  const onSubmit = async () => {
    setIsSubmitting(true)
    // Keep the overlay visible while the future upload/synthesis request is in progress.
    await new Promise((resolve) => window.setTimeout(resolve, 900))
    setIsSubmitting(false)
  }

  return (
    <>
      {isSubmitting && <LoadingOverlay />}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="new-book-wrapper space-y-8" noValidate>
          <FormField control={form.control} name="pdf" render={({ field }) => (
            <FormItem>
              <FormLabel className="form-label">Book PDF File</FormLabel>
              <FormControl><FileDropzone file={field.value} onChange={field.onChange} onRemove={() => field.onChange(undefined)} accept="application/pdf" icon={Upload} text="Click to upload PDF" hint="PDF file (max 50MB)" disabled={isSubmitting} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="cover" render={({ field }) => (
            <FormItem>
              <FormLabel className="form-label">Cover Image <span className="font-normal">(Optional)</span></FormLabel>
              <FormControl><FileDropzone file={field.value} onChange={field.onChange} onRemove={() => field.onChange(undefined)} accept="image/jpeg,image/png,image/webp" icon={ImageIcon} text="Click to upload cover image" hint="Leave empty to auto-generate from PDF" disabled={isSubmitting} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="title" render={({ field }) => (
            <FormItem><FormLabel className="form-label">Title</FormLabel><FormControl><Input className="form-input h-auto border-0 shadow-[var(--shadow-soft-sm)]" placeholder="ex: Rich Dad Poor Dad" disabled={isSubmitting} {...field} /></FormControl><FormMessage /></FormItem>
          )} />

          <FormField control={form.control} name="author" render={({ field }) => (
            <FormItem><FormLabel className="form-label">Author Name</FormLabel><FormControl><Input className="form-input h-auto border-0 shadow-[var(--shadow-soft-sm)]" placeholder="ex: Robert Kiyosaki" disabled={isSubmitting} {...field} /></FormControl><FormMessage /></FormItem>
          )} />

          <FormField control={form.control} name="voice" render={({ field }) => (
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
                          <input type="radio" className="size-4 accent-[#663820]" value={voiceKey} checked={selected} onChange={() => field.onChange(voiceKey)} disabled={isSubmitting} />
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

          <button type="submit" className="form-btn" disabled={isSubmitting}>Begin Synthesis</button>
        </form>
      </Form>
    </>
  )
}

export default UploadForm
