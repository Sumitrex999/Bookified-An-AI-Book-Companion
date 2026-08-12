"use client"

import * as React from "react"
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form"

import { cn } from "@/lib/utils"

const Form = FormProvider

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = { name: TName }

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue)

function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ ...props }: ControllerProps<TFieldValues, TName>) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

function useFormField() {
  const { name } = React.useContext(FormFieldContext)
  const { getFieldState, formState } = useFormContext()
  const fieldState = getFieldState(name, formState)

  return { name, ...fieldState }
}

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="form-item" className={cn("space-y-2", className)} {...props} />
}

function FormLabel({ className, ...props }: React.ComponentProps<"label">) {
  const { error } = useFormField()
  return <label data-slot="form-label" className={cn(error && "text-red-600", className)} {...props} />
}

function FormControl({ children }: { children: React.ReactElement<React.HTMLAttributes<HTMLElement>> }) {
  const { error } = useFormField()
  return React.cloneElement(children, {
    "aria-invalid": Boolean(error),
    "aria-describedby": error ? "form-error" : undefined,
  })
}

function FormMessage({ className, ...props }: React.ComponentProps<"p">) {
  const { error } = useFormField()
  if (!error?.message) return null

  return <p id="form-error" className={cn("text-sm font-medium text-red-600", className)} {...props}>{String(error.message)}</p>
}

export { Form, FormControl, FormField, FormItem, FormLabel, FormMessage }
