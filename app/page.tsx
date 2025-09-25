import Header from '@/components/Header'
import Calendar from '@/components/Calendar'
import Banner from '@/components/Banner'

export default function Home() {
  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-4 sm:py-8">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            <span className="hidden sm:inline">캘린더 기반 구인구직 플랫폼</span>
            <span className="sm:hidden">구인구직 캘린더</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            <span className="hidden sm:inline">원하는 날짜에 구인/구직 정보를 한눈에 확인하세요</span>
            <span className="sm:hidden">날짜별 구인구직 정보</span>
          </p>
        </div>

        <Calendar />
        <Banner />
      </main>
    </>
  )
}