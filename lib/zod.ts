import { z } from "zod"

import { ACCEPTED_IMAGE_TYPES, ACCEPTED_PDF_TYPES, MAX_FILE_SIZE, MAX_IMAGE_SIZE } from "@/lib/constants"

export const UploadSchema = z.object({
  pdfFile: z
    .custom<File>((file) => file instanceof File, "Please choose a PDF file.")
    .refine((file) => ACCEPTED_PDF_TYPES.includes(file.type), "Please upload a PDF file.")
    .refine((file) => file.size <= MAX_FILE_SIZE, "PDF must be 50MB or smaller."),
  coverImage: z
    .custom<File | undefined>((file) => file === undefined || file instanceof File)
    .refine((file) => !file || ACCEPTED_IMAGE_TYPES.includes(file.type), "Please upload a JPG, PNG, or WebP image.")
    .refine((file) => !file || file.size <= MAX_IMAGE_SIZE, "Cover image must be 10MB or smaller.")
    .optional(),
  title: z.string().trim().min(1, "Please enter a title."),
  author: z.string().trim().min(1, "Please enter the author name."),
  persona: z.string().min(1, "Please choose an assistant voice."),
})
