'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { Application, ApplicationStatus } from '@/lib/types/database'

interface ApplicationWithDetails extends Application {
  post: {
    id: number
    title: string
    post_date: string
    pay: number | null
    location: string | null
  }
  applicant: {
    id: string
    email: string
  }
}

export default function EmployerApplicationsPage() {
  const { user, loading: authLoading } = useAuth()
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [userType, setUserType] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const router = useRouter()

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push('/login')
      return
    }

    checkUserTypeAndFetch()
  }, [user, authLoading, router])

  const checkUserTypeAndFetch = async () => {
    try {
      // Check user type
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user?.id)
        .single()

      if (profile?.user_type !== 'employer') {
        router.push('/')
        return
      }

      setUserType(profile.user_type)
      await fetchApplications()
    } catch (error) {
      console.error('Error checking user type:', error)
      router.push('/')
    }
  }

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          post:posts!inner(id, title, post_date, pay, location),
          applicant:profiles!applications_applicant_id_fkey(id, email)
        `)
        .eq('post.user_id', user?.id)
        .order('applied_at', { ascending: false })

      if (error) {
        console.error('Error fetching applications:', error)
      } else {
        setApplications(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateApplicationStatus = async (
    applicationId: number,
    newStatus: ApplicationStatus
  ) => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: newStatus })
        .eq('id', applicationId)

      if (error) {
        console.error('Error updating application status:', error)
        alert('상태 변경 중 오류가 발생했습니다.')
        return
      }

      // Update local state
      setApplications(prev =>
        prev.map(app =>
          app.id === applicationId ? { ...app, status: newStatus } : app
        )
      )

      const statusText = {
        pending: '검토 중',
        accepted: '승인',
        rejected: '거절',
        withdrawn: '철회'
      }
      alert(`지원 상태가 "${statusText[newStatus]}"로 변경되었습니다.`)
    } catch (error) {
      console.error('Error:', error)
      alert('상태 변경 중 오류가 발생했습니다.')
    }
  }

  const getStatusBadgeClass = (status: ApplicationStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'accepted':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'withdrawn':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: ApplicationStatus) => {
    switch (status) {
      case 'pending':
        return '검토 중'
      case 'accepted':
        return '승인됨'
      case 'rejected':
        return '거절됨'
      case 'withdrawn':
        return '철회됨'
      default:
        return status
    }
  }

  const filteredApplications = applications.filter(app => {
    if (selectedStatus === 'all') return true
    return app.status === selectedStatus
  })

  if (authLoading || loading) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">로딩 중...</div>
        </div>
      </>
    )
  }

  if (userType !== 'employer') {
    return null
  }

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">지원자 관리</h1>
            <button
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-800"
            >
              ← 돌아가기
            </button>
          </div>

          {/* Status Filter */}
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedStatus('all')}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedStatus === 'all'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                전체 ({applications.length})
              </button>
              {['pending', 'accepted', 'rejected', 'withdrawn'].map(status => {
                const count = applications.filter(app => app.status === status).length
                return (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedStatus === status
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {getStatusText(status as ApplicationStatus)} ({count})
                  </button>
                )
              })}
            </div>
          </div>

          {/* Applications List */}
          <div className="bg-white rounded-lg shadow-sm border">
            {filteredApplications.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {selectedStatus === 'all'
                  ? '아직 지원자가 없습니다.'
                  : `${getStatusText(selectedStatus as ApplicationStatus)} 상태의 지원이 없습니다.`
                }
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredApplications.map((application) => (
                  <div key={application.id} className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-4 lg:space-y-0">
                      {/* Application Info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">
                              {application.post.title}
                            </h3>
                            <div className="text-sm text-gray-600 mt-1">
                              지원자: {application.applicant.email}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(
                              application.status
                            )}`}
                          >
                            {getStatusText(application.status)}
                          </span>
                        </div>

                        <div className="text-sm text-gray-600 mb-3">
                          <span className="mr-4">📅 {application.post.post_date}</span>
                          {application.post.pay && (
                            <span className="mr-4">💰 {application.post.pay.toLocaleString()}원</span>
                          )}
                          {application.post.location && (
                            <span>📍 {application.post.location}</span>
                          )}
                        </div>

                        {/* Application Message */}
                        {application.message && (
                          <div className="bg-gray-50 rounded-lg p-3 mb-3">
                            <div className="text-sm font-medium text-gray-700 mb-1">
                              지원 메시지:
                            </div>
                            <div className="text-sm text-gray-600">
                              {application.message}
                            </div>
                          </div>
                        )}

                        {/* Contact Info */}
                        {application.contact_info && Object.keys(application.contact_info).length > 0 && (
                          <div className="text-xs text-gray-500">
                            연락처: {(application.contact_info as any).email && `📧 ${(application.contact_info as any).email}`}
                            {(application.contact_info as any).phone && ` 📞 ${(application.contact_info as any).phone}`}
                            {(application.contact_info as any).preferredContact &&
                              ` (선호: ${(application.contact_info as any).preferredContact === 'email' ? '이메일' : '전화'})`
                            }
                          </div>
                        )}

                        <div className="text-xs text-gray-500 mt-2">
                          지원일: {new Date(application.applied_at).toLocaleString('ko-KR')}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      {application.status === 'pending' && (
                        <div className="flex space-x-2 lg:ml-4">
                          <button
                            onClick={() => updateApplicationStatus(application.id, 'accepted')}
                            className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded hover:bg-green-200 transition-colors"
                          >
                            승인
                          </button>
                          <button
                            onClick={() => updateApplicationStatus(application.id, 'rejected')}
                            className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200 transition-colors"
                          >
                            거절
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}