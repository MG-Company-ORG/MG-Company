'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'

interface Profile {
  id: string
  email: string
  role: string
  created_at: string
}

export default function AdminUsersPage() {
  const { user, loading: authLoading } = useAuth()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push('/login')
      return
    }

    checkAdminAndFetchData()
  }, [user, authLoading])

  const checkAdminAndFetchData = async () => {
    try {
      // Check if current user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single()

      if (profile?.role !== 'admin') {
        router.push('/')
        return
      }

      setIsAdmin(true)
      await fetchUsers()
    } catch (error) {
      console.error('Error checking admin status:', error)
      router.push('/')
    }
  }

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching users:', error)
      } else {
        setProfiles(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`정말로 사용자 ${userEmail}를 삭제하시겠습니까?`)) {
      return
    }

    try {
      // Delete user from auth.users (this will cascade to profiles)
      const { error } = await supabase.auth.admin.deleteUser(userId)

      if (error) {
        console.error('Error deleting user:', error)
        alert('사용자 삭제 중 오류가 발생했습니다.')
      } else {
        alert('사용자가 삭제되었습니다.')
        await fetchUsers()
      }
    } catch (error) {
      console.error('Error:', error)
      alert('사용자 삭제 중 오류가 발생했습니다.')
    }
  }

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) {
        console.error('Error updating user role:', error)
        alert('권한 변경 중 오류가 발생했습니다.')
      } else {
        alert('권한이 변경되었습니다.')
        await fetchUsers()
      }
    } catch (error) {
      console.error('Error:', error)
      alert('권한 변경 중 오류가 발생했습니다.')
    }
  }

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

  if (!isAdmin) {
    return null
  }

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">회원 관리</h1>
            <button
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-800"
            >
              ← 돌아가기
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      이메일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      권한
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      가입일
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {profiles.map((profile) => (
                    <tr key={profile.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {profile.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={profile.role}
                          onChange={(e) => updateUserRole(profile.id, e.target.value)}
                          className="text-sm border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="user">사용자</option>
                          <option value="admin">관리자</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(profile.created_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {profile.id !== user?.id && (
                          <button
                            onClick={() => deleteUser(profile.id, profile.email)}
                            className="text-red-600 hover:text-red-900"
                          >
                            삭제
                          </button>
                        )}
                        {profile.id === user?.id && (
                          <span className="text-gray-400">현재 사용자</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {profiles.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                등록된 사용자가 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}