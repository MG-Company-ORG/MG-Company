# 데이터베이스 마이그레이션 가이드

관리자 회원관리 기능을 완전히 사용하려면 다음 SQL을 Supabase 대시보드에서 실행해야 합니다.

## 1. Supabase 대시보드 접속

1. [Supabase 대시보드](https://app.supabase.com)에 로그인
2. 프로젝트 선택
3. 좌측 메뉴에서 "SQL Editor" 클릭

## 2. 다음 SQL 실행

### 첫 번째 스크립트: profiles 테이블 업데이트

```sql
-- profiles 테이블에 정지 관련 컬럼 추가
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'is_suspended'
    ) THEN
        ALTER TABLE profiles ADD COLUMN is_suspended BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'suspension_reason'
    ) THEN
        ALTER TABLE profiles ADD COLUMN suspension_reason TEXT;
    END IF;
END $$;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_profiles_is_suspended ON profiles(is_suspended);
```

### 두 번째 스크립트: user_suspensions 테이블 생성

```sql
-- user_suspensions 테이블 생성
CREATE TABLE IF NOT EXISTS user_suspensions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  suspended_until TIMESTAMP WITH TIME ZONE,
  is_permanent BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS 활성화
ALTER TABLE user_suspensions ENABLE ROW LEVEL SECURITY;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_suspensions_user_id ON user_suspensions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_suspensions_admin_id ON user_suspensions(admin_id);
CREATE INDEX IF NOT EXISTS idx_user_suspensions_is_active ON user_suspensions(is_active);

-- RLS 정책 생성
CREATE POLICY "Users can view their own suspensions" ON user_suspensions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all suspensions" ON user_suspensions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can create suspensions" ON user_suspensions
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can update suspensions" ON user_suspensions
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
```

### 세 번째 스크립트: notifications 테이블 생성 (선택사항)

```sql
-- notifications 테이블 생성 (알림 기능용)
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('new_application', 'application_status_change', 'system', 'admin')),
  title TEXT NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS 활성화
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- RLS 정책 생성
CREATE POLICY "Users can view their own notifications" ON notifications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON notifications
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all notifications" ON notifications
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
```

## 3. 마이그레이션 완료 확인

마이그레이션 완료 후 관리자 회원관리 페이지에서 다음 기능들이 정상 작동해야 합니다:

- ✅ 사용자 목록 조회
- ✅ 사용자 정지/해제
- ✅ 정지 사유 및 기간 설정
- ✅ 정지 상태 표시

## 주의사항

- 스크립트는 안전하게 설계되어 이미 존재하는 테이블이나 컬럼은 건드리지 않습니다.
- 각 스크립트를 순서대로 실행해주세요.
- 문제가 발생하면 콘솔 로그를 확인해주세요.

## 현재 상태

현재 코드는 다음과 같이 작동합니다:

1. **테이블이 없는 경우**: 기본 사용자 관리 기능만 제공 (정지 기능 비활성화)
2. **테이블이 있는 경우**: 완전한 정지/해제 기능 제공

따라서 마이그레이션을 실행하지 않아도 기본적인 사용자 목록 조회는 가능합니다.
