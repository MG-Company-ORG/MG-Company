"use client";

import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { useProfile } from "@/lib/hooks/useProfile";

export default function Header() {
  const { signOut } = useAuth();
  const { profile, loading, userType, isEmployer, isJobseeker, isAdmin } =
    useProfile();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* 로고 */}
          <Link href="/" className="text-lg sm:text-xl font-bold text-gray-900">
            <span className="hidden sm:inline">캘린더 잡 플랫폼</span>
            <span className="sm:hidden">잡캘린더</span>
          </Link>

          {/* 네비게이션 */}
          <nav className="flex items-center space-x-2 sm:space-x-4">
            {loading ? (
              <div className="text-gray-500 text-sm">로딩중...</div>
            ) : profile ? (
              // 로그인된 상태
              <>
                {/* Role-based navigation */}
                {isEmployer && (
                  <>
                    <Link
                      href="/employer/applications"
                      className="text-gray-600 hover:text-gray-900 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium"
                    >
                      <span className="hidden sm:inline">지원자 관리</span>
                      <span className="sm:hidden">지원자</span>
                    </Link>
                    <Link
                      href="/employer/jobs"
                      className="text-gray-600 hover:text-gray-900 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium"
                    >
                      <span className="hidden sm:inline">공고 관리</span>
                      <span className="sm:hidden">공고</span>
                    </Link>
                  </>
                )}
                {isJobseeker && (
                  <>
                    <Link
                      href="/search"
                      className="text-gray-600 hover:text-gray-900 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium"
                    >
                      <span className="hidden sm:inline">공고 검색</span>
                      <span className="sm:hidden">검색</span>
                    </Link>
                    <Link
                      href="/jobseeker/applications"
                      className="text-gray-600 hover:text-gray-900 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium"
                    >
                      <span className="hidden sm:inline">지원 현황</span>
                      <span className="sm:hidden">지원</span>
                    </Link>
                  </>
                )}
                {/* Common navigation */}
                <Link
                  href="/mypage"
                  className="text-gray-600 hover:text-gray-900 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium"
                >
                  <span className="hidden sm:inline">마이페이지</span>
                  <span className="sm:hidden">마이</span>
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="text-purple-600 hover:text-purple-900 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium"
                  >
                    관리자
                  </Link>
                )}
                <button
                  onClick={handleSignOut}
                  className="text-gray-600 hover:text-gray-900 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium"
                >
                  로그아웃
                </button>
                <div className="text-xs sm:text-sm text-gray-500 hidden md:block">
                  {profile.email}
                  {isAdmin && (
                    <span className="ml-1 text-purple-600">(관리자)</span>
                  )}
                  {!isAdmin && userType && (
                    <span className="ml-1 text-blue-600">
                      ({userType === "employer" ? "구인자" : "구직자"})
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 md:hidden">
                  {profile.email?.split("@")[0]}
                  {isAdmin && <span className="ml-1 text-purple-600">👑</span>}
                  {!isAdmin && userType && (
                    <span className="ml-1 text-blue-600">
                      {userType === "employer" ? "🏢" : "👤"}
                    </span>
                  )}
                </div>
              </>
            ) : (
              // 로그인되지 않은 상태
              <>
                <Link
                  href="/login"
                  className="text-gray-600 hover:text-gray-900 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium"
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium"
                >
                  회원가입
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
