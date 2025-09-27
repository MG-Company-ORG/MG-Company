'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Post } from '@/lib/types/database'


export function usePosts(dateRange?: { start: Date; end: Date }) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })

      if (dateRange) {
        const startDate = dateRange.start.toISOString().split('T')[0]
        const endDate = dateRange.end.toISOString().split('T')[0]
        query = query.gte('post_date', startDate).lte('post_date', endDate)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        setError('게시글을 불러오는 중 오류가 발생했습니다.')
        console.error('Error fetching posts:', fetchError)
      } else {
        setPosts(data || [])
      }
    } catch (err) {
      setError('게시글을 불러오는 중 오류가 발생했습니다.')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  const createPost = useCallback(async (postData: Omit<Post, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert([postData])
        .select()
        .single()

      if (error) {
        console.error('Error creating post:', error)
        return { success: false, error: '게시글 작성 중 오류가 발생했습니다.' }
      }

      setPosts(prev => [data, ...prev])
      return { success: true, data }
    } catch (err) {
      console.error('Error:', err)
      return { success: false, error: '게시글 작성 중 오류가 발생했습니다.' }
    }
  }, [])

  const updatePost = useCallback(async (postId: number, updates: Partial<Omit<Post, 'id' | 'user_id' | 'created_at'>>) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .update(updates)
        .eq('id', postId)
        .select()
        .single()

      if (error) {
        console.error('Error updating post:', error)
        return { success: false, error: '게시글 수정 중 오류가 발생했습니다.' }
      }

      setPosts(prev => prev.map(post => post.id === postId ? data : post))
      return { success: true, data }
    } catch (err) {
      console.error('Error:', err)
      return { success: false, error: '게시글 수정 중 오류가 발생했습니다.' }
    }
  }, [])

  const deletePost = useCallback(async (postId: number) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)

      if (error) {
        console.error('Error deleting post:', error)
        return { success: false, error: '게시글 삭제 중 오류가 발생했습니다.' }
      }

      setPosts(prev => prev.filter(post => post.id !== postId))
      return { success: true }
    } catch (err) {
      console.error('Error:', err)
      return { success: false, error: '게시글 삭제 중 오류가 발생했습니다.' }
    }
  }, [])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  return {
    posts,
    loading,
    error,
    fetchPosts,
    createPost,
    updatePost,
    deletePost
  }
}