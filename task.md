# AutoHub 개발 Checklist (Firebase & Toss Payments)

## [1] Firebase 인프라 및 SDK 설정 (Firebase Setup)
- [ ] Firebase 프로젝트 구성
  - [ ] Firebase Console 프로젝트 생성 및 연동
  - [ ] Firebase CLI 설치 및 초기 설정 (`firebase init`)
  - [ ] 로컬 디버깅용 Firebase Emulator Suite 활성화 (Auth, Firestore, Functions, Storage)
- [ ] 데이터베이스 구성 (Cloud Firestore)
  - [ ] `users` 컬렉션 모델 및 기본 데이터 인서트
  - [ ] `catalog` 컬렉션 기초 데이터(Stitch 리소스 데이터) 마이그레이션
  - [ ] Firestore Security Rules (보안 규칙) 정의 및 테스트
- [ ] 스토리지 구성 (Firebase Storage)
  - [ ] `/products` 폴더 생성 및 실행 파일/PDF 업로드
  - [ ] Storage Security Rules를 통한 비인증 외부 접근 차단 설정

## [2] Firebase Authentication 연동 (Auth)
- [ ] 로그인 / 회원가입 구현
  - [ ] Firebase Auth JS SDK 연동
  - [ ] 이메일/패스워드 기반 가입 및 로그인 화면 연동
  - [ ] JWT 기반 Auth State Listener (`onAuthStateChanged`) 구현
- [ ] 관리자 권한 설정
  - [ ] 특정 관리자 계정에 Custom Claim (`admin: true`) 등록 스크립트 실행
  - [ ] Admin 권한 계정 로그인 시 어드민 메뉴 링크 자동 노출 제어

## [3] 토스페이먼츠 결제 연동 (Toss Payments)
- [ ] 토스페이먼츠 클라이언트 연동
  - [ ] SDK 스크립트 삽입 및 Client API 키 설정
  - [ ] 구매하기 클릭 시 `requestPayment` API 결제위젯 호출 연동
- [ ] 결제 승인 Cloud Functions 개발
  - [ ] `confirmPayment` 함수 개설
  - [ ] 토스페이먼츠 승인 요청 API (`/v1/payments/confirm`) POST 연동
  - [ ] 금액 불일치 및 위변조 방지 사전 검증 로직 구현
  - [ ] 승인 성공 시 Firestore `libraries` 컬렉션에 구매 내역 인서트 로직 작성

## [4] 보안 파일 다운로드 서비스 개발 (Storage Delivery)
- [ ] 파일 임시 다운로드 Functions 개발
  - [ ] `getDownloadUrl` 함수 개설
  - [ ] Firestore `libraries` 테이블에서 해당 유저의 `productId` 권한 소유 유무 조회 로직 작성
  - [ ] 권한 확인 시 Firebase Storage Signed URL (5분 만료) 발급 및 리턴 로직 개발
- [ ] 다운로드 브라우저 통합
  - [ ] My Page 내 Download 클릭 시 Function 호출 및 Blob/Anchor 다운로드 유도 로직 구현

## [5] 관리자 상품 카탈로그 CRUD API 구축 (Admin Functions)
- [ ] 관리자 기능 Cloud Functions 개발
  - [ ] `adminAddProduct`, `adminUpdateProduct`, `adminDeleteProduct` 구현
  - [ ] 요청 유저의 ID 토큰 Custom Claim (`admin == true`) 검증 적용
  - [ ] Firestore `catalog` 및 관련 `libraries` 상품 정보 동기화 업데이트 로직 개발

## [6] 검색엔진 최적화 및 글로벌 지오 타겟팅 (SEO & Geo-targeting)
- [ ] SEO 구조 개선 및 메타 태그 최적화
  - [ ] 상품 상세 페이지(`detail.html`) 로드 시 동적 Open Graph 및 Meta Description 주입 구현
  - [ ] 구글 및 네이버 검색 최적화용 Schema.org JSON-LD 구조 데이터 마크업 삽입
  - [ ] 사이트 맵 `sitemap.xml` 및 크롤링 규칙 정의 `robots.txt` 작성
- [ ] 글로벌 로컬라이제이션(Localization) 및 지오 분기 (Geo)
  - [ ] i18next 또는 Vanilla JS 다국어(ko/en) 팩 구현 및 토글 연동
  - [ ] 검색엔진 대체 주소 명시용 `hreflang` 태그 헤더 삽입
  - [ ] 접속 국가 헤더(GeoIP) 파악을 통한 통화 자동 노출(원화 KRW / 달러 USD) 및 결제창(토스페이먼츠/Stripe) 리다이렉트 분기 로직 개발

