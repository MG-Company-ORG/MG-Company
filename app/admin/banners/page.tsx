'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'

interface Banner {
  id: number
  image_url: string
  link_url: string
  created_at: string
}

export default function AdminBannersPage() {
  const { user, loading: authLoading } = useAuth()
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [formData, setFormData] = useState({
    image_url: '',
    link_url: ''
  })
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
      await fetchBanners()
    } catch (error) {
      console.error('Error checking admin status:', error)
      router.push('/')
    }
  }

  const fetchBanners = async () => {
    try {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching banners:', error)
      } else {
        setBanners(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const addBanner = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const { error } = await supabase
        .from('banners')
        .insert({
          image_url: formData.image_url,
          link_url: formData.link_url
        })

      if (error) {
        console.error('Error adding banner:', error)
        alert('배너 추가 중 오류가 발생했습니다.')
      } else {
        alert('배너가 추가되었습니다.')
        setFormData({ image_url: '', link_url: '' })
        setShowAddModal(false)
        await fetchBanners()
      }
    } catch (error) {
      console.error('Error:', error)
      alert('배너 추가 중 오류가 발생했습니다.')
    }
  }

  const deleteBanner = async (bannerId: number) => {
    if (!confirm('정말로 이 배너를 삭제하시겠습니까?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('banners')
        .delete()
        .eq('id', bannerId)

      if (error) {
        console.error('Error deleting banner:', error)
        alert('배너 삭제 중 오류가 발생했습니다.')
      } else {
        alert('배너가 삭제되었습니다.')
        await fetchBanners()
      }
    } catch (error) {
      console.error('Error:', error)
      alert('배너 삭제 중 오류가 발생했습니다.')
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
            <h1 className="text-3xl font-bold text-gray-900">배너 관리</h1>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                배너 추가
              </button>
              <button
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-800"
              >
                ← 돌아가기
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border">
            {banners.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                등록된 배너가 없습니다.
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {banners.map((banner) => (
                  <div key={banner.id} className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {banner.image_url ? (
                          <img
                            src={banner.image_url}
                            alt="배너"
                            className="w-20 h-20 object-cover rounded-lg border"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yNCAzNkgzNlYyNEgyNFYzNlpNNDQgMjRWMzZINTZWMjRINDRaTTI0IDU2SDM2VjQ0SDI0VjU2Wk00NCA0NFY1Nkg1NlY0NEg0NFoiIGZpbGw9IiM5Q0E0QUYiLz4KPC9zdmc+Cg=='
                            }}
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gray-200 rounded-lg border flex items-center justify-center">
                            <span className="text-gray-400 text-xs">이미지 없음</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-gray-600 mb-1">
                          <strong>이미지 URL:</strong>
                        </div>
                        <div className="text-sm text-gray-900 mb-2 break-all">
                          {banner.image_url || '없음'}
                        </div>
                        <div className="text-sm text-gray-600 mb-1">
                          <strong>링크 URL:</strong>
                        </div>
                        <div className="text-sm text-gray-900 mb-2 break-all">
                          {banner.link_url || '없음'}
                        </div>
                        <div className="text-xs text-gray-500">
                          등록일: {new Date(banner.created_at).toLocaleString('ko-KR')}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <button
                          onClick={() => deleteBanner(banner.id)}
                          className="text-red-600 hover:text-red-900 text-sm"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 배너 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold">배너 추가</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={addBanner} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이미지 URL *
                </label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  링크 URL
                </label>
                <input
                  type="url"
                  value={formData.link_url}
                  onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  추가
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}