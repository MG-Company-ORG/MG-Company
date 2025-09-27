'use client';

import { useState, useEffect } from 'react';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { useAdmin } from '@/lib/hooks/useAdmin';
import Header from '@/components/Header';
import { Banner } from '@/lib/types/database';
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export default function AdminBannersPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    image_url: '',
    link_url: '',
    is_active: true,
    display_order: 1
  });

  useEffect(() => {
    if (!authLoading && !adminLoading && !isAdmin) {
      redirect('/');
    }
  }, [authLoading, adminLoading, isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchBanners();
    }
  }, [isAdmin]);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setBanners(data || []);
    } catch (error) {
      console.error('Error fetching banners:', error);
      alert('배너 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `banners/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('public')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('이미지 업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.image_url.trim()) {
      alert('제목과 이미지는 필수 항목입니다.');
      return;
    }

    try {
      const bannerData = {
        title: formData.title.trim(),
        image_url: formData.image_url,
        link_url: formData.link_url.trim() || null,
        is_active: formData.is_active,
        display_order: formData.display_order,
        created_by: user?.id
      };

      if (editingBanner) {
        const { error } = await supabase
          .from('banners')
          .update(bannerData)
          .eq('id', editingBanner.id);

        if (error) throw error;
        alert('배너가 성공적으로 수정되었습니다.');
      } else {
        const { error } = await supabase
          .from('banners')
          .insert([bannerData]);

        if (error) throw error;
        alert('배너가 성공적으로 등록되었습니다.');
      }

      setShowModal(false);
      setEditingBanner(null);
      setFormData({
        title: '',
        image_url: '',
        link_url: '',
        is_active: true,
        display_order: 1
      });
      await fetchBanners();
    } catch (error) {
      console.error('Error saving banner:', error);
      alert('배너 저장 중 오류가 발생했습니다.');
    }
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      image_url: banner.image_url,
      link_url: banner.link_url || '',
      is_active: banner.is_active,
      display_order: banner.display_order
    });
    setShowModal(true);
  };

  const handleDelete = async (banner: Banner) => {
    if (!confirm(`정말로 "${banner.title}" 배너를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('banners')
        .delete()
        .eq('id', banner.id);

      if (error) throw error;

      // 이미지 파일도 삭제
      if (banner.image_url.includes('supabase')) {
        const filePath = banner.image_url.split('/').pop();
        if (filePath) {
          await supabase.storage
            .from('public')
            .remove([`banners/${filePath}`]);
        }
      }

      alert('배너가 성공적으로 삭제되었습니다.');
      await fetchBanners();
    } catch (error) {
      console.error('Error deleting banner:', error);
      alert('배너 삭제 중 오류가 발생했습니다.');
    }
  };

  const toggleActive = async (banner: Banner) => {
    try {
      const { error } = await supabase
        .from('banners')
        .update({ is_active: !banner.is_active })
        .eq('id', banner.id);

      if (error) throw error;
      await fetchBanners();
    } catch (error) {
      console.error('Error toggling banner status:', error);
      alert('배너 상태 변경 중 오류가 발생했습니다.');
    }
  };

  const openModal = () => {
    setEditingBanner(null);
    setFormData({
      title: '',
      image_url: '',
      link_url: '',
      is_active: true,
      display_order: Math.max(...banners.map(b => b.display_order), 0) + 1
    });
    setShowModal(true);
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
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">배너 관리</h1>
            <button
              onClick={openModal}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              새 배너 등록
            </button>
          </div>

          {/* 통계 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm font-medium text-gray-500">전체 배너</div>
              <div className="text-2xl font-bold text-gray-900">{banners.length}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm font-medium text-gray-500">활성 배너</div>
              <div className="text-2xl font-bold text-green-600">
                {banners.filter(b => b.is_active).length}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm font-medium text-gray-500">비활성 배너</div>
              <div className="text-2xl font-bold text-red-600">
                {banners.filter(b => !b.is_active).length}
              </div>
            </div>
          </div>

          {/* 배너 목록 */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="text-gray-500">로딩 중...</div>
              </div>
            ) : banners.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-gray-500">등록된 배너가 없습니다.</div>
                <button
                  onClick={openModal}
                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  첫 번째 배너 등록하기
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        배너 정보
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        상태
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        순서
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        등록일
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        관리
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {banners.map((banner) => (
                      <tr key={banner.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-16 w-24">
                              <img
                                className="h-16 w-24 object-cover rounded"
                                src={banner.image_url}
                                alt={banner.title}
                              />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {banner.title}
                              </div>
                              {banner.link_url && (
                                <div className="text-sm text-gray-500">
                                  <a
                                    href={banner.link_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-blue-600"
                                  >
                                    {banner.link_url}
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleActive(banner)}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              banner.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {banner.is_active ? (
                              <>
                                <EyeIcon className="h-3 w-3 mr-1" />
                                활성
                              </>
                            ) : (
                              <>
                                <EyeSlashIcon className="h-3 w-3 mr-1" />
                                비활성
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {banner.display_order}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(banner.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEdit(banner)}
                              className="text-blue-600 hover:text-blue-900"
                              title="수정"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(banner)}
                              className="text-red-600 hover:text-red-900"
                              title="삭제"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
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

      {/* 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingBanner ? '배너 수정' : '새 배너 등록'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  제목 *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="배너 제목을 입력하세요"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이미지 *
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                  disabled={uploading}
                />
                {uploading && (
                  <div className="text-sm text-blue-600">이미지 업로드 중...</div>
                )}
                {formData.image_url && (
                  <div className="mt-2">
                    <img
                      src={formData.image_url}
                      alt="미리보기"
                      className="h-20 w-32 object-cover rounded border"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  링크 URL
                </label>
                <input
                  type="url"
                  value={formData.link_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, link_url: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="클릭시 이동할 URL (선택사항)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  표시 순서
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.display_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                  즉시 활성화
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={uploading || !formData.title.trim() || !formData.image_url}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {editingBanner ? '수정' : '등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}