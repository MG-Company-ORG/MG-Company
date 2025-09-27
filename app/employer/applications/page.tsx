"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase/client";
import { useProfile } from "@/lib/hooks/useProfile";
import {
  Application,
  ApplicationStatus,
  PostWithApplications,
} from "@/lib/types/database";
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  DocumentTextIcon,
  CalendarIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  DocumentArrowDownIcon,
} from "@heroicons/react/24/outline";

interface ApplicationWithDetails {
  id: number;
  post_id: number;
  applicant_id: string;
  status: ApplicationStatus;
  message: string | null;
  contact_info: {
    phone?: string;
    email?: string;
    preferredContact?: "phone" | "email";
  };
  resume_file_url?: string | null;
  cover_letter_file_url?: string | null;
  additional_files?: string[];
  applied_at: string;
  updated_at: string;
  post: {
    id: number;
    title: string;
    post_date: string;
    pay: number | null;
    location: string | null;
    status: string;
  };
  applicant: {
    id: string;
    email: string;
  };
}

export default function EmployerApplicationsPage() {
  const {
    profile,
    loading: profileLoading,
    isEmployer,
    isAdmin,
  } = useProfile();
  const [applications, setApplications] = useState<ApplicationWithDetails[]>(
    []
  );
  const [posts, setPosts] = useState<PostWithApplications[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedPost, setSelectedPost] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"dashboard" | "applications">(
    "dashboard"
  );
  const [selectedApplication, setSelectedApplication] =
    useState<ApplicationWithDetails | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const router = useRouter();

  const fetchMyPosts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(
          `
          *,
          applications(count)
        `
        )
        .eq("user_id", profile?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
  }, [profile?.id]);

  const fetchApplications = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("applications")
        .select(
          `
          *,
          post:posts!inner(id, title, post_date, pay, location, status),
          applicant:profiles!applications_applicant_id_fkey(id, email)
        `
        )
        .eq("post.user_id", profile?.id)
        .order("applied_at", { ascending: false });

      if (error) {
        console.error("Error fetching applications:", error);
      } else {
        setApplications(data || []);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  }, [profile?.id]);

  const initializeData = useCallback(async () => {
    if (!profile) return;

    // Allow access for employers or admins
    if (!isEmployer && !isAdmin) {
      router.push("/");
      return;
    }

    try {
      setLoading(true);
      await Promise.all([fetchApplications(), fetchMyPosts()]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [profile, isEmployer, isAdmin, router, fetchApplications, fetchMyPosts]);

  useEffect(() => {
    if (profileLoading) return;

    if (!profile?.id) {
      router.push("/login");
      return;
    }

    initializeData();
  }, [profile?.id, profileLoading, router, initializeData]);

  const updateApplicationStatus = async (
    applicationId: number,
    newStatus: ApplicationStatus
  ) => {
    try {
      const { error } = await supabase
        .from("applications")
        .update({ status: newStatus })
        .eq("id", applicationId);

      if (error) {
        console.error("Error updating application status:", error);
        alert("상태 변경 중 오류가 발생했습니다.");
        return;
      }

      // Update local state
      setApplications((prev) =>
        prev.map((app) =>
          app.id === applicationId ? { ...app, status: newStatus } : app
        )
      );

      const statusText = {
        pending: "검토 중",
        accepted: "승인",
        rejected: "거절",
        withdrawn: "철회",
      };
      alert(`지원 상태가 "${statusText[newStatus]}"로 변경되었습니다.`);
    } catch (error) {
      console.error("Error:", error);
      alert("상태 변경 중 오류가 발생했습니다.");
    }
  };

  const getStatusBadgeClass = (status: ApplicationStatus) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "accepted":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "withdrawn":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: ApplicationStatus) => {
    switch (status) {
      case "pending":
        return "검토 중";
      case "accepted":
        return "승인됨";
      case "rejected":
        return "거절됨";
      case "withdrawn":
        return "철회됨";
      default:
        return status;
    }
  };

  const viewApplicationDetails = (application: ApplicationWithDetails) => {
    setSelectedApplication(application);
    setShowApplicationModal(true);
  };

  const downloadFile = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading file:", error);
      alert("파일 다운로드 중 오류가 발생했습니다.");
    }
  };

  const filteredApplications = applications.filter((app) => {
    let statusMatch = selectedStatus === "all" || app.status === selectedStatus;
    let postMatch =
      selectedPost === "all" || app.post.id.toString() === selectedPost;
    return statusMatch && postMatch;
  });

  const getStats = () => {
    const totalApplications = applications.length;
    const pendingCount = applications.filter(
      (app) => app.status === "pending"
    ).length;
    const acceptedCount = applications.filter(
      (app) => app.status === "accepted"
    ).length;
    const rejectedCount = applications.filter(
      (app) => app.status === "rejected"
    ).length;
    const activePosts = posts.filter((post) => post.status === "active").length;

    return {
      totalApplications,
      pendingCount,
      acceptedCount,
      rejectedCount,
      activePosts,
      totalPosts: posts.length,
    };
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
            <h1 className="text-3xl font-bold text-gray-900">
              구인자 대시보드
            </h1>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode("dashboard")}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  viewMode === "dashboard"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <ChartBarIcon className="h-4 w-4 inline mr-1" />
                대시보드
              </button>
              <button
                onClick={() => setViewMode("applications")}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  viewMode === "applications"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <UserIcon className="h-4 w-4 inline mr-1" />
                지원자 관리
              </button>
            </div>
          </div>

          {viewMode === "dashboard" ? (
            // Dashboard View
            <div className="space-y-6">
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-500">
                        총 지원자
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {stats.totalApplications}
                      </div>
                    </div>
                    <UserIcon className="h-8 w-8 text-blue-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-500">
                        검토 대기
                      </div>
                      <div className="text-2xl font-bold text-yellow-600">
                        {stats.pendingCount}
                      </div>
                    </div>
                    <ClockIcon className="h-8 w-8 text-yellow-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-500">
                        승인됨
                      </div>
                      <div className="text-2xl font-bold text-green-600">
                        {stats.acceptedCount}
                      </div>
                    </div>
                    <CheckCircleIcon className="h-8 w-8 text-green-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-500">
                        활성 공고
                      </div>
                      <div className="text-2xl font-bold text-blue-600">
                        {stats.activePosts}
                      </div>
                    </div>
                    <DocumentTextIcon className="h-8 w-8 text-blue-500" />
                  </div>
                </div>
              </div>

              {/* Recent Applications */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="px-6 py-4 border-b">
                  <h2 className="text-lg font-medium text-gray-900">
                    최근 지원자
                  </h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {applications.slice(0, 5).map((application) => (
                    <div
                      key={application.id}
                      className="px-6 py-4 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <UserIcon className="h-6 w-6 text-gray-500" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {application.applicant.email}
                          </div>
                          <div className="text-sm text-gray-500">
                            {application.post.title}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(
                            application.status
                          )}`}
                        >
                          {getStatusText(application.status)}
                        </span>
                        <button
                          onClick={() => viewApplicationDetails(application)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {applications.length === 0 && (
                    <div className="px-6 py-8 text-center text-gray-500">
                      아직 지원자가 없습니다.
                    </div>
                  )}
                </div>
              </div>

              {/* My Posts Summary */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="px-6 py-4 border-b">
                  <h2 className="text-lg font-medium text-gray-900">
                    내 채용 공고
                  </h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {posts.slice(0, 5).map((post) => (
                    <div
                      key={post.id}
                      className="px-6 py-4 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {post.title}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center space-x-4 mt-1">
                          <span className="flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-1" />
                            {new Date(post.post_date).toLocaleDateString()}
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
                      </div>
                      <div className="flex items-center space-x-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            post.status === "active"
                              ? "bg-green-100 text-green-800"
                              : post.status === "closed"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {post.status === "active"
                            ? "활성"
                            : post.status === "closed"
                            ? "마감"
                            : "초안"}
                        </span>
                        <span className="text-sm text-gray-500">
                          지원자{" "}
                          {
                            applications.filter(
                              (app) => app.post.id === post.id
                            ).length
                          }
                          명
                        </span>
                      </div>
                    </div>
                  ))}
                  {posts.length === 0 && (
                    <div className="px-6 py-8 text-center text-gray-500">
                      등록된 공고가 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // Applications Management View
            <div className="space-y-6">
              {/* Filters */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Status Filter */}
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      상태별 필터
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedStatus("all")}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          selectedStatus === "all"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        전체 ({applications.length})
                      </button>
                      {["pending", "accepted", "rejected", "withdrawn"].map(
                        (status) => {
                          const count = applications.filter(
                            (app) => app.status === status
                          ).length;
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
                              {getStatusText(status as ApplicationStatus)} (
                              {count})
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>

                  {/* Post Filter */}
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      공고별 필터
                    </label>
                    <select
                      value={selectedPost}
                      onChange={(e) => setSelectedPost(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">전체 공고</option>
                      {posts.map((post) => (
                        <option key={post.id} value={post.id.toString()}>
                          {post.title} (
                          {
                            applications.filter(
                              (app) => app.post.id === post.id
                            ).length
                          }
                          명 지원)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Applications List */}
              <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                {filteredApplications.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    {selectedStatus === "all" && selectedPost === "all"
                      ? "아직 지원자가 없습니다."
                      : "조건에 맞는 지원이 없습니다."}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            지원자 정보
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            공고
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            상태
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            지원일
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            관리
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredApplications.map((application) => (
                          <tr key={application.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                                  <UserIcon className="h-6 w-6 text-gray-500" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {application.applicant.email}
                                  </div>
                                  {application.contact_info && (
                                    <div className="text-sm text-gray-500 flex items-center gap-2">
                                      {(application.contact_info as any)
                                        .email && (
                                        <span className="flex items-center">
                                          <EnvelopeIcon className="h-3 w-3 mr-1" />
                                          {
                                            (application.contact_info as any)
                                              .email
                                          }
                                        </span>
                                      )}
                                      {(application.contact_info as any)
                                        .phone && (
                                        <span className="flex items-center">
                                          <PhoneIcon className="h-3 w-3 mr-1" />
                                          {
                                            (application.contact_info as any)
                                              .phone
                                          }
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">
                                {application.post.title}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center gap-3 mt-1">
                                {application.post.pay && (
                                  <span className="flex items-center">
                                    <CurrencyDollarIcon className="h-3 w-3 mr-1" />
                                    {application.post.pay.toLocaleString()}원
                                  </span>
                                )}
                                {application.post.location && (
                                  <span className="flex items-center">
                                    <MapPinIcon className="h-3 w-3 mr-1" />
                                    {application.post.location}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(
                                  application.status
                                )}`}
                              >
                                {getStatusText(application.status)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(
                                application.applied_at
                              ).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() =>
                                    viewApplicationDetails(application)
                                  }
                                  className="text-blue-600 hover:text-blue-900"
                                  title="상세보기"
                                >
                                  <EyeIcon className="h-4 w-4" />
                                </button>
                                {application.status === "pending" && (
                                  <>
                                    <button
                                      onClick={() =>
                                        updateApplicationStatus(
                                          application.id,
                                          "accepted"
                                        )
                                      }
                                      className="text-green-600 hover:text-green-900"
                                      title="승인"
                                    >
                                      <CheckCircleIcon className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        updateApplicationStatus(
                                          application.id,
                                          "rejected"
                                        )
                                      }
                                      className="text-red-600 hover:text-red-900"
                                      title="거절"
                                    >
                                      <XCircleIcon className="h-4 w-4" />
                                    </button>
                                  </>
                                )}
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
          )}

          {/* Application Details Modal */}
          {showApplicationModal && selectedApplication && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="px-6 py-4 border-b">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">
                      지원서 상세보기
                    </h3>
                    <button
                      onClick={() => setShowApplicationModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XCircleIcon className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                <div className="px-6 py-4 space-y-6">
                  {/* Applicant Information */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">
                      지원자 정보
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div className="flex items-center">
                        <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {selectedApplication.applicant.email}
                        </span>
                      </div>
                      {selectedApplication.contact_info && (
                        <>
                          {(selectedApplication.contact_info as any).email && (
                            <div className="flex items-center">
                              <EnvelopeIcon className="h-4 w-4 text-gray-400 mr-2" />
                              <span className="text-sm text-gray-600">
                                {
                                  (selectedApplication.contact_info as any)
                                    .email
                                }
                              </span>
                            </div>
                          )}
                          {(selectedApplication.contact_info as any).phone && (
                            <div className="flex items-center">
                              <PhoneIcon className="h-4 w-4 text-gray-400 mr-2" />
                              <span className="text-sm text-gray-600">
                                {
                                  (selectedApplication.contact_info as any)
                                    .phone
                                }
                              </span>
                            </div>
                          )}
                          {(selectedApplication.contact_info as any)
                            .preferredContact && (
                            <div className="text-xs text-gray-500">
                              선호 연락 방식:{" "}
                              {(selectedApplication.contact_info as any)
                                .preferredContact === "email"
                                ? "이메일"
                                : "전화"}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Job Information */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">
                      공고 정보
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm font-medium text-gray-900 mb-2">
                        {selectedApplication.post.title}
                      </div>
                      <div className="text-sm text-gray-600 flex items-center gap-4">
                        <span className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          {selectedApplication.post.post_date}
                        </span>
                        {selectedApplication.post.pay && (
                          <span className="flex items-center">
                            <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                            {selectedApplication.post.pay.toLocaleString()}원
                          </span>
                        )}
                        {selectedApplication.post.location && (
                          <span className="flex items-center">
                            <MapPinIcon className="h-4 w-4 mr-1" />
                            {selectedApplication.post.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Application Message */}
                  {selectedApplication.message && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">
                        지원 메시지
                      </h4>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">
                          {selectedApplication.message}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* File Attachments */}
                  {(selectedApplication.resume_file_url ||
                    selectedApplication.cover_letter_file_url ||
                    (selectedApplication.additional_files &&
                      selectedApplication.additional_files.length > 0)) && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">
                        첨부 파일
                      </h4>
                      <div className="space-y-2">
                        {selectedApplication.resume_file_url && (
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center">
                              <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
                              <span className="text-sm text-gray-900">
                                이력서
                              </span>
                            </div>
                            <button
                              onClick={() =>
                                downloadFile(
                                  selectedApplication.resume_file_url!,
                                  "이력서.pdf"
                                )
                              }
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <DocumentArrowDownIcon className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                        {selectedApplication.cover_letter_file_url && (
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center">
                              <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
                              <span className="text-sm text-gray-900">
                                자기소개서
                              </span>
                            </div>
                            <button
                              onClick={() =>
                                downloadFile(
                                  selectedApplication.cover_letter_file_url!,
                                  "자기소개서.pdf"
                                )
                              }
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <DocumentArrowDownIcon className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                        {selectedApplication.additional_files?.map(
                          (fileUrl, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center">
                                <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
                                <span className="text-sm text-gray-900">
                                  추가 파일 {index + 1}
                                </span>
                              </div>
                              <button
                                onClick={() =>
                                  downloadFile(
                                    fileUrl,
                                    `추가파일_${index + 1}.pdf`
                                  )
                                }
                                className="text-blue-600 hover:text-blue-900"
                              >
                                <DocumentArrowDownIcon className="h-4 w-4" />
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* Application Status and Actions */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">
                      지원 상태
                    </h4>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(
                            selectedApplication.status
                          )}`}
                        >
                          {getStatusText(selectedApplication.status)}
                        </span>
                        <span className="text-sm text-gray-500 ml-3">
                          지원일:{" "}
                          {new Date(
                            selectedApplication.applied_at
                          ).toLocaleDateString()}
                        </span>
                      </div>
                      {selectedApplication.status === "pending" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              updateApplicationStatus(
                                selectedApplication.id,
                                "accepted"
                              );
                              setShowApplicationModal(false);
                            }}
                            className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                          >
                            승인
                          </button>
                          <button
                            onClick={() => {
                              updateApplicationStatus(
                                selectedApplication.id,
                                "rejected"
                              );
                              setShowApplicationModal(false);
                            }}
                            className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                          >
                            거절
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 border-t">
                  <button
                    onClick={() => setShowApplicationModal(false)}
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
