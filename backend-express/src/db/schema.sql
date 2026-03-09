-- Phase 2: 교사 + 세션 스키마

-- 1. 교사 계정
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 세션 설정
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,

  -- 기본 정보
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- 인터뷰 설정
  topic_count INT DEFAULT 3 CHECK (topic_count BETWEEN 1 AND 5),
  topic_duration INT DEFAULT 180 CHECK (topic_duration BETWEEN 60 AND 600),
  interview_mode VARCHAR(20) DEFAULT 'student_choice'
    CHECK (interview_mode IN ('voice', 'chat', 'student_choice')),

  -- 접속 코드 (활성화 시 생성)
  access_code VARCHAR(6) UNIQUE,

  -- 상태
  status VARCHAR(20) DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'closed')),

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_sessions_teacher ON sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_sessions_access_code ON sessions(access_code) WHERE access_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

-- Access Code 생성 함수
CREATE OR REPLACE FUNCTION generate_access_code()
RETURNS VARCHAR(6) AS $$
DECLARE
  code VARCHAR(6);
  exists_count INT;
BEGIN
  LOOP
    code := upper(substring(md5(random()::text) from 1 for 6));
    SELECT COUNT(*) INTO exists_count FROM sessions WHERE access_code = code;
    EXIT WHEN exists_count = 0;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Phase 3: 인터뷰 결과 저장

-- 인터뷰 결과 테이블
CREATE TABLE IF NOT EXISTS interview_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,

  -- 학생 정보
  student_name VARCHAR(100) NOT NULL,
  student_id VARCHAR(50),

  -- 인터뷰 데이터
  interview_mode VARCHAR(20) NOT NULL CHECK (interview_mode IN ('voice', 'chat')),
  topics_data JSONB NOT NULL,
  summary JSONB,

  -- 메타데이터
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  total_time_used INT,
  total_turns INT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_results_session ON interview_results(session_id);
CREATE INDEX IF NOT EXISTS idx_results_completed ON interview_results(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_results_student ON interview_results(student_name);

-- 세션별 결과 통계 뷰
CREATE OR REPLACE VIEW session_result_stats AS
SELECT
  s.id AS session_id,
  s.title AS session_title,
  COUNT(r.id) AS result_count,
  AVG(r.total_time_used) AS avg_time_used,
  AVG(r.total_turns) AS avg_turns,
  MIN(r.completed_at) AS first_result_at,
  MAX(r.completed_at) AS last_result_at
FROM sessions s
LEFT JOIN interview_results r ON s.id = r.session_id
GROUP BY s.id, s.title;
