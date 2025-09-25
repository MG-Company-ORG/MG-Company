'use client'

import { useState, useEffect } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import JobPostModal from './modals/JobPostModal'
import JobApplicationModal from './modals/JobApplicationModal'
import { useAuth } from '@/lib/hooks/useAuth'
import { useUserType } from '@/lib/hooks/useUserType'
import { useModal } from '@/lib/hooks/useModal'
import { usePosts, Post } from '@/lib/hooks/usePosts'
import { useApplications } from '@/lib/hooks/useApplications'

const DAYS = ['일', '월', '화', '수', '목', '금', '토']
const MONTHS = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월'
]


export default function Calendar() {
  const { user } = useAuth()
  const { isEmployer, isJobseeker } = useUserType()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const { isOpen: isPostModalOpen, open: openPostModal, close: closePostModal } = useModal()
  const { isOpen: isApplicationModalOpen, open: openApplicationModal, close: closeApplicationModal } = useModal()
  const { checkApplicationExists } = useApplications()

  // Calculate date range for current month
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  const { posts, fetchPosts } = usePosts({ start: firstDay, end: lastDay })



  // 달력 시작일 (월요일부터 시작하도록 조정)
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())

  // 달력에 표시할 날짜들 생성 (6주 * 7일 = 42일)
  const calendarDays = []
  for (let i = 0; i < 42; i++) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + i)
    calendarDays.push(date)
  }

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === month
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const handleDateClick = (date: Date) => {
    if (!user) {
      alert('로그인이 필요합니다.')
      return
    }

    // Only employers can create posts by clicking dates
    if (isEmployer) {
      const dateString = date.toISOString().split('T')[0]
      setSelectedDate(dateString)
      openPostModal()
    }
  }

  const handlePostClick = async (post: Post, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!user) {
      alert('로그인이 필요합니다.')
      return
    }

    if (isJobseeker) {
      // Check if already applied
      const hasApplied = await checkApplicationExists(post.id)
      if (hasApplied) {
        alert('이미 지원한 공고입니다.')
        return
      }

      setSelectedPost(post)
      openApplicationModal()
    }
  }

  const getPostsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0]
    return posts.filter(post => post.post_date === dateString)
  }

  const handlePostCreated = () => {
    fetchPosts()
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border p-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>

          <h2 className="text-lg font-semibold">
            {year}년 {MONTHS[month]}
          </h2>

          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>

        {/* 안내 메시지 */}
        {user && (
          <div className="mb-4 text-center text-sm text-gray-600">
            {isEmployer && '날짜를 클릭하여 구인 공고를 등록하세요'}
            {isJobseeker && '공고를 클릭하여 지원하세요'}
          </div>
        )}

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS.map((day) => (
            <div
              key={day}
              className="p-1 sm:p-2 text-center text-xs sm:text-sm font-medium text-gray-600"
            >
              {day}
            </div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((date, index) => {
            const dayPosts = getPostsForDate(date)

            return (
              <div
                key={index}
                onClick={() => handleDateClick(date)}
                className={`
                  relative h-16 sm:h-20 md:h-24 border border-gray-100 rounded cursor-pointer hover:bg-gray-50
                  ${!isCurrentMonth(date) ? 'text-gray-300 bg-gray-50' : ''}
                  ${isToday(date) ? 'bg-blue-50 border-blue-200' : ''}
                `}
              >
                <div className="p-1">
                  <span className={`text-xs sm:text-sm ${isToday(date) ? 'font-semibold text-blue-600' : ''}`}>
                    {date.getDate()}
                  </span>
                </div>

                {/* 구인 공고 표시 */}
                <div className="px-1 pb-1 overflow-hidden">
                  {dayPosts.slice(0, 2).map((post, postIndex) => (
                    <div
                      key={post.id}
                      onClick={(e) => handlePostClick(post, e)}
                      className={`text-xs px-1 py-0.5 rounded mb-1 truncate transition-colors ${
                        isJobseeker
                          ? 'bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                      title={`${post.title}${isJobseeker ? ' - 클릭하여 지원' : ''}`}
                    >
                      <span className="hidden sm:inline">
                        {post.title.length > 10 ? `${post.title.substring(0, 10)}...` : post.title}
                      </span>
                      <span className="sm:hidden">
                        {post.title.length > 6 ? `${post.title.substring(0, 6)}...` : post.title}
                      </span>
                    </div>
                  ))}
                  {dayPosts.length > 2 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{dayPosts.length - 2}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <JobPostModal
        isOpen={isPostModalOpen}
        onClose={closePostModal}
        selectedDate={selectedDate}
        onPostCreated={handlePostCreated}
      />

      <JobApplicationModal
        isOpen={isApplicationModalOpen}
        onClose={closeApplicationModal}
        post={selectedPost}
        onApplicationSubmitted={() => {
          // Optionally refresh posts to show updated application count
          fetchPosts()
        }}
      />
    </>
  )
}