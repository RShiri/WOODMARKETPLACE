import type { Metadata } from 'next'
import Link from 'next/link'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getServerDictionary } from '@/lib/i18n/server'

import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Log In',
}

export default function LoginPage() {
  const dict = getServerDictionary()

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">{dict.auth.loginTitle}</CardTitle>
          <CardDescription>{dict.auth.loginSubtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <LoginForm />
          <p className="text-center text-sm text-muted-foreground">
            {dict.auth.noAccount}{' '}
            <Link href="/register" className="font-medium text-foreground underline underline-offset-4">
              {dict.auth.signUp}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
