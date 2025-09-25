'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

interface Banner {
  id: number
  image_url: string
  link_url: string
}

export default function Banner() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBanners()
  }, [])

  const fetchBanners = async () => {
    try {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching banners:', error)
      } else {
        setBanners(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6 mt-6">
        <div className="text-center">
          <div className="bg-gray-100 rounded-lg p-8">
            <div className="text-gray-500 text-sm">로딩 중...</div>
          </div>
        </div>
      </div>
    )
  }

  if (banners.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6 mt-6">
        <div className="text-center">
          <div className="bg-gray-100 rounded-lg p-8">
            <div className="text-gray-500 text-sm mb-2">광고 배너 영역</div>
            <div className="text-gray-400 text-xs">
              관리자 패널에서 배너를 설정할 수 있습니다
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-6 space-y-4">
      {banners.map((banner) => (
        <div key={banner.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {banner.link_url ? (
            <a
              href={banner.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block hover:opacity-90 transition-opacity"
            >
              <img
                src={banner.image_url}
                alt="광고 배너"
                className="w-full h-auto"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                  const parent = (e.target as HTMLImageElement).parentElement
                  if (parent) {
                    parent.innerHTML = `
                      <div class="p-8 text-center bg-gray-100">
                        <div class="text-gray-500 text-sm">이미지를 불러올 수 없습니다</div>
                      </div>
                    `
                  }
                }}
              />
            </a>
          ) : (
            <img
              src={banner.image_url}
              alt="광고 배너"
              className="w-full h-auto"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
                const parent = (e.target as HTMLImageElement).parentElement
                if (parent) {
                  parent.innerHTML = `
                    <div class="p-8 text-center bg-gray-100">
                      <div class="text-gray-500 text-sm">이미지를 불러올 수 없습니다</div>
                    </div>
                  `
                }
              }}
            />
          )}
        </div>
      ))}
    </div>
  )
}