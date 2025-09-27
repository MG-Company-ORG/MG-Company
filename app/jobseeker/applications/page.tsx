"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { Application, ApplicationStatus } from "@/lib/types/database";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";

interface ApplicationWithPost {
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
    user_id: string;
  };
}

export default function JobseekerApplicationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [applications, setApplications] = useState<ApplicationWithPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithPost | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editMessage, setEditMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    checkUserTypeAndFetch();
  }, [user, authLoading, router]);

  const checkUserTypeAndFetch = async () => {
    try {
      // Check user type
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("id", user?.id)
        .single();

      if (profile?.user_type !== "jobseeker") {
        router.push("/");
        return;
      }

      setUserType(profile.user_type);
      await fetchApplications();
    } catch (error) {
      console.error("Error checking user type:", error);
      router.push("/");
    }
  };

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from("applications")
        .select(
          `
          *,
          post:posts!inner(id, title, post_date, pay, location, user_id)
        `
        )
        .eq("applicant_id", user?.id)
        .order("applied_at", { ascending: false });

      if (error) {
        console.error("Error fetching applications:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
      } else {
        setApplications(data || []);
      }
    } catch (error) {
      console.error("Error:", {
        message: error instanceof Error ? error.message : "Unknown error",
        error: error,
      });
    } finally {
      setLoading(false);
    }
  };

  const withdrawApplication = async (applicationId: number) => {
    if (!confirm("정말로 지원을 철회하시겠습니까?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("applications")
        .update({
          status: "withdrawn",
          updated_at: new Date().toISOString()
        })
        .eq("id", applicationId);

      if (error) {
        console.error("Error withdrawing application:", error);
        alert("지원 철회 중 오류가 발생했습니다.");
        return;
      }

      // Update local state
      setApplications((prev) =>
        prev.map((app) =>
          app.id === applicationId ? { ...app, status: "withdrawn", updated_at: new Date().toISOString() } : app
        )
      );

      alert("지원이 철회되었습니다.");
      setIsDetailModalOpen(false);
    } catch (error) {
      console.error("Error:", error);
      alert("지원 철회 중 오류가 발생했습니다.");
    }
  };

  const updateApplicationMessage = async () => {
    if (!selectedApplication || !editMessage.trim()) {
      alert("지원 메시지를 입력해주세요.");
      return;
    }

    try {
      const { error } = await supabase
        .from("applications")
        .update({
          message: editMessage,
          updated_at: new Date().toISOString()
        })
        .eq("id", selectedApplication.id);

      if (error) {
        console.error("Error updating application:", error);
        alert("지원서 수정 중 오류가 발생했습니다.");
        return;
      }

      // Update local state
      setApplications((prev) =>
        prev.map((app) =>
          app.id === selectedApplication.id
            ? { ...app, message: editMessage, updated_at: new Date().toISOString() }
            : app
        )
      );

      setSelectedApplication(prev => prev ? { ...prev, message: editMessage } : null);
      setIsEditMode(false);
      setEditMessage("");
      alert("지원서가 성공적으로 수정되었습니다.");
    } catch (error) {
      console.error("Error:", error);
      alert("지원서 수정 중 오류가 발생했습니다.");
    }
  };

  const openApplicationDetail = (application: ApplicationWithPost) => {
    setSelectedApplication(application);
    setIsDetailModalOpen(true);
  };

  const startEdit = () => {
    setEditMessage(selectedApplication?.message || "");
    setIsEditMode(true);
  };

  const cancelEdit = () => {
    setIsEditMode(false);
    setEditMessage("");
  };

  const downloadFile = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('파일 다운로드 중 오류가 발생했습니다.');
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

  const filteredApplications = applications.filter((app) => {
    if (selectedStatus === "all") return true;
    return app.status === selectedStatus;
  });

  if (authLoading || loading) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">로딩 중...</div>
        </div>
      </>
    );
  }

  if (userType !== "jobseeker") {
    return null;
  }

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">내 지원 현황</h1>
            <button
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-800"
            >
              ← 돌아가기
            </button>
          </div>

          {/* Status Filter */}
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
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
                      {getStatusText(status as ApplicationStatus)} ({count})
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Applications List */}
          <div className="bg-white rounded-lg shadow-sm border">
            {filteredApplications.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {selectedStatus === "all"
                  ? "아직 지원한 공고가 없습니다."
                  : `${getStatusText(
                      selectedStatus as ApplicationStatus
                    )} 상태의 지원이 없습니다.`}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredApplications.map((application) => (
                  <div key={application.id} className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-4 sm:space-y-0">
                      {/* Application Info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <button
                              onClick={() => openApplicationDetail(application)}
                              className="text-lg font-medium text-gray-900 hover:text-blue-600 text-left transition-colors"
                            >
                              {application.post.title}
                            </button>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(
                              application.status
                            )}`}
                          >
                            {getStatusText(application.status)}
                          </span>
                        </div>

                        <div className="text-sm text-gray-600 mb-3">
                          <span className="mr-4">
                            📅 {application.post.post_date}
                          </span>
                          {application.post.pay && (
                            <span className="mr-4">
                              💰 {application.post.pay.toLocaleString()}원
                            </span>
                          )}
                          {application.post.location && (
                            <span>📍 {application.post.location}</span>
                          )}
                        </div>

                        {/* Application Message */}
                        {application.message && (
                          <div className="bg-gray-50 rounded-lg p-3 mb-3">
                            <div className="text-sm font-medium text-gray-700 mb-1">
                              지원 메시지:
                            </div>
                            <div className="text-sm text-gray-600">
                              {application.message}
                            </div>
                          </div>
                        )}

                        <div className="text-xs text-gray-500 space-y-1">
                          <div>
                            지원일:{" "}
                            {new Date(application.applied_at).toLocaleString(
                              "ko-KR"
                            )}
                          </div>
                          {application.updated_at !== application.applied_at && (
                            <div>
                              수정일:{" "}
                              {new Date(application.updated_at).toLocaleString(
                                "ko-KR"
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="sm:ml-4 flex flex-col gap-2">
                        <button
                          onClick={() => openApplicationDetail(application)}
                          className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded hover:bg-blue-200 transition-colors"
                        >
                          상세보기
                        </button>
                        {application.status === "pending" && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedApplication(application);
                                startEdit();
                                setIsDetailModalOpen(true);
                              }}
                              className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded hover:bg-green-200 transition-colors"
                            >
                              수정하기
                            </button>
                            <button
                              onClick={() => withdrawApplication(application.id)}
                              className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition-colors"
                            >
                              지원 철회
                            </button>
                          </>
                        )}
                        {application.status === "accepted" && (
                          <div className="text-sm text-green-600 font-medium text-center">
                            🎉 승인됨
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {applications.length > 0 && (
            <div className="mt-6 text-center">
              <button
                onClick={() => router.push("/")}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                더 많은 공고 보러가기 →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Application Detail Modal */}
      <Transition appear show={isDetailModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => {
            setIsDetailModalOpen(false);
            setIsEditMode(false);
            setEditMessage("");
            setSelectedApplication(null);
          }}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  {selectedApplication && (
                    <>
                      <Dialog.Title
                        as="h3"
                        className="text-lg font-medium leading-6 text-gray-900 mb-4"
                      >
                        지원 상세정보
                      </Dialog.Title>

                      <div className="space-y-6">
                        {/* Job Post Info */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-gray-900">
                              {selectedApplication.post.title}
                            </h4>
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(
                                selectedApplication.status
                              )}`}
                            >
                              {getStatusText(selectedApplication.status)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div>📅 공고 등록일: {selectedApplication.post.post_date}</div>
                            {selectedApplication.post.pay && (
                              <div>💰 급여: {selectedApplication.post.pay.toLocaleString()}원</div>
                            )}
                            {selectedApplication.post.location && (
                              <div>📍 근무지: {selectedApplication.post.location}</div>
                            )}
                          </div>
                        </div>

                        {/* Application Details */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">지원 정보</h4>
                          <div className="space-y-3">
                            <div className="text-sm">
                              <span className="text-gray-600">지원일:</span>
                              <span className="ml-2 text-gray-900">
                                {new Date(selectedApplication.applied_at).toLocaleString("ko-KR")}
                              </span>
                            </div>
                            {selectedApplication.updated_at !== selectedApplication.applied_at && (
                              <div className="text-sm">
                                <span className="text-gray-600">수정일:</span>
                                <span className="ml-2 text-gray-900">
                                  {new Date(selectedApplication.updated_at).toLocaleString("ko-KR")}
                                </span>
                              </div>
                            )}
                            <div className="text-sm">
                              <span className="text-gray-600">연락처 정보:</span>
                              <div className="ml-2 text-gray-900">
                                {selectedApplication.contact_info.phone && (
                                  <div>📞 {selectedApplication.contact_info.phone}</div>
                                )}
                                {selectedApplication.contact_info.email && (
                                  <div>📧 {selectedApplication.contact_info.email}</div>
                                )}
                                {selectedApplication.contact_info.preferredContact && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    선호 연락 방법: {selectedApplication.contact_info.preferredContact === 'phone' ? '전화' : '이메일'}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Application Message */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">지원 메시지</h4>
                          {isEditMode ? (
                            <div className="space-y-3">
                              <textarea
                                value={editMessage}
                                onChange={(e) => setEditMessage(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                rows={6}
                                placeholder="지원 메시지를 입력해주세요..."
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={updateApplicationMessage}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  수정 완료
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                                >
                                  취소
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-gray-50 p-4 rounded-lg">
                              {selectedApplication.message ? (
                                <p className="text-gray-900 whitespace-pre-wrap">
                                  {selectedApplication.message}
                                </p>
                              ) : (
                                <p className="text-gray-500 italic">작성된 지원 메시지가 없습니다.</p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* File Downloads */}
                        {(selectedApplication.resume_file_url ||
                          selectedApplication.cover_letter_file_url ||
                          selectedApplication.additional_files?.length) && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-3">첨부 파일</h4>
                            <div className="space-y-2">
                              {selectedApplication.resume_file_url && (
                                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <span className="text-sm text-gray-700">📄 이력서</span>
                                  <button
                                    onClick={() => downloadFile(selectedApplication.resume_file_url!, 'resume.pdf')}
                                    className="text-blue-600 hover:text-blue-800 text-sm"
                                  >
                                    다운로드
                                  </button>
                                </div>
                              )}
                              {selectedApplication.cover_letter_file_url && (
                                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <span className="text-sm text-gray-700">📝 자기소개서</span>
                                  <button
                                    onClick={() => downloadFile(selectedApplication.cover_letter_file_url!, 'cover_letter.pdf')}
                                    className="text-blue-600 hover:text-blue-800 text-sm"
                                  >
                                    다운로드
                                  </button>
                                </div>
                              )}
                              {selectedApplication.additional_files?.map((fileUrl, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <span className="text-sm text-gray-700">📎 추가 파일 {index + 1}</span>
                                  <button
                                    onClick={() => downloadFile(fileUrl, `additional_file_${index + 1}.pdf`)}
                                    className="text-blue-600 hover:text-blue-800 text-sm"
                                  >
                                    다운로드
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex justify-between pt-4 border-t">
                          <div className="flex gap-2">
                            {selectedApplication.status === "pending" && !isEditMode && (
                              <>
                                <button
                                  onClick={startEdit}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                >
                                  메시지 수정
                                </button>
                                <button
                                  onClick={() => withdrawApplication(selectedApplication.id)}
                                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                  지원 철회
                                </button>
                              </>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              setIsDetailModalOpen(false);
                              setIsEditMode(false);
                              setEditMessage("");
                              setSelectedApplication(null);
                            }}
                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                          >
                            닫기
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
