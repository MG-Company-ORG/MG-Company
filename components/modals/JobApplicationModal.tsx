'use client'

import { useState } from 'react'
import { XMarkIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline'
import { Post } from '@/lib/types/database'
import { useApplications } from '@/lib/hooks/useApplications'
import { supabase } from '@/lib/supabase/client'

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
  const [uploadingFile, setUploadingFile] = useState<string | null>(null)
  const [files, setFiles] = useState({
    resume: null as File | null,
    coverLetter: null as File | null,
    additionalFiles: [] as File[]
  })
  const [uploadedFileUrls, setUploadedFileUrls] = useState({
    resume: '',
    coverLetter: '',
    additionalFiles: [] as string[]
  })
  const { createApplication } = useApplications(undefined, {
    autoFetch: false,
  })

  const uploadFileToStorage = async (file: File, path: string): Promise<string | null> => {
    try {
      setUploadingFile(path)
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${path}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('application-files')
        .upload(filePath, file)

      if (uploadError) {
        console.error('Upload error:', uploadError)
        return null
      }

      const { data: { publicUrl } } = supabase.storage
        .from('application-files')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('File upload error:', error)
      return null
    } finally {
      setUploadingFile(null)
    }
  }

  const handleFileChange = async (type: 'resume' | 'coverLetter', file: File | null) => {
    if (!file) {
      setFiles(prev => ({ ...prev, [type]: null }))
      setUploadedFileUrls(prev => ({ ...prev, [type]: '' }))
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB를 초과할 수 없습니다.')
      return
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowedTypes.includes(file.type)) {
      alert('PDF, DOC, DOCX 파일만 업로드 가능합니다.')
      return
    }

    setFiles(prev => ({ ...prev, [type]: file }))

    const uploadedUrl = await uploadFileToStorage(file, type)
    if (uploadedUrl) {
      setUploadedFileUrls(prev => ({ ...prev, [type]: uploadedUrl }))
    }
  }

  const handleAdditionalFileChange = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)

    // Validate total additional files (max 3)
    if (fileArray.length > 3) {
      alert('추가 파일은 최대 3개까지만 업로드 가능합니다.')
      return
    }

    const uploadPromises = fileArray.map(async (file) => {
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name}: 파일 크기는 10MB를 초과할 수 없습니다.`)
        return null
      }

      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']
      if (!allowedTypes.includes(file.type)) {
        alert(`${file.name}: PDF, DOC, DOCX, JPG, PNG 파일만 업로드 가능합니다.`)
        return null
      }

      return uploadFileToStorage(file, 'additional')
    })

    const uploadedUrls = await Promise.all(uploadPromises)
    const validUrls = uploadedUrls.filter(url => url !== null) as string[]

    setFiles(prev => ({ ...prev, additionalFiles: fileArray }))
    setUploadedFileUrls(prev => ({ ...prev, additionalFiles: validUrls }))
  }

  const resetForm = () => {
    setMessage('')
    setContactInfo({
      phone: '',
      email: '',
      preferredContact: 'email'
    })
    setFiles({
      resume: null,
      coverLetter: null,
      additionalFiles: []
    })
    setUploadedFileUrls({
      resume: '',
      coverLetter: '',
      additionalFiles: []
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!post || !message.trim()) return

    setLoading(true)

    const result = await createApplication(post.id, message, contactInfo, uploadedFileUrls)

    if (result.success) {
      alert('지원이 완료되었습니다!')
      resetForm()
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

            {/* File Upload Section */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-3">
                파일 첨부 (선택)
              </label>

              {/* Resume Upload */}
              <div className="mb-4">
                <label className="block text-xs text-gray-600 mb-2">
                  📄 이력서
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => handleFileChange('resume', e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={uploadingFile === 'resume'}
                  />
                  <div className="flex items-center justify-between p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors">
                    <div className="flex items-center space-x-2">
                      <DocumentArrowUpIcon className="h-5 w-5 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {files.resume ? files.resume.name : 'PDF, DOC, DOCX 파일 선택'}
                      </span>
                    </div>
                    {uploadingFile === 'resume' && (
                      <div className="text-xs text-blue-600">업로드 중...</div>
                    )}
                    {files.resume && uploadingFile !== 'resume' && (
                      <button
                        type="button"
                        onClick={() => handleFileChange('resume', null)}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        제거
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Cover Letter Upload */}
              <div className="mb-4">
                <label className="block text-xs text-gray-600 mb-2">
                  📝 자기소개서
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => handleFileChange('coverLetter', e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={uploadingFile === 'coverLetter'}
                  />
                  <div className="flex items-center justify-between p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors">
                    <div className="flex items-center space-x-2">
                      <DocumentArrowUpIcon className="h-5 w-5 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {files.coverLetter ? files.coverLetter.name : 'PDF, DOC, DOCX 파일 선택'}
                      </span>
                    </div>
                    {uploadingFile === 'coverLetter' && (
                      <div className="text-xs text-blue-600">업로드 중...</div>
                    )}
                    {files.coverLetter && uploadingFile !== 'coverLetter' && (
                      <button
                        type="button"
                        onClick={() => handleFileChange('coverLetter', null)}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        제거
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Files Upload */}
              <div className="mb-4">
                <label className="block text-xs text-gray-600 mb-2">
                  📎 추가 파일 (최대 3개)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={(e) => handleAdditionalFileChange(e.target.files)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={uploadingFile === 'additional'}
                  />
                  <div className="flex items-center justify-between p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors">
                    <div className="flex items-center space-x-2">
                      <DocumentArrowUpIcon className="h-5 w-5 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {files.additionalFiles.length > 0
                          ? `${files.additionalFiles.length}개 파일 선택됨`
                          : 'PDF, DOC, DOCX, JPG, PNG 파일 선택'}
                      </span>
                    </div>
                    {uploadingFile === 'additional' && (
                      <div className="text-xs text-blue-600">업로드 중...</div>
                    )}
                  </div>
                </div>
                {files.additionalFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {files.additionalFiles.map((file, index) => (
                      <div key={index} className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                        {file.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-xs text-gray-500 mb-4">
                • 파일 크기는 각각 최대 10MB까지 가능합니다.<br />
                • 이력서/자기소개서: PDF, DOC, DOCX<br />
                • 추가 파일: PDF, DOC, DOCX, JPG, PNG
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
