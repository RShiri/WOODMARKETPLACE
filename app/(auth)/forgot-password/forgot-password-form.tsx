'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { requestPasswordReset } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useLocale } from '@/lib/i18n/locale-context'
import { requestResetSchema, type RequestResetInput } from '@/lib/validations/auth'

export function ForgotPasswordForm() {
  const [isPending, setIsPending] = useState(false)
  const [sentMessage, setSentMessage] = useState<string | null>(null)
  const { dict } = useLocale()

  const form = useForm<RequestResetInput>({
    resolver: zodResolver(requestResetSchema),
    defaultValues: { email: '' },
  })

  async function onSubmit(values: RequestResetInput) {
    setIsPending(true)
    try {
      const result = await requestPasswordReset(values)
      if (result && 'error' in result) {
        toast.error(result.error)
        return
      }
      if (result && 'message' in result) {
        setSentMessage(result.message)
      }
    } finally {
      setIsPending(false)
    }
  }

  if (sentMessage) {
    return <p className="text-sm text-muted-foreground">{sentMessage}</p>
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.auth.email}</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" dir="ltr" placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? dict.auth.sendingResetLink : dict.auth.sendResetLink}
        </Button>
      </form>
    </Form>
  )
}
