import { createClient } from '@/lib/supabase/server'

export async function checkAdminAccess() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { isAdmin: false, user: null }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  return { isAdmin, user, profile }
}