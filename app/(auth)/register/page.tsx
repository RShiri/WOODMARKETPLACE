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

import { RegisterForm } from './register-form'

export const metadata: Metadata = {
  title: 'Create an Account',
}

export default function RegisterPage() {
  const dict = getServerDictionary()

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">{dict.auth.registerTitle}</CardTitle>
          <CardDescription>{dict.auth.registerSubtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RegisterForm />
          <p className="text-center text-sm text-muted-foreground">
            {dict.auth.haveAccount}{' '}
            <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
              {dict.auth.logIn}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
