import type { Metadata } from 'next'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { requireProfile } from '@/lib/auth/session'
import { getServerDictionary } from '@/lib/i18n/server'

import { ResetPasswordForm } from './reset-password-form'

export const metadata: Metadata = {
  title: 'Choose a New Password',
}

export default async function ResetPasswordPage() {
  // Only reachable with a valid session — normally a recovery session
  // created by exchanging the emailed reset link's code (see
  // app/auth/callback/route.ts). No session -> bounced to /login.
  await requireProfile()
  const dict = getServerDictionary()

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">{dict.auth.resetPasswordTitle}</CardTitle>
          <CardDescription>{dict.auth.resetPasswordSubtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ResetPasswordForm />
        </CardContent>
      </Card>
    </div>
  )
}
