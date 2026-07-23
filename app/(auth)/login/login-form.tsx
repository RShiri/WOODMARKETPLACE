'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { login } from '@/app/auth/actions'
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
import { loginSchema, type LoginInput } from '@/lib/validations/auth'

export function LoginForm() {
  const [isPending, setIsPending] = useState(false)
  const { dict } = useLocale()

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  async function onSubmit(values: LoginInput) {
    setIsPending(true)
    try {
      const result = await login(values)
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
                  autoComplete="current-password"
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
          {isPending ? dict.auth.loggingIn : dict.auth.logIn}
        </Button>
      </form>
    </Form>
  )
}
