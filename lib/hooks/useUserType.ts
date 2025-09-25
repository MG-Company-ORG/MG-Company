'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { UserType } from '@/lib/types/database'

export function useUserType() {
  const { user } = useAuth()
  const [userType, setUserType] = useState<UserType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setUserType(null)
      setLoading(false)
      return
    }

    fetchUserType()
  }, [user])

  const fetchUserType = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user?.id)
        .single()

      setUserType(profile?.user_type || 'jobseeker')
    } catch (error) {
      console.error('Error fetching user type:', error)
      setUserType('jobseeker') // Default fallback
    } finally {
      setLoading(false)
    }
  }

  return { userType, loading, isEmployer: userType === 'employer', isJobseeker: userType === 'jobseeker' }
}