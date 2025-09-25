'use client'

import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'

interface JobPostModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: string | null
  onPostCreated: () => void
}

export default function JobPostModal({
  isOpen,
  onClose,
  selectedDate,
  onPostCreated
}: JobPostModalProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    details: '',
    pay: '',
    location: '',
    external_link: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedDate) return

    setLoading(true)

    try {
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          post_date: selectedDate,
          title: formData.title,
          details: formData.details,
          pay: formData.pay ? parseInt(formData.pay) : null,
          location: formData.location || null,
          external_link: formData.external_link || null
        })

      if (error) {
        console.error('Error creating post:', error)
        alert('공고 작성 중 오류가 발생했습니다.')
      } else {
        alert('공고가 성공적으로 등록되었습니다!')
        setFormData({
          title: '',
          details: '',
          pay: '',
          location: '',
          external_link: ''
        })
        onPostCreated()
        onClose()
      }
    } catch (error) {
      console.error('Error:', error)
      alert('공고 작성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 sm:p-6 border-b">
          <h3 className="text-base sm:text-lg font-semibold">
            구인 공고 등록
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              날짜
            </label>
            <input
              type="text"
              value={selectedDate || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              제목 *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="예: 카페 홀 서빙 직원 구합니다"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              상세 내용 *
            </label>
            <textarea
              name="details"
              value={formData.details}
              onChange={handleInputChange}
              required
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="업무 내용, 근무 조건 등을 자세히 적어주세요"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              급여 (원)
            </label>
            <input
              type="number"
              name="pay"
              value={formData.pay}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="예: 50000"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              근무지
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="예: 서울시 강남구"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              외부 링크
            </label>
            <input
              type="url"
              name="external_link"
              value={formData.external_link}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://..."
            />
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
              disabled={loading}
              className="flex-1 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-xs sm:text-sm"
            >
              {loading ? '등록 중...' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}