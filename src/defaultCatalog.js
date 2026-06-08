export const DEFAULT_CATALOG = [
  {
    id: "blog-writer",
    title: "블로그 작성 자동화 직원",
    title_en: "AI Blog Writer Employee",
    type: "AI 직원",
    price: 0,
    version: "v2.4.1",
    platform: "Windows, MacOS",
    icon: "edit_note",
    image: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=800&q=80",
    desc: "OpenAI GPT-4 아키텍처 기반으로 주제 하나만 입력하면 제목 선정, 개요 기획, 본문 작성, 퇴고 및 해시태그 추출까지 스스로 처리하는 최고 효율의 마케팅 AI 에이전트입니다.",
    desc_ko: "OpenAI GPT-4 아키텍처 기반으로 주제 하나만 입력하면 제목 선정, 개요 기획, 본문 작성, 퇴고 및 해시태그 추출까지 스스로 처리하는 최고 효율의 마케팅 AI 에이전트입니다.",
    filePath: "products/blog-writer.zip",
    features: [
      "GPT-4 기반 자연어 생성 엔진 탑재",
      "SEO 최적화 키워드 자동 포지셔닝",
      "다양한 문체 필터 (친근형 / 전문형 / 리뷰형)",
      "네이버·구글 검색 노출 최적화",
      "스마트 해시태그 자동 추천",
      "다국어 마케팅 원고 지원 (한국어/영어)"
    ],
    specs: {
      "AI 모델": "GPT-4 Turbo",
      "지원 언어": "한국어, 영어, 일본어",
      "최대 글 분량": "3,000자 이상",
      "생성 속도": "평균 45초",
      "API 연동": "REST API 제공",
      "라이선스": "상업적 이용 가능"
    },
    tags: ["AI 블로그", "마케팅 자동화", "SEO", "콘텐츠 생성", "GPT-4"]
  },
  {
    id: "ai-documenter",
    title: "소스코드 AI 자동 문서화 직원",
    title_en: "AI Source Code Documenter",
    type: "AI 직원",
    price: 99,
    version: "v1.2.0",
    platform: "Cross-platform",
    icon: "description",
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80",
    desc: "업로드한 소스코드 zip 파일을 분석하여 상세 사용 설명서(README.md), 아키텍처 흐름도, 시뮬레이션 캡처 가이드, 사용 매뉴얼을 완전히 자동으로 즉시 작성해 주는 개발 생산성 극대화 에이전트입니다.",
    desc_ko: "업로드한 소스코드 zip 파일을 분석하여 상세 사용 설명서(README.md), 아키텍처 흐름도, 시뮬레이션 캡처 가이드, 사용 매뉴얼을 완전히 자동으로 즉시 작성해 주는 개발 생산성 극대화 에이전트입니다.",
    filePath: "products/ai-documenter.zip",
    features: [
      "ZIP 파일 업로드 후 5초 내 분석 완료",
      "README.md 표준 형식 자동 도출",
      "모듈 간 아키텍처 흐름도 생성",
      "API 엔드포인트 스펙 자동 추출",
      "트러블슈팅 매뉴얼 수록",
      "React, Next.js, FastAPI, Spring Boot 등 주요 프레임워크 완벽 해석"
    ],
    specs: {
      "분석 엔진": "AST 기반 정적 분석",
      "지원 언어": "JavaScript, TypeScript, Python, Go, Java",
      "최대 파일 크기": "50MB",
      "출력 포맷": "Markdown (.md)",
      "보안": "메모리 내 파싱, 데이터 미보관",
      "라이선스": "1년 갱신형"
    },
    tags: ["개발 문서화", "README", "아키텍처", "코드 분석", "생산성"]
  },
  {
    id: "database-backup",
    title: "자동 DB 백업 및 동기화 스크립트",
    title_en: "Auto DB Backup & Sync Script",
    type: "소스코드",
    price: 49,
    version: "v1.0.5",
    platform: "Linux, Windows",
    icon: "database",
    image: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=800&q=80",
    desc: "크론(Cron) 작업으로 매시간 PostgreSQL/MySQL 데이터베이스를 AWS S3 혹은 Firebase Storage로 안전하게 백업 및 동기화해 주는 쉘 스크립트입니다.",
    desc_ko: "크론(Cron) 작업으로 매시간 PostgreSQL/MySQL 데이터베이스를 AWS S3 혹은 Firebase Storage로 안전하게 백업 및 동기화해 주는 쉘 스크립트입니다.",
    filePath: "products/database-backup.zip",
    features: [
      "PostgreSQL / MySQL / MongoDB 전용 덤프 유틸리티",
      "AWS S3 자동 업로드 및 로컬 파일 자동 소거",
      "Slack / Discord 웹훅 알림 연동",
      "멀티파트 분할 전송으로 대용량 DB 지원",
      "safe-dump 파라미터 내장 (서비스 무중단)",
      "크론탭 스케줄러 자동 등록 스크립트 포함"
    ],
    specs: {
      "지원 DB": "PostgreSQL, MySQL, MariaDB, MongoDB",
      "백업 방식": "스트림 압축 (gzip)",
      "스토리지": "AWS S3, GCP, Azure Blob, Firebase",
      "알림": "Slack, Discord Webhook",
      "스케줄러": "Cron Expression",
      "라이선스": "영구 소유"
    },
    tags: ["DB 백업", "인프라", "DevOps", "AWS S3", "자동화"]
  },
  {
    id: "excel-automation",
    title: "엑셀 리포트 자동 생성 도우미",
    title_en: "Excel Report Auto Generator",
    type: "소스코드",
    price: 39,
    version: "v1.1.0",
    platform: "Windows, MacOS",
    icon: "table_chart",
    image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80",
    desc: "원본 CSV/JSON 데이터를 지정된 엑셀 양식에 맞게 자동 정렬하고, 차트 및 피벗 테이블을 포함한 종합 보고서를 한 번의 실행으로 즉시 생성하는 Python 스크립트입니다.",
    desc_ko: "원본 CSV/JSON 데이터를 지정된 엑셀 양식에 맞게 자동 정렬하고, 차트 및 피벗 테이블을 포함한 종합 보고서를 한 번의 실행으로 즉시 생성하는 Python 스크립트입니다.",
    filePath: "products/excel-automation.zip",
    features: [
      "CSV/JSON/TSV 데이터 자동 파싱",
      "사전 정의 엑셀 템플릿 기반 포매팅",
      "차트 및 피벗 테이블 자동 삽입",
      "조건부 서식 및 하이라이팅 지원",
      "멀티 시트 리포트 한 번에 생성",
      "이메일 첨부 자동 발송 옵션"
    ],
    specs: {
      "개발 언어": "Python 3.9+",
      "핵심 라이브러리": "openpyxl, pandas",
      "입력 포맷": "CSV, JSON, TSV",
      "출력 포맷": "XLSX, PDF",
      "처리 속도": "10만 행 기준 8초",
      "라이선스": "영구 소유"
    },
    tags: ["엑셀 자동화", "리포트", "데이터 분석", "Python", "업무 효율"]
  },
  {
    id: "sns-manager",
    title: "SNS 멀티 채널 자동 포스팅 매니저",
    title_en: "SNS Multi-Channel Auto Poster",
    type: "AI 직원",
    price: 149,
    version: "v1.0.0",
    platform: "Cross-platform",
    icon: "share",
    image: "https://images.unsplash.com/photo-1611162616475-46b635cb6868?auto=format&fit=crop&w=800&q=80",
    desc: "인스타그램, 페이스북, X(트위터), 링크드인 등 주요 SNS 채널에 예약 포스팅과 콘텐츠 재가공을 자동으로 수행하는 올인원 소셜 미디어 관리 에이전트입니다.",
    desc_ko: "인스타그램, 페이스북, X(트위터), 링크드인 등 주요 SNS 채널에 예약 포스팅과 콘텐츠 재가공을 자동으로 수행하는 올인원 소셜 미디어 관리 에이전트입니다.",
    filePath: "products/sns-manager.zip",
    features: [
      "4대 SNS 플랫폼 동시 포스팅",
      "이미지 자동 리사이징 및 크롭",
      "최적 시간대 예약 발행",
      "해시태그 트렌드 분석 및 추천",
      "인게이지먼트 분석 대시보드",
      "AI 캡션 자동 생성"
    ],
    specs: {
      "지원 플랫폼": "Instagram, Facebook, X, LinkedIn",
      "스케줄링": "크론 기반 예약 발행",
      "이미지 처리": "Sharp.js 자동 최적화",
      "분석": "일별/주별 인게이지먼트 리포트",
      "API": "각 플랫폼 공식 API 연동",
      "라이선스": "월 구독형"
    },
    tags: ["SNS 관리", "소셜미디어", "마케팅", "예약 포스팅", "인스타그램"]
  },
  {
    id: "cloud-monitor",
    title: "클라우드 인프라 실시간 모니터링 대시보드",
    title_en: "Cloud Infrastructure Monitor Dashboard",
    type: "소스코드",
    price: 79,
    version: "v2.0.3",
    platform: "Cross-platform",
    icon: "monitoring",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
    desc: "AWS, GCP, Azure 등 멀티 클라우드 환경의 서버 상태, CPU/메모리 사용률, 네트워크 트래픽을 실시간으로 모니터링하는 React 기반 대시보드 소스코드입니다.",
    desc_ko: "AWS, GCP, Azure 등 멀티 클라우드 환경의 서버 상태, CPU/메모리 사용률, 네트워크 트래픽을 실시간으로 모니터링하는 React 기반 대시보드 소스코드입니다.",
    filePath: "products/cloud-monitor.zip",
    features: [
      "멀티 클라우드 통합 대시보드",
      "실시간 CPU/메모리/디스크 모니터링",
      "네트워크 트래픽 시각화 차트",
      "임계값 초과 시 알림 발송",
      "서버 헬스체크 자동 핑",
      "반응형 모바일 대시보드 UI"
    ],
    specs: {
      "프론트엔드": "React 18 + Recharts",
      "백엔드": "Node.js + WebSocket",
      "지원 클라우드": "AWS, GCP, Azure",
      "데이터 갱신": "5초 주기 실시간",
      "알림": "이메일, Slack, PagerDuty",
      "라이선스": "영구 소유"
    },
    tags: ["모니터링", "클라우드", "DevOps", "대시보드", "인프라 관리"]
  }
];
