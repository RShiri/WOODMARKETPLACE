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
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { registerSchema, type RegisterInput } from '@/lib/validations/auth'

export function RegisterForm() {
  const [isPending, setIsPending] = useState(false)

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'customer',
      email: '',
      password: '',
      fullName: '',
      shopName: '',
    },
  })

  const role = form.watch('role')

  async function onSubmit(values: RegisterInput) {
    setIsPending(true)
    try {
      const result = await signup(values)
      if (result && 'error' in result) {
        toast.error(result.error)
        return
      }
      if (result && 'message' in result) {
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
          name="role"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>I am a...</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="grid grid-cols-2 gap-3"
                >
                  <Label
                    htmlFor="role-customer"
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-input p-3 text-sm font-normal has-[:checked]:border-primary has-[:checked]:bg-accent"
                  >
                    <RadioGroupItem value="customer" id="role-customer" />
                    Customer
                  </Label>
                  <Label
                    htmlFor="role-artist"
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-input p-3 text-sm font-normal has-[:checked]:border-primary has-[:checked]:bg-accent"
                  >
                    <RadioGroupItem value="artist" id="role-artist" />
                    Artist
                  </Label>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input autoComplete="name" placeholder="Jane Carpenter" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {role === 'artist' && (
          <FormField
            control={form.control}
            name="shopName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Shop Name</FormLabel>
                <FormControl>
                  <Input placeholder="Maple & Grain Woodshop" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" placeholder="you@example.com" {...field} />
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
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Creating account…' : 'Create Account'}
        </Button>
      </form>
    </Form>
  )
}
