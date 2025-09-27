"use client";

import { useState, useEffect } from "react";
import { Post, PostStatus } from "@/lib/types/database";
import { supabase } from "@/lib/supabase/client";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface JobPostFormProps {
  post?: Post | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (post: Post) => void;
  userId: string;
}

interface FormData {
  title: string;
  details: string;
  post_date: string;
  pay: string;
  location: string;
  external_link: string;
  application_deadline: string;
  max_applicants: string;
  status: PostStatus;
}

export default function JobPostForm({
  post,
  isOpen,
  onClose,
  onSave,
  userId,
}: JobPostFormProps) {
  const [formData, setFormData] = useState<FormData>({
    title: "",
    details: "",
    post_date: "",
    pay: "",
    location: "",
    external_link: "",
    application_deadline: "",
    max_applicants: "",
    status: "draft",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});

  useEffect(() => {
    if (post) {
      setFormData({
        title: post.title,
        details: post.details,
        post_date: post.post_date,
        pay: post.pay ? post.pay.toString() : "",
        location: post.location || "",
        external_link: post.external_link || "",
        application_deadline: post.application_deadline || "",
        max_applicants: post.max_applicants ? post.max_applicants.toString() : "",
        status: post.status,
      });
    } else {
      setFormData({
        title: "",
        details: "",
        post_date: new Date().toISOString().split("T")[0],
        pay: "",
        location: "",
        external_link: "",
        application_deadline: "",
        max_applicants: "",
        status: "draft",
      });
    }
  }, [post]);

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.title.trim()) {
      newErrors.title = "제목을 입력해주세요.";
    }
    if (!formData.details.trim()) {
      newErrors.details = "상세 내용을 입력해주세요.";
    }
    if (!formData.post_date) {
      newErrors.post_date = "작업일을 선택해주세요.";
    }
    if (formData.pay && isNaN(Number(formData.pay))) {
      newErrors.pay = "급여는 숫자로 입력해주세요.";
    }
    if (formData.max_applicants && isNaN(Number(formData.max_applicants))) {
      newErrors.max_applicants = "최대 지원자 수는 숫자로 입력해주세요.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const postData = {
        title: formData.title.trim(),
        details: formData.details.trim(),
        post_date: formData.post_date,
        pay: formData.pay ? Number(formData.pay) : null,
        location: formData.location.trim() || null,
        external_link: formData.external_link.trim() || null,
        application_deadline: formData.application_deadline || null,
        max_applicants: formData.max_applicants ? Number(formData.max_applicants) : null,
        status: formData.status,
        user_id: userId,
      };

      let result;
      if (post) {
        // Update existing post
        result = await supabase
          .from("posts")
          .update(postData)
          .eq("id", post.id)
          .eq("user_id", userId)
          .select()
          .single();
      } else {
        // Create new post
        result = await supabase
          .from("posts")
          .insert(postData)
          .select()
          .single();
      }

      if (result.error) {
        console.error("Error saving post:", result.error);
        alert("저장 중 오류가 발생했습니다.");
        return;
      }

      onSave(result.data);
      onClose();
      alert(post ? "공고가 수정되었습니다." : "공고가 작성되었습니다.");
    } catch (error) {
      console.error("Error:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              {post ? "공고 수정" : "새 공고 작성"}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={loading}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              제목 *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.title ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="공고 제목을 입력하세요"
              disabled={loading}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          {/* Details */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              상세 내용 *
            </label>
            <textarea
              name="details"
              value={formData.details}
              onChange={handleInputChange}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.details ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="공고의 상세 내용을 입력하세요"
              disabled={loading}
            />
            {errors.details && (
              <p className="mt-1 text-sm text-red-600">{errors.details}</p>
            )}
          </div>

          {/* Post Date and Pay */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                작업일 *
              </label>
              <input
                type="date"
                name="post_date"
                value={formData.post_date}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.post_date ? "border-red-500" : "border-gray-300"
                }`}
                disabled={loading}
              />
              {errors.post_date && (
                <p className="mt-1 text-sm text-red-600">{errors.post_date}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                급여 (원)
              </label>
              <input
                type="number"
                name="pay"
                value={formData.pay}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.pay ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="급여를 입력하세요"
                disabled={loading}
                min="0"
              />
              {errors.pay && (
                <p className="mt-1 text-sm text-red-600">{errors.pay}</p>
              )}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              위치
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="작업 위치를 입력하세요"
              disabled={loading}
            />
          </div>

          {/* External Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              외부 링크
            </label>
            <input
              type="url"
              name="external_link"
              value={formData.external_link}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="관련 웹사이트 링크를 입력하세요"
              disabled={loading}
            />
          </div>

          {/* Application Deadline and Max Applicants */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                지원 마감일
              </label>
              <input
                type="date"
                name="application_deadline"
                value={formData.application_deadline}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                최대 지원자 수
              </label>
              <input
                type="number"
                name="max_applicants"
                value={formData.max_applicants}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.max_applicants ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="최대 지원자 수를 입력하세요"
                disabled={loading}
                min="1"
              />
              {errors.max_applicants && (
                <p className="mt-1 text-sm text-red-600">{errors.max_applicants}</p>
              )}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              공고 상태
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="draft">초안</option>
              <option value="active">활성</option>
              <option value="closed">마감</option>
            </select>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
              disabled={loading}
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "저장 중..." : post ? "수정하기" : "작성하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}