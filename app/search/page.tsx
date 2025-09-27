"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import JobApplicationModal from "@/components/modals/JobApplicationModal";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { useModal } from "@/lib/hooks/useModal";
import { useApplications } from "@/lib/hooks/useApplications";
import { useProfile } from "@/lib/hooks/useProfile";
import { Post } from "@/lib/types/database";

function SearchPageContent() {
  const { user } = useAuth();
  const { isJobseeker } = useProfile();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const {
    isOpen: isApplicationModalOpen,
    open: openApplicationModal,
    close: closeApplicationModal,
  } = useModal();
  const { checkApplicationExists } = useApplications(undefined, {
    autoFetch: false,
  });

  // Search filters
  const [searchFilters, setSearchFilters] = useState({
    keyword: searchParams?.get("q") || "",
    location: "",
    minPay: "",
    maxPay: "",
    sortBy: "latest" as "latest" | "pay_high" | "pay_low" | "deadline",
  });

  useEffect(() => {
    fetchPosts();
  }, [searchFilters]);

  const fetchPosts = async () => {
    setLoading(true);

    try {
      let query = supabase.from("posts").select("*").eq("status", "active");

      // Keyword search
      if (searchFilters.keyword) {
        query = query.or(
          `title.ilike.%${searchFilters.keyword}%,details.ilike.%${searchFilters.keyword}%`
        );
      }

      // Location filter
      if (searchFilters.location) {
        query = query.ilike("location", `%${searchFilters.location}%`);
      }

      // Pay range filter
      if (searchFilters.minPay) {
        query = query.gte("pay", parseInt(searchFilters.minPay));
      }
      if (searchFilters.maxPay) {
        query = query.lte("pay", parseInt(searchFilters.maxPay));
      }

      // Sorting
      switch (searchFilters.sortBy) {
        case "latest":
          query = query.order("created_at", { ascending: false });
          break;
        case "pay_high":
          query = query.order("pay", { ascending: false, nullsFirst: false });
          break;
        case "pay_low":
          query = query.order("pay", { ascending: true, nullsFirst: false });
          break;
        case "deadline":
          query = query.order("application_deadline", {
            ascending: true,
            nullsFirst: false,
          });
          break;
      }

      const { data, error } = await query;

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
  };

  const handlePostClick = async (post: Post) => {
    if (!user) {
      alert("로그인이 필요합니다.");
      router.push("/login");
      return;
    }

    if (isJobseeker) {
      // Check if already applied
      const hasApplied = await checkApplicationExists(post.id);
      if (hasApplied) {
        alert("이미 지원한 공고입니다.");
        return;
      }

      setSelectedPost(post);
      openApplicationModal();
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPosts();
  };

  const isDeadlinePassed = (deadline: string | null) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            구인 공고 검색
          </h1>

          {/* Search Form */}
          <form
            onSubmit={handleSearch}
            className="bg-white rounded-lg shadow-sm border p-6 mb-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Keyword */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  키워드
                </label>
                <input
                  type="text"
                  value={searchFilters.keyword}
                  onChange={(e) =>
                    setSearchFilters((prev) => ({
                      ...prev,
                      keyword: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="제목, 내용 검색..."
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  지역
                </label>
                <input
                  type="text"
                  value={searchFilters.location}
                  onChange={(e) =>
                    setSearchFilters((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="지역명 입력..."
                />
              </div>

              {/* Min Pay */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  최소 급여
                </label>
                <input
                  type="number"
                  value={searchFilters.minPay}
                  onChange={(e) =>
                    setSearchFilters((prev) => ({
                      ...prev,
                      minPay: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="원"
                />
              </div>

              {/* Max Pay */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  최대 급여
                </label>
                <input
                  type="number"
                  value={searchFilters.maxPay}
                  onChange={(e) =>
                    setSearchFilters((prev) => ({
                      ...prev,
                      maxPay: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="원"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  정렬
                </label>
                <select
                  value={searchFilters.sortBy}
                  onChange={(e) =>
                    setSearchFilters((prev) => ({
                      ...prev,
                      sortBy: e.target.value as any,
                    }))
                  }
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="latest">최신순</option>
                  <option value="pay_high">급여 높은 순</option>
                  <option value="pay_low">급여 낮은 순</option>
                  <option value="deadline">마감 임박순</option>
                </select>
              </div>

              {/* Search Button */}
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                검색
              </button>
            </div>
          </form>

          {/* Results */}
          {loading ? (
            <div className="text-center py-12">
              <div className="text-gray-500">검색 중...</div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="text-gray-600">
                  총 {posts.length}개의 공고를 찾았습니다.
                </div>
              </div>

              {posts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  검색 조건에 맞는 공고가 없습니다.
                </div>
              ) : (
                <div className="grid gap-6">
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      onClick={() => handlePostClick(post)}
                      className={`bg-white rounded-lg shadow-sm border p-6 transition-shadow ${
                        isJobseeker &&
                        !isDeadlinePassed(post.application_deadline)
                          ? "hover:shadow-md cursor-pointer"
                          : ""
                      } ${
                        isDeadlinePassed(post.application_deadline)
                          ? "opacity-60"
                          : ""
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="text-xl font-semibold text-gray-900">
                              {post.title}
                              {isDeadlinePassed(post.application_deadline) && (
                                <span className="ml-2 text-sm text-red-600">
                                  (마감됨)
                                </span>
                              )}
                            </h3>
                          </div>

                          <div className="text-sm text-gray-600 mb-3 flex flex-wrap gap-4">
                            <span>📅 {post.post_date}</span>
                            {post.pay && (
                              <span>💰 {post.pay.toLocaleString()}원</span>
                            )}
                            {post.location && <span>📍 {post.location}</span>}
                            {post.application_deadline && (
                              <span
                                className={
                                  isDeadlinePassed(post.application_deadline)
                                    ? "text-red-600"
                                    : ""
                                }
                              >
                                ⏰ 마감: {post.application_deadline}
                              </span>
                            )}
                          </div>

                          <p className="text-gray-700 mb-4 line-clamp-3">
                            {post.details}
                          </p>

                          {post.external_link && (
                            <a
                              href={post.external_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              🔗 외부 링크
                            </a>
                          )}
                        </div>

                        {isJobseeker &&
                          !isDeadlinePassed(post.application_deadline) && (
                            <div className="mt-4 lg:mt-0 lg:ml-6">
                              <button
                                onClick={() => handlePostClick(post)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                              >
                                지원하기
                              </button>
                            </div>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <JobApplicationModal
        isOpen={isApplicationModalOpen}
        onClose={closeApplicationModal}
        post={selectedPost}
        onApplicationSubmitted={() => {
          // Optionally refresh the search results
          fetchPosts();
        }}
      />
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <>
          <Header />
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">로딩 중...</div>
          </div>
        </>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
