'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/lib/hooks/useProfile'
import { supabase } from '@/lib/supabase/client'
import Header from '@/components/Header'
import { UserIcon, EnvelopeIcon, CalendarIcon, MapPinIcon, BriefcaseIcon } from '@heroicons/react/24/outline'

export default function MyPage() {
  const { profile, loading: profileLoading, userType, isEmployer, isJobseeker, isAdmin } = useProfile()
  const [userStats, setUserStats] = useState({
    totalApplications: 0,
    pendingApplications: 0,
    acceptedApplications: 0,
    rejectedApplications: 0
  })
  const [statsLoading, setStatsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (profileLoading) return

    if (!profile?.id) {
      router.push('/login')
      return
    }

    fetchUserStats()
  }, [profile?.id, profileLoading, router])

  const fetchUserStats = async () => {
    if (!profile?.id) return

    try {
      setStatsLoading(true)

      // For jobseekers, fetch application stats
      if (isJobseeker) {
        const { data: applications, error } = await supabase
          .from('applications')
          .select('status')
          .eq('applicant_id', profile.id)

        if (error) {
          console.error('Error fetching application stats:', error)
        } else {
          const stats = {
            totalApplications: applications?.length || 0,
            pendingApplications: applications?.filter(app => app.status === 'pending').length || 0,
            acceptedApplications: applications?.filter(app => app.status === 'accepted').length || 0,
            rejectedApplications: applications?.filter(app => app.status === 'rejected').length || 0
          }
          setUserStats(stats)
        }
      }
      // For employers, stats are shown in employer dashboard, not here
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  if (profileLoading) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">로딩 중...</div>
        </div>
      </>
    )
  }

  if (!profile) {
    return null
  }

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">마이페이지</h1>

          {/* User Profile Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <UserIcon className="h-5 w-5 mr-2" />
              내 정보
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center">
                  <EnvelopeIcon className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">이메일:</span>
                  <span className="ml-2 text-sm font-medium">{profile.email}</span>
                </div>
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">가입일:</span>
                  <span className="ml-2 text-sm font-medium">
                    {new Date(profile.created_at || '').toLocaleDateString('ko-KR')}
                  </span>
                </div>
                <div className="flex items-center">
                  <BriefcaseIcon className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">사용자 유형:</span>
                  <span className="ml-2 text-sm font-medium">
                    {isAdmin ? '관리자' : userType === 'employer' ? '구인자' : '구직자'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Jobseeker Stats */}
          {isJobseeker && (
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">지원 현황</h2>
              {statsLoading ? (
                <div className="text-center py-4">로딩 중...</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{userStats.totalApplications}</div>
                    <div className="text-sm text-gray-600">총 지원</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{userStats.pendingApplications}</div>
                    <div className="text-sm text-gray-600">검토 중</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{userStats.acceptedApplications}</div>
                    <div className="text-sm text-gray-600">승인됨</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{userStats.rejectedApplications}</div>
                    <div className="text-sm text-gray-600">거절됨</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Profile Settings */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-4">설정</h2>
            <div className="text-gray-500">
              <p className="mb-4">프로필 설정 기능은 추후 업데이트 예정입니다.</p>
              <div className="text-sm">
                <p>• 프로필 이미지 업로드</p>
                <p>• 연락처 정보 수정</p>
                <p>• 알림 설정</p>
                <p>• 계정 보안 설정</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}