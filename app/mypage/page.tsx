'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { supabase } from '@/lib/supabase/client'
import Header from '@/components/Header'

interface Post {
  id: number
  title: string
  details: string
  post_date: string
  pay: number | null
  location: string | null
  external_link: string | null
  created_at: string
}

export default function MyPage() {
  const { user, loading } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [postsLoading, setPostsLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchUserPosts()
    }
  }, [user])

  const fetchUserPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching posts:', error)
      } else {
        setPosts(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setPostsLoading(false)
    }
  }

  const deletePost = async (postId: number) => {
    if (!confirm('정말로 이 공고를 삭제하시겠습니까?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user?.id)

      if (error) {
        console.error('Error deleting post:', error)
        alert('삭제 중 오류가 발생했습니다.')
      } else {
        // Remove from local state
        setPosts(posts.filter(post => post.id !== postId))
        alert('공고가 삭제되었습니다.')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  if (loading) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">로딩 중...</div>
        </div>
      </>
    )
  }

  if (!user) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p>로그인이 필요합니다.</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">마이페이지</h1>

          <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">내 정보</h2>
            <div className="text-gray-600">
              <p>이메일: {user.email}</p>
              <p>가입일: {new Date(user.created_at || '').toLocaleDateString('ko-KR')}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-6">내가 작성한 공고</h2>

            {postsLoading ? (
              <div className="text-center py-8">로딩 중...</div>
            ) : posts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                작성한 공고가 없습니다.
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          {post.title}
                        </h3>
                        <div className="text-sm text-gray-600 mb-2">
                          <span className="mr-4">📅 {post.post_date}</span>
                          {post.pay && <span className="mr-4">💰 {post.pay.toLocaleString()}원</span>}
                          {post.location && <span>📍 {post.location}</span>}
                        </div>
                        <p className="text-gray-700 mb-3">{post.details}</p>
                        {post.external_link && (
                          <a
                            href={post.external_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            🔗 외부 링크
                          </a>
                        )}
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => deletePost(post.id)}
                          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
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
    </>
  )
}