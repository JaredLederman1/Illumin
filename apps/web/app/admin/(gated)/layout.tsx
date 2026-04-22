import { cookies as getCookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { isAdminEmail } from '@/lib/adminAllowlist'

export default async function AdminGatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await getCookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdminEmail(user.email)) {
    redirect('/admin/login')
  }

  return <>{children}</>
}
