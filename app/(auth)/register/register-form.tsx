'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { signup } from '@/app/auth/actions'
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
import { registerSchema, type RegisterInput } from '@/lib/validations/auth'

export function RegisterForm() {
  const [isPending, setIsPending] = useState(false)
  const { dict } = useLocale()

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', fullName: '' },
  })

  async function onSubmit(values: RegisterInput) {
    setIsPending(true)
    try {
      const result = await signup(values)
      if (result && 'error' in result) {
        toast.error(result.error)
      } else if (result && 'message' in result) {
        toast.success(result.message)
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
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.auth.fullName}</FormLabel>
              <FormControl>
                <Input autoComplete="name" placeholder="Jane Bricks" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.auth.password}</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  dir="ltr"
                  placeholder="••••••••"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? dict.auth.creatingAccount : dict.auth.createAccount}
        </Button>
      </form>
    </Form>
  )
}
