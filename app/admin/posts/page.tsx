'use client';

import { useState, useEffect, useCallback } from 'react';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { useAdmin } from '@/lib/hooks/useAdmin';
import Header from '@/components/Header';
import { Post, Profile, PostWithApplications } from '@/lib/types/database';
import { TrashIcon, EyeIcon } from '@heroicons/react/24/outline';

export default function AdminPostsPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [posts, setPosts] = useState<(PostWithApplications & { profile?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'closed' | 'draft'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !adminLoading && !isAdmin) {
      redirect('/');
    }
  }, [authLoading, adminLoading, isAdmin]);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      let query = supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (id, email, role, user_type),
          applications(count)
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const postsWithCounts =
        data?.map(post => ({
          ...post,
          profile: post.profiles,
          application_count: Array.isArray(post.applications)
            ? post.applications[0]?.count || 0
            : 0
        })) || [];

      setPosts(postsWithCounts);
      setErrorMessage(null);
    } catch (error) {
      console.error('Error fetching posts:', error);
      const message =
        error instanceof Error
          ? error.message
          : '알 수 없는 오류가 발생했습니다.';
      setErrorMessage(
        '공고 정보를 불러오지 못했습니다. 데이터베이스 정책 또는 관계 설정을 확인해주세요.\n' +
          message
      );
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (isAdmin) {
      fetchPosts();
    }
  }, [isAdmin, fetchPosts]);

  const handleDeletePost = async (postId: number, postTitle: string) => {
    if (!confirm(`정말로 "${postTitle}" 공고를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 관련된 모든 지원서도 함께 삭제됩니다.`)) {
      return;
    }

    try {
      setDeleting(postId);
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      setPosts(posts.filter(post => post.id !== postId));
      alert('공고가 성공적으로 삭제되었습니다.');
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('공고 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleting(null);
    }
  };

  const handleStatusChange = async (postId: number, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({ status: newStatus })
        .eq('id', postId);

      if (error) throw error;

      await fetchPosts();
      alert('공고 상태가 변경되었습니다.');
    } catch (error) {
      console.error('Error updating post status:', error);
      alert('공고 상태 변경 중 오류가 발생했습니다.');
    }
  };

  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      closed: 'bg-red-100 text-red-800',
      draft: 'bg-yellow-100 text-yellow-800'
    };
    const labels = {
      active: '활성',
      closed: '마감',
      draft: '초안'
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status as keyof typeof colors]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  if (authLoading || adminLoading) {
    return <div className="min-h-screen flex items-center justify-center">로딩 중...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">공고 관리</h1>

          {/* 필터 및 검색 */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* 상태 필터 */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  상태 필터
                </label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">전체</option>
                  <option value="active">활성</option>
                  <option value="closed">마감</option>
                  <option value="draft">초안</option>
                </select>
              </div>

              {/* 검색 */}
              <div className="flex-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  검색
                </label>
                <input
                  type="text"
                  placeholder="제목, 내용, 이메일로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6 whitespace-pre-line">
              {errorMessage}
            </div>
          )}

          {/* 통계 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm font-medium text-gray-500">전체 공고</div>
              <div className="text-2xl font-bold text-gray-900">{posts.length}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm font-medium text-gray-500">활성 공고</div>
              <div className="text-2xl font-bold text-green-600">
                {posts.filter(p => p.status === 'active').length}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm font-medium text-gray-500">마감 공고</div>
              <div className="text-2xl font-bold text-red-600">
                {posts.filter(p => p.status === 'closed').length}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm font-medium text-gray-500">총 지원자</div>
              <div className="text-2xl font-bold text-blue-600">
                {posts.reduce((sum, p) => sum + (p.application_count || 0), 0)}
              </div>
            </div>
          </div>

          {/* 공고 목록 */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="text-gray-500">로딩 중...</div>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-gray-500">공고가 없습니다.</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        공고 정보
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        게시자
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        상태
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        지원자 수
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        게시일
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        관리
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPosts.map((post) => (
                      <tr key={post.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="max-w-xs">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {post.title}
                            </div>
                            <div className="text-sm text-gray-500 truncate">
                              {post.details}
                            </div>
                            {post.pay && (
                              <div className="text-sm text-green-600 font-medium">
                                {post.pay.toLocaleString()}원
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {post.profile?.email}
                          </div>
                          <div className="text-sm text-gray-500">
                            {post.profile?.role === 'admin'
                              ? '관리자'
                              : post.profile?.user_type === 'employer'
                              ? '공급자'
                              : '구직자'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={post.status}
                            onChange={(e) => handleStatusChange(post.id, e.target.value)}
                            className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="active">활성</option>
                            <option value="closed">마감</option>
                            <option value="draft">초안</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {post.application_count || 0}명
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(post.post_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleDeletePost(post.id, post.title)}
                            disabled={deleting === post.id}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="공고 삭제"
                          >
                            {deleting === post.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                            ) : (
                              <TrashIcon className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
