'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Application, ApplicationWithPost, ApplicationStatus } from '@/lib/types/database'

export function useApplications(postId?: number) {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchApplications = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('applications')
        .select(`
          *,
          post:posts(*),
          applicant:profiles(id, email, user_type)
        `)
        .order('applied_at', { ascending: false })

      if (postId) {
        query = query.eq('post_id', postId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        setError('지원 내역을 불러오는 중 오류가 발생했습니다.')
        console.error('Error fetching applications:', fetchError)
      } else {
        setApplications(data || [])
      }
    } catch (err) {
      setError('지원 내역을 불러오는 중 오류가 발생했습니다.')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }, [postId])

  const createApplication = useCallback(async (
    postId: number,
    message: string,
    contactInfo: { phone?: string; email?: string; preferredContact?: 'phone' | 'email' }
  ) => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .insert([{
          post_id: postId,
          message,
          contact_info: contactInfo
        }])
        .select()
        .single()

      if (error) {
        console.error('Error creating application:', error)
        return { success: false, error: '지원 중 오류가 발생했습니다.' }
      }

      setApplications(prev => [data, ...prev])
      return { success: true, data }
    } catch (err) {
      console.error('Error:', err)
      return { success: false, error: '지원 중 오류가 발생했습니다.' }
    }
  }, [])

  const updateApplicationStatus = useCallback(async (
    applicationId: number,
    status: ApplicationStatus
  ) => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .update({ status })
        .eq('id', applicationId)
        .select()
        .single()

      if (error) {
        console.error('Error updating application status:', error)
        return { success: false, error: '상태 변경 중 오류가 발생했습니다.' }
      }

      setApplications(prev =>
        prev.map(app => app.id === applicationId ? data : app)
      )
      return { success: true, data }
    } catch (err) {
      console.error('Error:', err)
      return { success: false, error: '상태 변경 중 오류가 발생했습니다.' }
    }
  }, [])

  const withdrawApplication = useCallback(async (applicationId: number) => {
    return updateApplicationStatus(applicationId, 'withdrawn')
  }, [updateApplicationStatus])

  const checkApplicationExists = useCallback(async (postId: number) => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('id')
        .eq('post_id', postId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error checking application:', error)
        return false
      }

      return !!data
    } catch (err) {
      console.error('Error:', err)
      return false
    }
  }, [])

  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  return {
    applications,
    loading,
    error,
    fetchApplications,
    createApplication,
    updateApplicationStatus,
    withdrawApplication,
    checkApplicationExists
  }
}