'use client'

import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { Post } from '@/lib/types/database'
import { useApplications } from '@/lib/hooks/useApplications'

interface JobApplicationModalProps {
  isOpen: boolean
  onClose: () => void
  post: Post | null
  onApplicationSubmitted: () => void
}

export default function JobApplicationModal({
  isOpen,
  onClose,
  post,
  onApplicationSubmitted
}: JobApplicationModalProps) {
  const [message, setMessage] = useState('')
  const [contactInfo, setContactInfo] = useState({
    phone: '',
    email: '',
    preferredContact: 'email' as 'phone' | 'email'
  })
  const [loading, setLoading] = useState(false)
  const { createApplication } = useApplications()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!post || !message.trim()) return

    setLoading(true)

    const result = await createApplication(post.id, message, contactInfo)

    if (result.success) {
      alert('지원이 완료되었습니다!')
      setMessage('')
      setContactInfo({
        phone: '',
        email: '',
        preferredContact: 'email'
      })
      onApplicationSubmitted()
      onClose()
    } else {
      alert(result.error || '지원 중 오류가 발생했습니다.')
    }

    setLoading(false)
  }

  if (!isOpen || !post) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 sm:p-6 border-b">
          <h3 className="text-base sm:text-lg font-semibold">
            구직 지원하기
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          {/* Job Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-gray-900 mb-2">{post.title}</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div>📅 {post.post_date}</div>
              {post.pay && <div>💰 {post.pay.toLocaleString()}원</div>}
              {post.location && <div>📍 {post.location}</div>}
              {post.application_deadline && (
                <div>⏰ 마감: {post.application_deadline}</div>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Application Message */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                지원 메시지 *
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="자기소개와 지원 동기를 간단히 작성해주세요..."
              />
            </div>

            {/* Contact Information */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                연락처 정보
              </label>
              <div className="space-y-3">
                <div>
                  <input
                    type="email"
                    value={contactInfo.email}
                    onChange={(e) => setContactInfo(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="이메일 주소"
                  />
                </div>
                <div>
                  <input
                    type="tel"
                    value={contactInfo.phone}
                    onChange={(e) => setContactInfo(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="전화번호 (선택)"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">선호 연락 방법</label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="email"
                        checked={contactInfo.preferredContact === 'email'}
                        onChange={(e) => setContactInfo(prev => ({ ...prev, preferredContact: e.target.value as 'email' }))}
                        className="mr-2"
                      />
                      <span className="text-sm">이메일</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="phone"
                        checked={contactInfo.preferredContact === 'phone'}
                        onChange={(e) => setContactInfo(prev => ({ ...prev, preferredContact: e.target.value as 'phone' }))}
                        className="mr-2"
                      />
                      <span className="text-sm">전화</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-2 sm:space-x-3 pt-3 sm:pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 text-xs sm:text-sm"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading || !message.trim()}
                className="flex-1 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-xs sm:text-sm"
              >
                {loading ? '지원 중...' : '지원하기'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}