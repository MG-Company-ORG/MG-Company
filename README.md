# 캘린더 기반 구인구직 플랫폼

Next.js와 Supabase로 구축된 모던한 구인구직 플랫폼입니다. 캘린더 인터페이스를 통해 날짜별 구인/구직 정보를 직관적으로 확인할 수 있습니다.

## 🚀 주요 기능

- **캘린더 기반 UI**: 날짜별 구인/구직 정보를 한눈에 확인
- **실시간 인증**: Supabase Auth를 통한 안전한 사용자 관리
- **반응형 디자인**: 모바일, 태블릿, 데스크톱 모든 환경 지원
- **관리자 패널**: 사용자 및 배너 관리 기능
- **RLS 보안**: Row Level Security로 데이터 보안 강화

## 🛠 기술 스택

- **Frontend**: Next.js 15, React, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Deployment**: Vercel

## 📦 설치 및 실행

### 1. 저장소 클론
```bash
git clone <repository-url>
cd MG-Company
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 환경 변수 설정
`.env.local` 파일을 프로젝트 루트에 생성하고 다음 변수들을 설정하세요:

```env
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 4. 개발 서버 실행
```bash
npm run dev
```

개발 서버가 [http://localhost:3000](http://localhost:3000)에서 실행됩니다.

## 🗄 데이터베이스 스키마

### profiles 테이블
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### posts 테이블
```sql
CREATE TABLE posts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  details TEXT NOT NULL,
  post_date DATE NOT NULL,
  pay BIGINT,
  location TEXT,
  external_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### banners 테이블
```sql
CREATE TABLE banners (
  id BIGSERIAL PRIMARY KEY,
  image_url TEXT NOT NULL,
  link_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

## 🛡 보안 설정

모든 테이블에 Row Level Security (RLS) 정책이 적용되어 있습니다:

- **사용자**: 본인의 게시글만 읽기/쓰기/수정/삭제 가능
- **관리자**: 모든 데이터 접근 가능
- **배너**: 모든 사용자 읽기 가능, 관리자만 관리 가능

## 📱 모바일 최적화

- 반응형 그리드 레이아웃
- 터치 친화적 인터페이스
- 모바일 전용 네비게이션
- 적응형 텍스트 크기

## 🚀 배포

### Vercel 배포
1. Vercel 계정에 GitHub 저장소 연결
2. 환경 변수 설정 (Vercel 대시보드에서)
3. 자동 배포 실행

### 환경 변수 (Vercel)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

## 📁 프로젝트 구조

```
MG-Company/
├── app/                    # Next.js App Router 페이지
│   ├── admin/             # 관리자 페이지
│   ├── login/             # 로그인 페이지
│   ├── signup/            # 회원가입 페이지
│   └── mypage/            # 마이페이지
├── components/            # React 컴포넌트
│   ├── modals/           # 모달 컴포넌트
│   └── ...               # 기타 컴포넌트
├── lib/                   # 유틸리티 및 설정
│   ├── hooks/            # 커스텀 React 훅
│   └── supabase/         # Supabase 클라이언트
└── middleware.ts          # Next.js 미들웨어 (라우트 보호)
```

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 있습니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.