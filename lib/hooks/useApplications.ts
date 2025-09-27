"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "./useAuth";
import {
  Application,
  ApplicationWithPost,
  ApplicationStatus,
} from "@/lib/types/database";

type UseApplicationsOptions = {
  autoFetch?: boolean;
};

export function useApplications(
  postId?: number,
  options?: UseApplicationsOptions
) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [applications, setApplications] = useState<Application[]>([]);
  const autoFetch = options?.autoFetch ?? true;
  const [loading, setLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    if (!userId) {
      setError("로그인이 필요합니다.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 사용자 프로필 정보 먼저 확인 (user_type 포함, 없으면 기본 컬럼만)
      const { data: userProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, role, user_type")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error("Error fetching user profile:", profileError);
        // user_type 컬럼이 없는 경우 기본 컬럼만 다시 시도
        const { data: basicProfile } = await supabase
          .from("profiles")
          .select("id, email, role")
          .eq("id", userId)
          .single();

        if (basicProfile) {
          console.warn("Using basic profile data without user_type");
        } else {
          console.warn("Proceeding without user profile data");
        }
      }

      // 먼저 기본 applications 데이터를 가져오기
      let baseQuery = supabase
        .from("applications")
        .select("*")
        .order("applied_at", { ascending: false });

      // 사용자 역할에 따라 필터링 (user_type이 있는 경우)
      if (userProfile?.user_type === "jobseeker") {
        // 구직자는 자신의 지원만 볼 수 있음
        baseQuery = baseQuery.eq("applicant_id", userId);
      } else if (userProfile?.user_type === "employer") {
        // 고용주는 자신의 공고에 대한 지원만 볼 수 있음 - 이는 RLS에서 처리됨
      } else if (!userProfile?.user_type && postId === undefined) {
        // user_type이 없는 경우 기본적으로 자신의 지원만 조회
        baseQuery = baseQuery.eq("applicant_id", userId);
      }
      // 관리자는 모든 지원을 볼 수 있음

      if (postId) {
        baseQuery = baseQuery.eq("post_id", postId);
      }

      const { data: applicationsData, error: applicationsError } =
        await baseQuery;

      if (applicationsError) {
        setError("지원 내역을 불러오는 중 오류가 발생했습니다.");
        console.error("Error fetching applications:", {
          message: applicationsError.message,
          details: applicationsError.details,
          hint: applicationsError.hint,
          code: applicationsError.code,
        });
        return;
      }

      if (!applicationsData || applicationsData.length === 0) {
        setApplications([]);
        return;
      }

      // 일단 기본 데이터만 설정하고, 추가 데이터는 필요시에만 로드
      console.log("Successfully fetched applications:", applicationsData);
      setApplications(applicationsData);

      // 관련 데이터가 필요한 경우에만 추가로 로드
      try {
        const postIds = [
          ...new Set(applicationsData.map((app) => app.post_id)),
        ];
        const applicantIds = [
          ...new Set(applicationsData.map((app) => app.applicant_id)),
        ];

        const [postsResult, profilesResult] = await Promise.all([
          supabase.from("posts").select("*").in("id", postIds),
          supabase
            .from("profiles")
            .select("id, email, role, user_type")
            .in("id", applicantIds),
        ]);

        if (postsResult.error) {
          console.error("Error fetching posts:", postsResult.error);
        }

        if (profilesResult.error) {
          console.error("Error fetching profiles:", profilesResult.error);
        }

        // 데이터를 조합하여 완전한 Application 객체 생성 (에러가 없는 경우에만)
        if (!postsResult.error && !profilesResult.error) {
          const enrichedApplications = applicationsData.map((app) => ({
            ...app,
            post: postsResult.data?.find((post) => post.id === app.post_id),
            applicant: profilesResult.data?.find(
              (profile) => profile.id === app.applicant_id
            ),
          }));

          setApplications(enrichedApplications);
        }
      } catch (enrichError) {
        console.error("Error enriching application data:", enrichError);
        // 기본 데이터는 이미 설정되어 있으므로 에러를 무시하고 계속 진행
      }
    } catch (err) {
      setError("지원 내역을 불러오는 중 오류가 발생했습니다.");
      console.error("Error:", {
        message: err instanceof Error ? err.message : "Unknown error",
        error: err,
      });
    } finally {
      setLoading(false);
    }
  }, [postId, userId]);

  const createApplication = useCallback(
    async (
      postId: number,
      message: string,
      contactInfo: {
        phone?: string;
        email?: string;
        preferredContact?: "phone" | "email";
      },
      fileUrls?: {
        resume?: string;
        coverLetter?: string;
        additionalFiles?: string[];
      }
    ) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          return { success: false, error: "로그인이 필요합니다." };
        }

        const applicationData = {
          post_id: postId,
          applicant_id: user.id,
          message,
          contact_info: contactInfo,
          ...(fileUrls?.resume && { resume_file_url: fileUrls.resume }),
          ...(fileUrls?.coverLetter && {
            cover_letter_file_url: fileUrls.coverLetter,
          }),
          ...(fileUrls?.additionalFiles &&
            fileUrls.additionalFiles.length > 0 && {
              additional_files: fileUrls.additionalFiles,
            }),
        };

        const { data, error } = await supabase
          .from("applications")
          .insert([applicationData])
          .select()
          .single();

        if (error) {
          console.error("Error creating application:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          });
          return { success: false, error: "지원 중 오류가 발생했습니다." };
        }

        setApplications((prev) => [data, ...prev]);
        return { success: true, data };
      } catch (err) {
        console.error("Error:", {
          message: err instanceof Error ? err.message : "Unknown error",
          error: err,
        });
        return { success: false, error: "지원 중 오류가 발생했습니다." };
      }
    },
    []
  );

  const updateApplicationStatus = useCallback(
    async (applicationId: number, status: ApplicationStatus) => {
      try {
        if (!userId) {
          return { success: false, error: "로그인이 필요합니다." };
        }

        const { data, error } = await supabase
          .from("applications")
          .update({ status })
          .eq("id", applicationId)
          .select()
          .single();

        if (error) {
          console.error("Error updating application status:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          });
          return { success: false, error: "상태 변경 중 오류가 발생했습니다." };
        }

        setApplications((prev) =>
          prev.map((app) => (app.id === applicationId ? data : app))
        );
        return { success: true, data };
      } catch (err) {
        console.error("Error:", {
          message: err instanceof Error ? err.message : "Unknown error",
          error: err,
        });
        return { success: false, error: "상태 변경 중 오류가 발생했습니다." };
      }
    },
    [userId]
  );

  const withdrawApplication = useCallback(
    async (applicationId: number) => {
      return updateApplicationStatus(applicationId, "withdrawn");
    },
    [updateApplicationStatus]
  );

  const checkApplicationExists = useCallback(
    async (postId: number) => {
      try {
        if (!userId) {
          return false;
        }

        const { data, error } = await supabase
          .from("applications")
          .select("id")
          .eq("post_id", postId)
          .eq("applicant_id", userId)
          .single();

        if (error && error.code !== "PGRST116") {
          // PGRST116 is "not found" error
          console.error("Error checking application:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          });
          return false;
        }

        return !!data;
      } catch (err) {
        console.error("Error:", {
          message: err instanceof Error ? err.message : "Unknown error",
          error: err,
        });
        return false;
      }
    },
    [userId]
  );

  useEffect(() => {
    if (!autoFetch) {
      return;
    }
    fetchApplications();
  }, [autoFetch, fetchApplications]);

  return {
    applications,
    loading,
    error,
    fetchApplications,
    createApplication,
    updateApplicationStatus,
    withdrawApplication,
    checkApplicationExists,
  };
}
