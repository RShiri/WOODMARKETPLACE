import { requireCustomerProfile } from '@/lib/auth/session'

/**
 * Layout for all /customer/* dashboard routes.
 *
 * The root `middleware.ts` only checks that a request is authenticated; it
 * has no knowledge of the caller's role. This layout is what actually
 * enforces "is a customer" — `requireCustomerProfile()` redirects
 * unauthenticated users to /login and non-customers to /artist/products.
 *
 * Customers currently only have a single dashboard page ("My Inquiries"),
 * so unlike the artist dashboard this doesn't need a sidebar nav — just a
 * consistent page wrapper.
 */
export default async function CustomerDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireCustomerProfile()

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <p className="mb-6 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        My Account
      </p>
      {children}
    </div>
  )
}
