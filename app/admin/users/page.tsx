"use client";

import { useState, useEffect, useCallback } from "react";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAdmin } from "@/lib/hooks/useAdmin";
import Header from "@/components/Header";
import { ProfileWithSuspensions, UserSuspension } from "@/lib/types/database";
import {
  BanknotesIcon,
  ShieldExclamationIcon,
  XMarkIcon,
  ClockIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

export default function AdminUsersPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [users, setUsers] = useState<ProfileWithSuspensions[]>([]);
  const [loading, setLoading] = useState(true);
  const [suspending, setSuspending] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "suspended" | "active">("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Suspension modal state
  const [showSuspensionModal, setShowSuspensionModal] = useState(false);
  const [selectedUser, setSelectedUser] =
    useState<ProfileWithSuspensions | null>(null);
  const [suspensionForm, setSuspensionForm] = useState({
    reason: "",
    type: "temporary" as "temporary" | "permanent",
    duration: "7", // days
  });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);

      // First, try to fetch with suspensions join
      let query = supabase
        .from("profiles")
        .select(
          `
          *,
          suspensions:user_suspensions!user_id(*)
        `
        )
        .order("created_at", { ascending: false });

      let { data, error } = await query;

      // If user_suspensions table doesn't exist, fetch profiles without suspensions
      if (error && error.message.includes("user_suspensions")) {
        console.warn(
          "user_suspensions table not found, fetching profiles without suspensions"
        );
        query = supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });

        const fallbackResult = await query;
        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error) throw error;

      const usersWithSuspensions =
        data?.map((user) => ({
          ...user,
          suspensions: user.suspensions || [],
          active_suspension: user.suspensions?.find(
            (s: UserSuspension) =>
              s.is_active &&
              (s.is_permanent || new Date(s.suspended_until || "") > new Date())
          ),
        })) || [];

      setUsers(usersWithSuspensions);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !adminLoading && !isAdmin) {
      redirect("/");
    }
  }, [authLoading, adminLoading, isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [filter, isAdmin, fetchUsers]);

  const handleSuspendUser = async () => {
    if (!selectedUser || !suspensionForm.reason.trim()) return;

    try {
      setSuspending(selectedUser.id);

      const suspendedUntil =
        suspensionForm.type === "permanent"
          ? null
          : new Date(
              Date.now() +
                parseInt(suspensionForm.duration) * 24 * 60 * 60 * 1000
            ).toISOString();

      // Try to create suspension record (skip if table doesn't exist)
      try {
        const { error: suspensionError } = await supabase
          .from("user_suspensions")
          .insert({
            user_id: selectedUser.id,
            admin_id: user!.id,
            reason: suspensionForm.reason,
            suspended_until: suspendedUntil,
            is_permanent: suspensionForm.type === "permanent",
          });

        if (
          suspensionError &&
          !suspensionError.message.includes("user_suspensions")
        ) {
          throw suspensionError;
        }
      } catch (suspensionTableError) {
        console.warn(
          "user_suspensions table not available:",
          suspensionTableError
        );
      }

      // Update user profile (only if columns exist)
      try {
        const updateData: any = {};

        // Check if is_suspended column exists by trying to update it
        const testUpdate = await supabase
          .from("profiles")
          .select("is_suspended")
          .eq("id", selectedUser.id)
          .limit(1);

        if (!testUpdate.error) {
          updateData.is_suspended = true;
          updateData.suspension_reason = suspensionForm.reason;
        }

        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from("profiles")
            .update(updateData)
            .eq("id", selectedUser.id);

          if (updateError) throw updateError;
        }
      } catch (updateError) {
        console.warn(
          "Could not update suspension columns in profiles:",
          updateError
        );
      }

      // Try to create notification (skip if table doesn't exist)
      try {
        await supabase.from("notifications").insert({
          user_id: selectedUser.id,
          type: "system",
          title: "계정이 정지되었습니다",
          message: `사유: ${suspensionForm.reason}${
            suspensionForm.type === "permanent"
              ? " (영구 정지)"
              : ` (${suspensionForm.duration}일 정지)`
          }`,
        });
      } catch (notificationError) {
        console.warn("notifications table not available:", notificationError);
      }

      await fetchUsers();
      setShowSuspensionModal(false);
      setSuspensionForm({ reason: "", type: "temporary", duration: "7" });
      setSelectedUser(null);
      alert("사용자가 성공적으로 정지되었습니다.");
    } catch (error) {
      console.error("Error suspending user:", error);
      alert("사용자 정지 중 오류가 발생했습니다.");
    } finally {
      setSuspending(null);
    }
  };

  const handleUnsuspendUser = async (userId: string) => {
    if (!confirm("정말로 이 사용자의 정지를 해제하시겠습니까?")) return;

    try {
      setSuspending(userId);

      // Try to deactivate all active suspensions (skip if table doesn't exist)
      try {
        const { error: suspensionError } = await supabase
          .from("user_suspensions")
          .update({ is_active: false })
          .eq("user_id", userId)
          .eq("is_active", true);

        if (
          suspensionError &&
          !suspensionError.message.includes("user_suspensions")
        ) {
          throw suspensionError;
        }
      } catch (suspensionTableError) {
        console.warn(
          "user_suspensions table not available:",
          suspensionTableError
        );
      }

      // Update user profile (only if columns exist)
      try {
        const updateData: any = {};

        // Check if is_suspended column exists by trying to select it
        const testUpdate = await supabase
          .from("profiles")
          .select("is_suspended")
          .eq("id", userId)
          .limit(1);

        if (!testUpdate.error) {
          updateData.is_suspended = false;
          updateData.suspension_reason = null;
        }

        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from("profiles")
            .update(updateData)
            .eq("id", userId);

          if (updateError) throw updateError;
        }
      } catch (updateError) {
        console.warn(
          "Could not update suspension columns in profiles:",
          updateError
        );
      }

      // Try to create notification (skip if table doesn't exist)
      try {
        await supabase.from("notifications").insert({
          user_id: userId,
          type: "system",
          title: "계정 정지가 해제되었습니다",
          message: "계정 사용이 재개되었습니다.",
        });
      } catch (notificationError) {
        console.warn("notifications table not available:", notificationError);
      }

      await fetchUsers();
      alert("사용자 정지가 해제되었습니다.");
    } catch (error) {
      console.error("Error unsuspending user:", error);
      alert("정지 해제 중 오류가 발생했습니다.");
    } finally {
      setSuspending(null);
    }
  };

  const openSuspensionModal = (user: ProfileWithSuspensions) => {
    setSelectedUser(user);
    setShowSuspensionModal(true);
  };

  const filteredUsers = users.filter((user) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "suspended" && user.is_suspended) ||
      (filter === "active" && !user.is_suspended);

    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return matchesFilter;
    }

    const matchesSearch =
      user.email?.toLowerCase().includes(normalizedSearch) ||
      (user.user_type ?? "").toLowerCase().includes(normalizedSearch) ||
      user.role?.toLowerCase().includes(normalizedSearch) ||
      (user.role === "admin" && "관리자".includes(normalizedSearch)) ||
      (user.user_type === "employer" && "공급자".includes(normalizedSearch)) ||
      (user.user_type === "jobseeker" && "구직자".includes(normalizedSearch));

    return matchesFilter && matchesSearch;
  });

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        로딩 중...
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">사용자 관리</h1>

          {/* Filters and Search */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Status Filter */}
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
                  <option value="suspended">정지됨</option>
                </select>
              </div>

              {/* Search */}
              <div className="flex-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  검색
                </label>
                <input
                  type="text"
                  placeholder="이메일 또는 유형으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm font-medium text-gray-500">
                전체 사용자
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {users.length}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm font-medium text-gray-500">
                활성 사용자
              </div>
              <div className="text-2xl font-bold text-green-600">
                {users.filter((u) => !u.is_suspended).length}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm font-medium text-gray-500">
                정지 사용자
              </div>
              <div className="text-2xl font-bold text-red-600">
                {users.filter((u) => u.is_suspended).length}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm font-medium text-gray-500">공급자</div>
              <div className="text-2xl font-bold text-blue-600">
                {users.filter((u) => u.user_type === "employer" && u.role !== "admin").length}
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="text-gray-500">로딩 중...</div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-gray-500">사용자가 없습니다.</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        사용자 정보
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        상태
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        정지 사유
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        가입일
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        관리
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((profile) => (
                      <tr key={profile.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {profile.email}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {profile.role === "admin" ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  관리자
                                </span>
                              ) : (
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    profile.user_type === "employer"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-green-100 text-green-800"
                                  }`}
                                >
                                  {profile.user_type === "employer"
                                    ? "공급자"
                                    : "구직자"}
                                </span>
                              )}
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  profile.role === "admin"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {profile.role === "admin" ? "관리자" : "사용자"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {profile.is_suspended ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <XMarkIcon className="w-3 h-3 mr-1" />
                              정지됨
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircleIcon className="w-3 h-3 mr-1" />
                              활성
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {profile.active_suspension ? (
                            <div className="text-sm">
                              <div className="text-gray-900 font-medium">
                                {profile.active_suspension.reason}
                              </div>
                              <div className="text-gray-500 text-xs">
                                {profile.active_suspension.is_permanent
                                  ? "영구 정지"
                                  : `${new Date(
                                      profile.active_suspension
                                        .suspended_until || ""
                                    ).toLocaleDateString()}까지`}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(profile.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {profile.role !== "admin" && (
                            <div className="flex items-center justify-end gap-2">
                              {profile.is_suspended ? (
                                <button
                                  onClick={() =>
                                    handleUnsuspendUser(profile.id)
                                  }
                                  disabled={suspending === profile.id}
                                  className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                  title="정지 해제"
                                >
                                  {suspending === profile.id ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                                  ) : (
                                    <CheckCircleIcon className="h-4 w-4" />
                                  )}
                                </button>
                              ) : (
                                <button
                                  onClick={() => openSuspensionModal(profile)}
                                  className="text-red-600 hover:text-red-900"
                                  title="사용자 정지"
                                >
                                  <ShieldExclamationIcon className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          )}
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

      {/* Suspension Modal */}
      {showSuspensionModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  사용자 정지
                </h3>
                <button
                  onClick={() => setShowSuspensionModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-4">
                <div className="text-sm text-gray-600">
                  <strong>{selectedUser.email}</strong> 사용자를
                  정지하시겠습니까?
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    정지 사유 *
                  </label>
                  <textarea
                    value={suspensionForm.reason}
                    onChange={(e) =>
                      setSuspensionForm({
                        ...suspensionForm,
                        reason: e.target.value,
                      })
                    }
                    placeholder="정지 사유를 입력하세요..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    정지 유형
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="temporary"
                        checked={suspensionForm.type === "temporary"}
                        onChange={(e) =>
                          setSuspensionForm({
                            ...suspensionForm,
                            type: e.target.value as any,
                          })
                        }
                        className="mr-2"
                      />
                      임시 정지
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="permanent"
                        checked={suspensionForm.type === "permanent"}
                        onChange={(e) =>
                          setSuspensionForm({
                            ...suspensionForm,
                            type: e.target.value as any,
                          })
                        }
                        className="mr-2"
                      />
                      영구 정지
                    </label>
                  </div>
                </div>

                {suspensionForm.type === "temporary" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      정지 기간 (일)
                    </label>
                    <select
                      value={suspensionForm.duration}
                      onChange={(e) =>
                        setSuspensionForm({
                          ...suspensionForm,
                          duration: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="1">1일</option>
                      <option value="3">3일</option>
                      <option value="7">7일</option>
                      <option value="14">14일</option>
                      <option value="30">30일</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowSuspensionModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={handleSuspendUser}
                  disabled={
                    !suspensionForm.reason.trim() ||
                    suspending === selectedUser.id
                  }
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {suspending === selectedUser.id ? "처리 중..." : "정지 실행"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
