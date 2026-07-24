'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { updatePassword } from '@/app/auth/actions'
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
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/validations/auth'

export function ResetPasswordForm() {
  const [isPending, setIsPending] = useState(false)
  const { dict } = useLocale()

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  async function onSubmit(values: ResetPasswordInput) {
    setIsPending(true)
    try {
      const result = await updatePassword(values)
      if (result && 'error' in result) {
        toast.error(result.error)
      }
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.auth.newPassword}</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" dir="ltr" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.auth.confirmPassword}</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" dir="ltr" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? dict.auth.updatingPassword : dict.auth.updatePassword}
        </Button>
      </form>
    </Form>
  )
}
