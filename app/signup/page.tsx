"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [userType, setUserType] = useState<"employer" | "jobseeker">(
    "jobseeker"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("비밀번호는 최소 6자 이상이어야 합니다.");
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            user_type: userType,
          },
          emailRedirectTo: undefined, // 이메일 확인 링크 비활성화
        },
      });

      if (error) {
        setError(error.message);
      } else {
        // Update the user's profile with user_type
        if (data.user) {
          try {
            // First check if the profile exists (without using .single())
            const { data: profileData, error: profileError } = await supabase
              .from("profiles")
              .select("id, user_type")
              .eq("id", data.user.id);

            if (profileError) {
              console.error("Error checking profile:", profileError);
              // If it's a column not found error, we'll skip the update
              if (profileError.message?.includes("user_type")) {
                console.log(
                  "user_type column does not exist yet. Skipping profile update."
                );
              } else {
                console.error("Profile check failed:", profileError);
              }
            } else if (profileData && profileData.length > 0) {
              // Profile exists, update it
              const { error: updateError } = await supabase
                .from("profiles")
                .update({ user_type: userType })
                .eq("id", data.user.id);

              if (updateError) {
                console.error("Error updating profile:", updateError);
              } else {
                console.log(
                  "Profile updated successfully with user_type:",
                  userType
                );
              }
            } else {
              // Profile doesn't exist, create it
              const { error: insertError } = await supabase
                .from("profiles")
                .insert({
                  id: data.user.id,
                  email: data.user.email,
                  user_type: userType,
                  role: "user",
                });

              if (insertError) {
                console.error("Error creating profile:", insertError);
              } else {
                console.log(
                  "Profile created successfully with user_type:",
                  userType
                );
              }
            }
          } catch (profileUpdateError) {
            console.error("Profile operation failed:", profileUpdateError);
            // Continue with signup even if profile operation fails
          }
        }

        // Store user type in localStorage for client-side access
        if (typeof window !== "undefined") {
          localStorage.setItem("user_type", userType);
        }

        // 이메일 확인 없이 바로 로그인 처리
        if (data.session) {
          setMessage("회원가입이 완료되었습니다. 자동으로 로그인됩니다.");
          setTimeout(() => {
            router.push("/");
            router.refresh();
          }, 1500);
        } else {
          setMessage("회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.");
          setTimeout(() => {
            router.push("/login");
          }, 1500);
        }
      }
    } catch (err) {
      setError("회원가입 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            회원가입
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            또는{" "}
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              기존 계정으로 로그인하세요
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* User Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                가입 유형을 선택해주세요
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setUserType("employer")}
                  className={`p-4 border-2 rounded-lg text-center transition-colors ${
                    userType === "employer"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-medium">구인자</div>
                  <div className="text-xs text-gray-500 mt-1">
                    채용 공고를 등록하고 지원자를 관리합니다
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setUserType("jobseeker")}
                  className={`p-4 border-2 rounded-lg text-center transition-colors ${
                    userType === "jobseeker"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-medium">구직자</div>
                  <div className="text-xs text-gray-500 mt-1">
                    채용 공고를 보고 지원합니다
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                이메일 주소
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="이메일 주소"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="비밀번호 (최소 6자)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-sm font-medium text-gray-700"
              >
                비밀번호 확인
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="비밀번호 다시 입력"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          {message && (
            <div className="text-green-600 text-sm text-center">{message}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? "가입 중..." : "회원가입"}
            </button>
          </div>

          <div className="text-center">
            <Link
              href="/"
              className="text-sm text-gray-600 hover:text-gray-500"
            >
              ← 메인으로 돌아가기
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
