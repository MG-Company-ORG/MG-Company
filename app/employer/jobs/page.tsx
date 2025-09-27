"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import JobPostForm from "@/components/JobPostForm";
import { supabase } from "@/lib/supabase/client";
import { useProfile } from "@/lib/hooks/useProfile";
import { Post } from "@/lib/types/database";
import {
  PlusIcon,
  DocumentTextIcon,
  CalendarIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

export default function EmployerJobsPage() {
  const {
    profile,
    loading: profileLoading,
    isEmployer,
    isAdmin,
  } = useProfile();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const router = useRouter();

  const fetchMyPosts = useCallback(async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          applications(count)
        `)
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching posts:", error);
      } else {
        setPosts(data || []);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (profileLoading) return;

    if (!profile?.id) {
      router.push("/login");
      return;
    }

    // Allow access for employers or admins
    if (!isEmployer && !isAdmin) {
      router.push("/");
      return;
    }

    fetchMyPosts();
  }, [profile?.id, profileLoading, isEmployer, isAdmin, router, fetchMyPosts]);

  const deletePost = async (postId: number) => {
    if (!confirm("정말로 이 공고를 삭제하시겠습니까?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId)
        .eq("user_id", profile?.id);

      if (error) {
        console.error("Error deleting post:", error);
        alert("삭제 중 오류가 발생했습니다.");
      } else {
        setPosts(posts.filter((post) => post.id !== postId));
        alert("공고가 삭제되었습니다.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const handlePostSave = (savedPost: Post) => {
    if (selectedPost) {
      // Update existing post
      setPosts(posts.map(post => post.id === savedPost.id ? savedPost : post));
    } else {
      // Add new post
      setPosts([savedPost, ...posts]);
    }
  };

  const openEditModal = (post: Post) => {
    setSelectedPost(post);
    setShowEditModal(true);
  };

  const openCreateModal = () => {
    setSelectedPost(null);
    setShowCreateModal(true);
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setSelectedPost(null);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "closed":
        return "bg-red-100 text-red-800";
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "활성";
      case "closed":
        return "마감";
      case "draft":
        return "초안";
      default:
        return status;
    }
  };

  const filteredPosts = posts.filter((post) => {
    if (selectedStatus === "all") return true;
    return post.status === selectedStatus;
  });

  const getStats = () => {
    const totalPosts = posts.length;
    const activePosts = posts.filter((post) => post.status === "active").length;
    const draftPosts = posts.filter((post) => post.status === "draft").length;
    const closedPosts = posts.filter((post) => post.status === "closed").length;

    return { totalPosts, activePosts, draftPosts, closedPosts };
  };

  if (profileLoading || loading) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">로딩 중...</div>
        </div>
      </>
    );
  }

  if (!isEmployer && !isAdmin) {
    return null;
  }

  const stats = getStats();

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">공고 관리</h1>
            <button
              onClick={openCreateModal}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              새 공고 작성
            </button>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-500">
                    전체 공고
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {stats.totalPosts}
                  </div>
                </div>
                <DocumentTextIcon className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-500">
                    활성 공고
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {stats.activePosts}
                  </div>
                </div>
                <DocumentTextIcon className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-500">
                    초안
                  </div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {stats.draftPosts}
                  </div>
                </div>
                <DocumentTextIcon className="h-8 w-8 text-yellow-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-500">
                    마감된 공고
                  </div>
                  <div className="text-2xl font-bold text-red-600">
                    {stats.closedPosts}
                  </div>
                </div>
                <DocumentTextIcon className="h-8 w-8 text-red-500" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedStatus("all")}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedStatus === "all"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                전체 ({posts.length})
              </button>
              {["active", "draft", "closed"].map((status) => {
                const count = posts.filter((post) => post.status === status).length;
                return (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedStatus === status
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {getStatusText(status)} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Posts List */}
          <div className="bg-white rounded-lg shadow-sm border">
            {filteredPosts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {selectedStatus === "all"
                  ? "등록된 공고가 없습니다."
                  : `${getStatusText(selectedStatus)} 상태의 공고가 없습니다.`}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredPosts.map((post) => (
                  <div
                    key={post.id}
                    className="p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <h3 className="text-lg font-medium text-gray-900 mr-3">
                            {post.title}
                          </h3>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(
                              post.status
                            )}`}
                          >
                            {getStatusText(post.status)}
                          </span>
                        </div>

                        <div className="text-sm text-gray-600 flex items-center gap-4 mb-3">
                          <span className="flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-1" />
                            {post.post_date}
                          </span>
                          {post.pay && (
                            <span className="flex items-center">
                              <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                              {post.pay.toLocaleString()}원
                            </span>
                          )}
                          {post.location && (
                            <span className="flex items-center">
                              <MapPinIcon className="h-4 w-4 mr-1" />
                              {post.location}
                            </span>
                          )}
                        </div>

                        <p className="text-gray-700 mb-3 line-clamp-2">
                          {post.details}
                        </p>

                        <div className="text-sm text-gray-500">
                          작성일: {new Date(post.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => {
                            setSelectedPost(post);
                            setShowDetailsModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="상세보기"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(post)}
                          className="text-gray-600 hover:text-gray-900 p-1"
                          title="수정"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deletePost(post.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="삭제"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Job Post Form Modals */}
          <JobPostForm
            post={null}
            isOpen={showCreateModal}
            onClose={closeModals}
            onSave={handlePostSave}
            userId={profile?.id || ""}
          />

          <JobPostForm
            post={selectedPost}
            isOpen={showEditModal}
            onClose={closeModals}
            onSave={handlePostSave}
            userId={profile?.id || ""}
          />

          {/* Post Details Modal */}
          {showDetailsModal && selectedPost && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="px-6 py-4 border-b">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">
                      공고 상세보기
                    </h3>
                    <button
                      onClick={() => setShowDetailsModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                <div className="px-6 py-4 space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xl font-semibold text-gray-900">
                        {selectedPost.title}
                      </h4>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(
                          selectedPost.status
                        )}`}
                      >
                        {getStatusText(selectedPost.status)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-600">작업일:</span>
                        <span className="ml-2 text-sm font-medium">
                          {selectedPost.post_date}
                        </span>
                      </div>
                      {selectedPost.pay && (
                        <div className="flex items-center">
                          <CurrencyDollarIcon className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-600">급여:</span>
                          <span className="ml-2 text-sm font-medium">
                            {selectedPost.pay.toLocaleString()}원
                          </span>
                        </div>
                      )}
                      {selectedPost.location && (
                        <div className="flex items-center">
                          <MapPinIcon className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-600">위치:</span>
                          <span className="ml-2 text-sm font-medium">
                            {selectedPost.location}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h5 className="text-sm font-medium text-gray-900 mb-3">
                      상세 내용
                    </h5>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {selectedPost.details}
                      </p>
                    </div>
                  </div>

                  {selectedPost.external_link && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-900 mb-3">
                        외부 링크
                      </h5>
                      <a
                        href={selectedPost.external_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        {selectedPost.external_link}
                      </a>
                    </div>
                  )}

                  <div className="text-xs text-gray-500">
                    작성일: {new Date(selectedPost.created_at).toLocaleDateString()} {new Date(selectedPost.created_at).toLocaleTimeString()}
                  </div>
                </div>

                <div className="px-6 py-4 border-t">
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                  >
                    닫기
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}