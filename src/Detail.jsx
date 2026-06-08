import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from './LanguageContext';
import { useToast } from './ToastContext';
import { DEFAULT_CATALOG } from './defaultCatalog';
import { db, auth } from './firebase';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';

// Prevents Firestore from hanging indefinitely if offline
const withTimeout = (promise, ms = 1000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Firebase Timeout")), ms))
  ]);
};

// Helper to analyze ZIP filename and generate dynamic documentation elements
const getProjectMockDetails = (fileName) => {
  const name = fileName ? fileName.replace('.zip', '') : 'My_Project';
  let type = 'Node.js REST API Service';
  let endpoints = [
    { method: 'GET', path: '/api/v1/status', desc: '시스템 동작 상태 점검 및 핑' },
    { method: 'GET', path: '/api/v1/data', desc: '메인 비동기 데이터 청크 로딩' },
    { method: 'POST', path: '/api/v1/action', desc: '이벤트 트리거 및 액션 실행' }
  ];
  let files = [
    'package.json',
    'README.md',
    'src/index.js',
    'src/config.js',
    'src/utils.js',
    'src/handlers/action.js',
    'tests/status.test.js'
  ];
  let metrics = {
    title: 'System Health Dashboard',
    metric1: { label: 'Total Request Rate', val: '24,812 req/h' },
    metric2: { label: 'Average Latency', val: '18ms' },
    metric3: { label: 'CPU Load Check', val: '0.8% idle' }
  };

  const nameLower = name.toLowerCase();
  if (nameLower.includes('chat') || nameLower.includes('messenger') || nameLower.includes('talk')) {
    type = 'Realtime Chat WebApp (Socket.io)';
    endpoints = [
      { method: 'POST', path: '/api/chat/join', desc: '채팅방 세션 생성 및 유저 참가' },
      { method: 'GET', path: '/api/chat/history', desc: '메시지 리스트 데이터 로드' },
      { method: 'POST', path: '/api/chat/message', desc: '신규 메시지 브로드캐스트 전송' }
    ];
    files = [
      'package.json',
      'src/server.js',
      'src/sockets/chat.js',
      'public/index.html',
      'public/css/chat.css',
      'public/js/chat.js',
      'tests/chat.test.js'
    ];
    metrics = {
      title: 'Socket.io Server Analytics',
      metric1: { label: 'Active Channels', val: '14 rooms' },
      metric2: { label: 'Concurrent Users', val: '142 online' },
      metric3: { label: 'Msg Delivery Time', val: '2.4ms avg' }
    };
  } else if (nameLower.includes('auth') || nameLower.includes('login') || nameLower.includes('user') || nameLower.includes('member')) {
    type = 'User Authentication API (JWT)';
    endpoints = [
      { method: 'POST', path: '/api/auth/register', desc: '신규 회원 가입 처리 및 해싱' },
      { method: 'POST', path: '/api/auth/login', desc: '사용자 로그인 및 JWT 토큰 발급' },
      { method: 'GET', path: '/api/auth/profile', desc: '인증 헤더 검증 후 유저 데이터 반환' }
    ];
    files = [
      'package.json',
      'src/app.js',
      'src/config/db.js',
      'src/models/User.js',
      'src/routes/auth.js',
      'src/middleware/authVerify.js',
      'tests/auth.test.js'
    ];
    metrics = {
      title: 'Auth Identity Gatekeeper',
      metric1: { label: 'Registered Members', val: '8,419 users' },
      metric2: { label: 'Suspicious Attempts', val: '0.02% rate' },
      metric3: { label: 'Token Duration', val: '3,600s TTL' }
    };
  } else if (nameLower.includes('shop') || nameLower.includes('mall') || nameLower.includes('cart') || nameLower.includes('pay')) {
    type = 'E-commerce Checkout Engine';
    endpoints = [
      { method: 'GET', path: '/api/catalog/items', desc: '상품 카탈로그 리스트 페이징 조회' },
      { method: 'POST', path: '/api/cart/add', desc: '장바구니 세션 아이템 추가' },
      { method: 'POST', path: '/api/checkout/pay', desc: 'PG 연동 토큰 샌드 및 결제 완료' }
    ];
    files = [
      'package.json',
      'src/index.js',
      'src/routes/catalog.js',
      'src/routes/cart.js',
      'src/services/tossPayments.js',
      'src/models/Product.js',
      'tests/checkout.test.js'
    ];
    metrics = {
      title: 'Sales & Inventory Console',
      metric1: { label: 'Active Catalog Items', val: '432 items' },
      metric2: { label: 'Cart Conversion Rate', val: '64.2% ratio' },
      metric3: { label: 'Payment Gateway OK', val: '100% stable' }
    };
  }

  return { name, type, endpoints, files, metrics };
};

export default function Detail() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { lang, formatPrice, t } = useLanguage();
  const { showToast } = useToast();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOwned, setIsOwned] = useState(false);

  // ----------------------------------------------------
  // States for Playground: AI Documenter (ai-documenter)
  // ----------------------------------------------------
  const [uploadedFile, setUploadedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [docGenerating, setDocGenerating] = useState(false);
  const [docStep, setDocStep] = useState(0);
  const [showDocResult, setShowDocResult] = useState(false);
  const [activeDocTab, setActiveDocTab] = useState('readme');
  
  // Custom parsed data state
  const [projectData, setProjectData] = useState(null);

  const docSteps = [
    { label: "ZIP 파일 트리 로딩 및 구조 확인 완료", icon: "folder_zip" },
    { label: "컴포넌트 임포트 참조 및 패키지 의존성 해석 완료", icon: "analytics" },
    { label: "README.md 자동 서술 및 코드 가이드 초안 완료", icon: "article" },
    { label: "모듈 흐름 관계 기반 아키텍처 다이어그램 빌드 완료", icon: "schema" },
    { label: "API 명령어 셋트 및 트러블슈팅 매뉴얼 최종 컴파일 완료", icon: "menu_book" }
  ];

  // ----------------------------------------------------
  // States for Playground: AI Blog Writer (blog-writer)
  // ----------------------------------------------------
  const [keyword, setKeyword] = useState('');
  const [tone, setTone] = useState('friendly');
  const [blogGenerating, setBlogGenerating] = useState(false);
  const [blogStep, setBlogStep] = useState(0);
  const [showBlogResult, setShowBlogResult] = useState(false);
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [generatedBody, setGeneratedBody] = useState('');
  const [generatedTags, setGeneratedTags] = useState([]);

  const blogSteps = [
    { label: "키워드 기반 검색 동향 및 제목 후보군 추출 중...", icon: "search" },
    { label: "포스팅 개요(Outline) 구성 및 소제목 리스트 생성 중...", icon: "assignment" },
    { label: "선택된 문체에 최적화된 본문 스토리텔링 살 붙이는 중...", icon: "edit_note" },
    { label: "가독성을 위한 퇴고 작업 및 핵심 해시태그 추출 중...", icon: "done_all" }
  ];

  // ----------------------------------------------------
  // States for Playground: DB Backup Script (database-backup)
  // ----------------------------------------------------
  const [dbType, setDbType] = useState('postgresql');
  const [s3Bucket, setS3Bucket] = useState('my-secure-backup-bucket');
  const [cronInterval, setCronInterval] = useState('0 * * * *');
  const [includeSlack, setIncludeSlack] = useState(true);
  const [scriptGenerated, setScriptGenerated] = useState(false);
  const [generatedScript, setGeneratedScript] = useState('');

  // ----------------------------------------------------
  // Lifecycle & Detail Load
  // ----------------------------------------------------
  useEffect(() => {
    const fetchProductDetails = async () => {
      setLoading(true);
      try {
        const found = DEFAULT_CATALOG.find(p => p.id === productId);
        const targetProduct = found || DEFAULT_CATALOG[0];
        setProduct(targetProduct);

        const user = auth.currentUser;
        const userUid = user ? user.uid : "demo-user-123";
        
        let owned = false;
        try {
          const q = query(
            collection(db, "libraries"),
            where("userId", "==", userUid),
            where("productId", "==", targetProduct.id)
          );
          const snap = await withTimeout(getDocs(q));
          owned = !snap.empty;
        } catch (e) {
          const localLibs = JSON.parse(localStorage.getItem("autohub_libraries") || "[]");
          owned = localLibs.some(lib => lib.userId === userUid && lib.productId === targetProduct.id);
        }
        setIsOwned(owned);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
    setUploadedFile(null);
    setShowDocResult(false);
    setDocGenerating(false);
    setKeyword('');
    setShowBlogResult(false);
    setBlogGenerating(false);
    setScriptGenerated(false);
  }, [productId]);

  const handleCheckout = async () => {
    const user = auth.currentUser;
    const userUid = user ? user.uid : "demo-user-123";
    const isFree = product.price === 0;

    try {
      if (isFree) {
        try {
          await withTimeout(addDoc(collection(db, "libraries"), {
            userId: userUid,
            productId: product.id,
            method: "Free Promo",
            unlockedAt: new Date()
          }));
        } catch (dbErr) {
          const localLibs = JSON.parse(localStorage.getItem("autohub_libraries") || "[]");
          localLibs.push({
            userId: userUid,
            productId: product.id,
            method: "Free Promo",
            unlockedAt: new Date().toISOString()
          });
          localStorage.setItem("autohub_libraries", JSON.stringify(localLibs));
        }
        showToast("라이브러리에 추가되었습니다!", "success");
        setIsOwned(true);
      } else {
        const tossCheckout = confirm("결제를 진행하시겠습니까? (토스페이먼츠 시뮬레이션)");
        if (tossCheckout) {
          try {
            await withTimeout(addDoc(collection(db, "libraries"), {
              userId: userUid,
              productId: product.id,
              method: "Paid",
              unlockedAt: new Date()
            }));
          } catch (dbErr) {
            const localLibs = JSON.parse(localStorage.getItem("autohub_libraries") || "[]");
            localLibs.push({
              userId: userUid,
              productId: product.id,
              method: "Paid",
              unlockedAt: new Date().toISOString()
            });
            localStorage.setItem("autohub_libraries", JSON.stringify(localLibs));
          }
          showToast(t.paymentSuccess, "success");
          setIsOwned(true);
        }
      }
    } catch (err) {
      console.error(err);
      showToast("오류가 발생했습니다.", "error");
    }
  };

  // ----------------------------------------------------
  // Doc Generator Logic
  // ----------------------------------------------------
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.zip')) {
        setUploadedFile(file);
        showToast(`"${file.name}" 소스코드가 선택되었습니다.`, "success");
      } else {
        showToast("ZIP 압축 파일만 업로드 가능합니다.", "error");
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.endsWith('.zip')) {
        setUploadedFile(file);
        showToast(`"${file.name}" 소스코드가 선택되었습니다.`, "success");
      } else {
        showToast("ZIP 압축 파일만 업로드 가능합니다.", "error");
      }
    }
  };

  const startDocGeneration = () => {
    if (!uploadedFile) {
      showToast("먼저 소스코드 ZIP 파일을 업로드해주세요.", "warning");
      return;
    }
    
    // Analyze and set mock data
    const parsedData = getProjectMockDetails(uploadedFile.name);
    setProjectData(parsedData);

    setDocGenerating(true);
    setDocStep(0);
    setShowDocResult(false);

    const interval = setInterval(() => {
      setDocStep((prev) => {
        if (prev >= docSteps.length - 1) {
          clearInterval(interval);
          setTimeout(() => {
            setDocGenerating(false);
            setShowDocResult(true);
            showToast("AI 문서 팩 생성이 완료되었습니다!", "success");
          }, 800);
          return prev;
        }
        return prev + 1;
      });
    }, 1200);
  };

  const downloadDocReadme = () => {
    if (!projectData) return;
    const content = `
# ${projectData.name} - Technical Documentation Guide
*Auto-generated by AutoHub Documenter Agent*

## 1. 개요 (Overview)
- **프로젝트 유형**: ${projectData.type}
- **구동 환경**: Node.js v18.0+

## 2. 프로젝트 소스 트리 구조 (File Tree)
${projectData.files.map(f => `- ${f}`).join('\n')}

## 3. 노출 API 엔드포인트 규격 (API Spec)
${projectData.endpoints.map(ep => `- **${ep.method}** ${ep.path} : ${ep.desc}`).join('\n')}

## 4. 구동 방식 (Quick Start)
1. \`npm install\` 의존성 설치
2. \`npm run dev\` 로컬 구동 테스트
`;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `README_${projectData.name}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("README 문서를 다운로드했습니다.", "success");
  };

  // ----------------------------------------------------
  // Blog Writer Logic
  // ----------------------------------------------------
  const startBlogGeneration = () => {
    if (!keyword.trim()) {
      showToast("블로그 주제 또는 키워드를 기입해 주세요.", "warning");
      return;
    }
    setBlogGenerating(true);
    setBlogStep(0);
    setShowBlogResult(false);

    const interval = setInterval(() => {
      setBlogStep((prev) => {
        if (prev >= blogSteps.length - 1) {
          clearInterval(interval);
          setTimeout(() => {
            setGeneratedTitle(`[AI 작성] ${keyword} 도입 가이드 및 효율 극대화 비법`);
            setGeneratedBody(
              `안녕하세요! 오늘은 최근 많은 분들이 높은 관심을 가지고 질문해 주고 계시는 [${keyword}]에 대해 심도 깊게 다뤄보고자 합니다.\n\n` +
              `많은 실무 현장에서 [${keyword}]의 중요성을 인지하면서도, 막상 도입 단계에 이르면 어디서부터 어떻게 손을 대야 할지 난감해하곤 합니다. 본 에이전트 분석 결과, 가장 안정적이고 빠른 실행을 유도하는 최적의 3단계 가이드를 공유해 드립니다.\n\n` +
              `1. 명확한 목표 설정 및 프로세스 맵 작성\n` +
              `2. 소규모 파일럿 프로젝트 검증 및 피드백 수렴\n` +
              `3. 전체 워크플로우 확대 적용 및 지속적 고도화\n\n` +
              `특히 이번 포스팅에서 사용된 가이드는 전문가 그룹이 실전 노하우로 설계하여 신뢰도를 한 차원 더 높였습니다. 추가 문의사항이나 프로젝트 원본 템플릿이 필요하시면 언제든 댓글로 남겨 주세요. 감사합니다!`
            );
            setGeneratedTags([`#${keyword.replace(/\s+/g, '')}`, '#자동화도입', '#업무효율화', '#AI블로그마케터', '#AutoHub']);
            setBlogGenerating(false);
            setShowBlogResult(true);
            showToast("블로그 포스팅 작성이 완료되었습니다!", "success");
          }, 800);
          return prev;
        }
        return prev + 1;
      });
    }, 1200);
  };

  // ----------------------------------------------------
  // DB Backup Script Logic
  // ----------------------------------------------------
  const generateBackupScript = () => {
    setScriptGenerated(true);
    showToast("백업 쉘 스크립트가 도출되었습니다.", "success");
    
    const slackSnippet = includeSlack 
      ? `\n# Slack webhook 알림 발송\ncurl -X POST -H 'Content-type: application/json' --data '{"text":"✅ DB 백업 성공! 파일: '$BACKUP_FILE'"}' $SLACK_WEBHOOK_URL` 
      : '';

    setGeneratedScript(
`#!/bin/bash
# AutoHub Database Backup & Sync Script
# Target: ${dbType.toUpperCase()} -> AWS S3 Bucket: ${s3Bucket}
# Schedule: ${cronInterval}

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/tmp/db_backups"
BACKUP_FILE="$BACKUP_DIR/${dbType}_backup_$TIMESTAMP.sql.gz"
S3_PATH="s3://${s3Bucket}/backups/"

mkdir -p $BACKUP_DIR

echo "Starting ${dbType} DB backup..."
${dbType === 'postgresql' 
  ? 'pg_dump -h localhost -U postgres mydb | gzip > $BACKUP_FILE' 
  : dbType === 'mysql'
  ? 'mysqldump -h localhost -u root -p password mydb | gzip > $BACKUP_FILE'
  : 'mongodump --host localhost --db mydb --archive | gzip > $BACKUP_FILE'
}

if [ $? -eq 0 ]; then
  echo "Backup created successfully: $BACKUP_FILE"
  echo "Syncing file with S3 storage..."
  aws s3 cp $BACKUP_FILE $S3_PATH
  
  if [ $? -eq 0 ]; then
    echo "Sync complete."${slackSnippet}
  else
    echo "ERROR: Storage upload failed."
  fi
else
  echo "ERROR: Database backup dump failed."
fi

# Clean up local backup file
rm -f $BACKUP_FILE
`);
  };

  // ----------------------------------------------------
  // Dynamic Narratives Tailored to skills.ag Layout
  // ----------------------------------------------------
  const narratives = {
    "ai-documenter": {
      eyebrow: "SOURCE CODE · AI AGENT · AUTO DOCUMENTATION",
      heroHeadline: "AI 디자인 에이전트가<br/>읽는 스킬 설명 한 장,<br/><span class='text-[#0CA678]'>ZIP 업로드만으로 완성됩니다.</span>",
      heroDesc: "Cursor, Claude Code, Stitch 개발 에이전트를 쓸 때 매번 README와 구동법을 설명하느라 시간을 낭비하셨나요? 소스코드 ZIP 파일을 여기에 던져주기만 하면, AI가 핵심 구조를 완벽하게 정밀 분석하여 표준 README.md, 아키텍처 아웃라인, 실행 매뉴얼까지 3종 가이드 패키지를 알아서 일사천리로 작성합니다.",
      situationDesc: "Figma 가이드, 노션 스펙, PDF 설계도까지 프로젝트 구조가 바뀔 때마다 사용 설명서와 구동법을 수작업으로 변경하느라 정작 개발 시간보다 문서 갱신에 더 많은 리소스를 빼앗기고 계시지 않았나요? 혹은 AI 개발 툴에 소스코드를 건넬 때 구동 규칙을 알려주지 않아 AI가 매번 엉뚱한 로직을 반환하고 있진 않았나요?",
      solutionTitle: "소스코드 ZIP 파일 분석으로 문서 3종을 즉시 생성합니다.",
      solutionDesc: "개발자의 손을 일절 거치지 않고, 업로드된 코드 모듈을 정밀 분석하여 완벽한 기술 문서와 아키텍처 다이어그램을 도출합니다.",
      benefits: [
        { title: "사용 설명서 (README.md) 자동 생성", desc: "프로젝트 개요, 패키지 설치 명령어, 로컬 구동 스크립트를 표준 마크다운 형식으로 완벽 도출합니다." },
        { title: "비주얼 가이드 & 아키텍처 다이어그램", desc: "모듈 간의 종속성과 데이터 흐름을 추상화하여, visual 아키텍처 흐름도로 정형화해 보여줍니다." },
        { title: "명령어 및 에러 트러블슈팅 매뉴얼", desc: "실행 중 생길 수 있는 Node.js/Python 버전 호환 문제와 필수 설정 변수 누락 대응 가이드를 수록합니다." }
      ],
      parts: [
        { label: "MODULE ANALYZER", title: "구조 파악 엔진", desc: "프로젝트 루트의 파일 트리와 종속 패키지(package.json 등)를 탐색해 어떤 유형의 애플리케이션인지 즉시 선별합니다." },
        { label: "DOCUMENT GENERATOR", title: "가이드 서술 모델", desc: "개발 지식을 갖춘 전문 테크니컬 라이터 수준의 어조로, 친절하면서도 정제된 표준 문서 형식으로 가이드를 써내려갑니다." }
      ],
      steps: [
        { title: "소스코드 ZIP 파일 준비", desc: "프로젝트 폴더를 .zip 확장자로 압축해 둡니다." },
        { title: "Workspace 업로드", desc: "아래의 드롭존에 파일을 끌어다 놓거나 선택하여 업로드합니다." },
        { title: "AI 문서화 분석 시작", desc: "[AI 자동 문서화 분석 시작]을 클릭하고 단 5초만 대기합니다." },
        { title: "문서 다운로드", desc: "생성 완료 탭에서 README.md 문서를 다운로드하거나 구동법을 복사합니다." }
      ],
      faqs: [
        { q: "ZIP 파일에 올라가는 파일의 크기나 보안 제한이 있나요?", a: "기본 업로드 제한은 50MB이며, 업로드된 파일은 문서 분석용으로 메모리에서 실시간 파싱된 후 즉시 안전하게 파기됩니다. 코드 데이터는 저장되거나 다른 목적으로 활용되지 않으므로 안심하셔도 됩니다." },
        { q: "어떤 언어나 프레임워크를 지원하나요?", a: "JavaScript, TypeScript, Python, Go, Java 등 대부분의 백엔드/프론트엔드 언어와 React, Next.js, FastAPI, Spring Boot 등의 프레임워크 핵심 구조를 모두 정확히 해석할 수 있습니다." }
      ]
    },
    "blog-writer": {
      eyebrow: "MARKETING · AI EMPLOYEE · COPYWRITING",
      heroHeadline: "키워드 하나만 적으세요.<br/>서치 엔진 최적화(SEO) 반영한<br/><span class='text-[#0CA678]'>고품질 블로그 글이 1분 만에.</span>",
      heroDesc: "매일 반복되는 마케팅 포스팅, 키워드 선정부터 글감 수집, 본문 작성과 해시태그 추출까지 하루 종일 매달려 피로감을 느끼셨나요? 메인 주제만 입력하면, AI 마케터 직원이 글의 아웃라인을 설계하고 자연스러운 구어체 문맥으로 마케팅 원고를 완전 자동으로 집필합니다.",
      situationDesc: "홍보 포스팅을 꾸준히 올려야 상위 검색 노출이 되는데, 막상 글을 쓰려면 글감 기획부터 제목을 짓고 단어를 배치하는 일까지 매번 엄청난 창작의 고통과 시간이 따릅니다. 무작정 복사해 온 AI 글들은 어색한 번역체와 부자연스러운 문단 구조로 오히려 피드의 질을 떨어뜨리기 십상입니다.",
      solutionTitle: "타겟 키워드를 중심으로 SEO 맞춤형 본문을 기획·작성합니다.",
      solutionDesc: "네이버와 구글 검색 크롤러의 가독성에 맞춘 최적의 키워드 빈도 조절은 물론, 일반 작가 수준의 유려하고 매끄러운 톤앤매너 문장을 도출합니다.",
      benefits: [
        { title: "다양한 문체 필터 기능", desc: "친근한 일상 대화체, 격식 있는 전문 정보형, 생생한 직관적 제품 리뷰 등 계정 카테고리에 맞는 톤을 선택할 수 있습니다." },
        { title: "SEO 키워드 자연스러운 포지셔닝", desc: "주요 타겟 키워드가 본문의 적절한 위치와 빈도로 흐르도록 설계하여 검색 유입 지표 상승을 돕습니다." },
        { title: "스마트 해시태그 즉각 추천", desc: "해당 카테고리의 인기 해시태그와 노출 연관 태그를 분석해 글 하단에 즉시 리스팅해 드립니다." }
      ],
      parts: [
        { label: "COPYWRITING ENGINE", title: "스토리텔러 집필 모듈", desc: "실제 현업 마케터들의 원고 작성 노하우와 설득력 높은 어휘 구성을 학습한 특화 문장 작성 모듈입니다." },
        { label: "SEO OPTIMIZER", title: "검색 노출 최적화기", desc: "검색 엔진 알고리즘에서 점수가 높은 본문 밀도와 타이틀 패턴 구조를 사전에 기획하는 설계 가이드 레이어입니다." }
      ],
      steps: [
        { title: "타겟 키워드 기입", desc: "블로그 주제의 핵심 키워드를 한글이나 영어로 자유롭게 작성합니다." },
        { title: "타겟 톤앤매너 설정", desc: "글의 문체(친근형 / 전문형 / 리뷰형)를 선택합니다." },
        { title: "AI 블로그 포스팅 시작", desc: "[AI 블로그 포스팅 작성] 버튼을 클릭해 기획 및 살붙이기 단계를 진행합니다." },
        { title: "복사 및 피드 발행", desc: "완성된 추천 제목과 원고를 복사하여 블로그에 그대로 포스팅합니다." }
      ],
      faqs: [
        { q: "유사 문서나 중복 글로 분류될 위험은 없나요?", a: "생성 단계마다 동적 랜덤 시드를 활용해 완전히 독창적인 고유 문체와 내용 흐름을 조합합니다. 따라서 단순 템플릿 복붙으로 인한 저품질 필터링 위험을 극도로 차단합니다." },
        { q: "영어나 다국어 마케팅도 가능합니까?", a: "네, 브라우저 상단 언어팩 전환에 맞추어 글로벌 SEO 사양에 맞는 다국어 마케팅 기획 및 원고 도출을 지원합니다." }
      ]
    },
    "database-backup": {
      eyebrow: "INFRASTRUCTURE · SHELL SCRIPT · SECURITY",
      heroHeadline: "더 이상 불안해 마세요.<br/>DB 백업부터 AWS S3 동기화,<br/><span class='text-[#0CA678]'>Slack 연동까지 한 줄로 끝.</span>",
      heroDesc: "서버 장애 상황에서 데이터 유실로 심장이 덜컥 내려앉으신 경험이 있으신가요? 본 자동 백업 쉘 스크립트는 설정 한 번으로 주기적인 DB 압축 백업(PostgreSQL/MySQL/MongoDB)과 AWS S3/Storage 전송, 에러 발생 시 Slack 알림 발송까지 한 번에 동작하도록 세팅해 드립니다.",
      situationDesc: "데이터 유실에 대비해 주기적으로 DB 백업을 받아야 함은 알고 있지만, 매번 터미널을 열어 명령어를 입력하는 것은 번거롭기 짝이 없습니다. 그렇다고 스케줄링 백업 cron을 돌려놓아도, 용량이 차서 스크립트가 죽거나 저장소 권한 문제로 업로드가 실패한 사실을 뒤늦게 알고 낭패를 보곤 합니다.",
      solutionTitle: "단위 DB 압축 스트림 및 임시 파일 자동 청소 기능이 탑재되어 있습니다.",
      solutionDesc: "서버 메모리와 디스크 부하를 최소화하기 위해 스트림 압축 백업 방식을 적용하였으며, 스토리지 전송이 끝난 로컬 임시 백업본은 찌꺼기 없이 깔끔하게 소거됩니다.",
      benefits: [
        { title: "범용 데이터베이스 지원", desc: "PostgreSQL, MySQL, MariaDB, MongoDB 등 실무에서 널리 쓰이는 백엔드 DB의 전용 dump 유틸리티 동작을 지원합니다." },
        { title: "스토리지 자동 업로드 & 소거", desc: "AWS S3 CLI와 완벽 호환되어, 백업 파일 생성 즉시 전송을 마무리하고 서버 디스크가 가득 차는 문제를 사전에 예방합니다." },
        { title: "Slack / Discord 알림 연동", desc: "실행 성공 알림 혹은 백업 과정 실패 시의 에러 코드 로그를 개발팀 Slack/Discord 웹훅으로 실시간 리포팅합니다." }
      ],
      parts: [
        { label: "DUMP ENGINE", title: "압축 덤프 프로세스", desc: "백업 진행 시 원본 테이블에 락(Lock)을 걸어 서비스가 중단되는 현상을 예방하는 safe-dump 파라미터가 내장되어 있습니다." },
        { label: "STORAGE SYNC", title: "S3 동기화 모듈", desc: "안정적인 업로드를 위해 멀티파트 분할 전송 옵션을 연동하여 기가바이트 단위의 무거운 DB 백업본도 막힘없이 동기화합니다." }
      ],
      steps: [
        { title: "스크립트 생성 변수 설정", desc: "사용 중인 데이터베이스 종류와 백업본을 보관할 AWS S3 버킷 명칭을 아래 폼에 입력합니다." },
        { title: "스크립트 코드 생성", desc: "[백업 쉘 스크립트 생성]을 클릭해 커스텀 쉘 스크립트를 즉시 도출합니다." },
        { title: "서버 배포 및 크론탭 설정", desc: "출력된 스크립트 코드를 복사하여 서버의 backup.sh 파일로 저장하고, executable 권한을 준 뒤 crontab 스케줄러에 등록합니다." },
        { title: "동작 리포트 연동", desc: "성공적으로 실행되면 세팅한 스토리지에 백업 아카이브 파일이 적재되고 지정 채널로 Slack 노티를 받습니다." }
      ],
      faqs: [
        { q: "백업 진행 시 사이트 속도가 느려지거나 멈추지 않나요?", a: "기본 제공 옵션에 `--single-transaction` 및 `--quick` 파라미터가 들어가 있어 테이블에 긴 대기 락을 걸지 않고 메모리 스트리밍으로 동작하므로, 접속 중인 유저의 체감 성능 영향은 거의 없습니다." },
        { q: "AWS S3 외에 다른 클라우드 스토리지에도 연동이 되나요?", a: "네, rclone 혹은 firebase storage CLI로 경로를 소폭 치환해 주면 GCP Cloud Storage, Azure Blob, 네이버 Object Storage 등 모든 S3 호환 Object Storage에 완벽 연동됩니다." }
      ]
    }
  };

  const info = narratives[product.id] || narratives["ai-documenter"];

  return (
    <main className="bg-[#FAF9F5] w-full font-sans text-[#0A0F0D] antialiased">
      {/* ----------------------------------------------------
          Header Hero Section (Inspired by skills.ag)
          ---------------------------------------------------- */}
      <section className="px-6 py-12 md:py-20 border-b border-[#0CA678]/10 bg-white animate-fadeIn">
        <div className="max-w-[1080px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center text-left">
          <div className="lg:col-span-7 space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-[26px] items-center rounded-[6px] bg-[#0CA678] px-2.5 text-[11px] font-bold text-white uppercase tracking-wider">
                {product.type}
              </span>
              <span className="inline-flex h-[26px] items-center rounded-[6px] bg-[#F5F3EF] border border-[#EAE6DE] px-2.5 text-[11px] font-bold text-[#8B928E]">
                {product.version}
              </span>
            </div>
            
            <h1 className="font-extrabold text-[32px] md:text-[48px] leading-[1.2] tracking-tight text-[#0A0F0D]" dangerouslySetInnerHTML={{ __html: info.heroHeadline }} />
            
            <p className="text-[#3F4A45] text-[15px] md:text-[17px] leading-relaxed max-w-[620px]">
              {info.heroDesc}
            </p>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-[13px] text-[#8B928E] border-t border-[#EAE6DE]">
              <span><span className="text-[#8B928E] mr-1.5 font-bold">Creator</span><strong className="text-[#0A0F0D]">AutoHub Team</strong></span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#EAE6DE] hidden sm:inline-block"></span>
              <span><strong className="text-[#0A0F0D]">542</strong>명이 사용 중</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#EAE6DE] hidden sm:inline-block"></span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[#FAB005] text-[15px] fill-current">star</span>
                <strong className="text-[#0A0F0D]">5.0</strong> (평점 만점)
              </span>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-4">
              {isOwned ? (
                <div className="inline-flex items-center gap-2 bg-[#0CA678]/10 border border-[#0CA678]/25 text-[#0CA678] font-bold px-8 py-4 rounded-xl text-sm justify-center">
                  <span className="material-symbols-outlined">check_circle</span>
                  소유 및 사용 가능 스킬
                </div>
              ) : (
                <button 
                  onClick={handleCheckout} 
                  className="bg-[#0CA678] text-white font-bold px-8 py-4 rounded-xl shadow-lg hover:opacity-90 active:scale-95 transition-all text-sm flex items-center justify-center gap-2 btn-animate font-mono"
                >
                  <span className="material-symbols-outlined">{isFree ? 'download' : 'credit_card'}</span>
                  {isFree ? "무료 다운로드하여 라이브러리 추가" : `구매하기 (${formatPrice(product.price)})`}
                </button>
              )}
              
              <a 
                href="#workspace" 
                className="bg-[#F5F3EF] border border-[#EAE6DE] text-[#0A0F0D] font-bold px-8 py-4 rounded-xl hover:bg-[#EAE6DE] transition-colors text-sm flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">play_circle</span>
                실전 데모 체험하기
              </a>
            </div>
          </div>

          <div className="lg:col-span-5 relative aspect-[4/3] rounded-[18px] border border-[#EAE6DE] overflow-hidden bg-white shadow-md">
            <img 
              alt={product.title} 
              className="w-full h-full object-cover" 
              src={product.image}
            />
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------
          Situation/Problem Section (Inspired by skills.ag)
          ---------------------------------------------------- */}
      <section className="px-6 py-20 text-center bg-[#F5F3EF]">
        <div className="max-w-[760px] mx-auto space-y-6">
          <div className="font-mono text-[11px] font-bold tracking-[0.2em] text-[#8B928E] uppercase">SITUATION</div>
          <h2 className="font-extrabold text-[26px] md:text-[36px] tracking-tight text-[#0A0F0D]">
            이런 적, 한 번쯤은 있지 않나요?
          </h2>
          <p className="text-[#3F4A45] text-[15px] md:text-[16px] leading-relaxed max-w-[620px] mx-auto pt-2">
            {info.situationDesc}
          </p>
        </div>
      </section>

      {/* ----------------------------------------------------
          Solution Section (Inspired by skills.ag)
          ---------------------------------------------------- */}
      <section className="px-6 py-20 text-center bg-white border-b border-[#EAE6DE]">
        <div className="max-w-[760px] mx-auto space-y-6">
          <div className="font-mono text-[11px] font-bold tracking-[0.2em] text-[#0CA678] uppercase">SOLUTION</div>
          <h2 className="font-extrabold text-[26px] md:text-[36px] tracking-tight text-[#0A0F0D]">
            {info.solutionTitle}
          </h2>
          <p className="text-[#3F4A45] text-[15px] md:text-[16px] leading-relaxed max-w-[620px] mx-auto">
            {info.solutionDesc}
          </p>
        </div>
      </section>

      {/* ----------------------------------------------------
          Benefit Section (Inspired by skills.ag)
          ---------------------------------------------------- */}
      <section className="px-6 py-20 bg-[#F5F3EF]">
        <div className="max-w-[760px] mx-auto">
          <div className="text-center space-y-4 mb-12">
            <div className="font-mono text-[11px] font-bold tracking-[0.2em] text-[#8B928E] uppercase">BENEFIT</div>
            <h2 className="font-extrabold text-[26px] md:text-[36px] tracking-tight text-[#0A0F0D]">
              에이전트 도입 후 달라지는 업무 일상
            </h2>
          </div>

          <ol className="list-none p-0 m-0 space-y-6">
            {info.benefits.map((benefit, i) => (
              <li 
                key={i} 
                className="relative bg-white border border-[#EAE6DE] rounded-[14px] p-6 md:p-8 pl-16 md:pl-20 flex flex-col gap-1.5 shadow-sm text-left"
              >
                <span className="absolute left-6 top-6 md:top-8 font-mono text-[13px] font-bold tracking-widest text-[#0CA678]">
                  {`0${i + 1}`}
                </span>
                <h3 className="font-bold text-[17px] md:text-[19px] text-[#0A0F0D]">{benefit.title}</h3>
                <p className="text-[#6B6E70] text-[13px] md:text-[14px] leading-relaxed">{benefit.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ----------------------------------------------------
          Parts Section (Inspired by skills.ag)
          ---------------------------------------------------- */}
      <section className="px-6 py-20 bg-white border-b border-[#EAE6DE]">
        <div className="max-w-[760px] mx-auto">
          <div className="text-center space-y-4 mb-12">
            <div className="font-mono text-[11px] font-bold tracking-[0.2em] text-[#8B928E] uppercase">PARTS</div>
            <h2 className="font-extrabold text-[26px] md:text-[36px] tracking-tight text-[#0A0F0D]">
              구현 모듈 핵심 구성 요소
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            {info.parts.map((part, i) => (
              <div 
                key={i} 
                className="p-6 md:p-8 border border-[#EAE6DE] rounded-[14px] bg-[#F5F3EF] space-y-3"
              >
                <span className="inline-block font-mono text-[9px] font-bold tracking-widest text-[#0CA678] bg-[#0CA678]/5 px-2.5 py-1 rounded-full uppercase border border-[#0CA678]/10">
                  {part.label}
                </span>
                <h3 className="font-bold text-[17px] text-[#0A0F0D]">{part.title}</h3>
                <p className="text-[#6B6E70] text-[13px] leading-relaxed">{part.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------
          Steps Section (Inspired by skills.ag)
          ---------------------------------------------------- */}
      <section className="px-6 py-20 bg-[#F5F3EF]">
        <div className="max-w-[760px] mx-auto">
          <div className="text-center space-y-4 mb-12">
            <div className="font-mono text-[11px] font-bold tracking-[0.2em] text-[#8B928E] uppercase">STEPS</div>
            <h2 className="font-extrabold text-[26px] md:text-[36px] tracking-tight text-[#0A0F0D]">
              구동 및 세팅 프로세스
            </h2>
          </div>

          <ol className="list-none p-0 m-0 space-y-4">
            {info.steps.map((step, i) => (
              <li 
                key={i} 
                className="relative bg-white border border-[#EAE6DE] rounded-[14px] p-6 pl-14 flex flex-col gap-1 text-left"
              >
                <span className="absolute left-6 top-6 font-mono text-[13px] font-bold text-[#0CA678]">
                  {`0${i + 1}`}
                </span>
                <h3 className="font-bold text-[16px] text-[#0A0F0D]">{step.title}</h3>
                <p className="text-[#6B6E70] text-[13px] leading-relaxed">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ----------------------------------------------------
          Playground Workspace Container (Integrated Demo)
          ---------------------------------------------------- */}
      <section id="workspace" className="px-6 py-20 bg-white border-t border-b border-[#EAE6DE]">
        <div className="max-w-[1080px] mx-auto">
          <div className="text-center space-y-4 mb-12">
            <div className="inline-flex items-center gap-1.5 bg-[#0CA678]/10 text-[#0CA678] px-3.5 py-1.5 rounded-full">
              <span className="material-symbols-outlined text-[15px] animate-pulse">play_circle</span>
              <span className="font-mono text-[10px] font-bold tracking-widest uppercase">Agent Interactive Sandbox</span>
            </div>
            <h2 className="font-extrabold text-[30px] md:text-[40px] tracking-tight">실전 에이전트 구동 데모</h2>
            <p className="text-[#6B6E70] text-[15px] max-w-[620px] mx-auto">
              AutoHub 엔진의 기술 명세와 자동화 동작을 아래 인터랙티브 샌드박스에서 즉시 체험해 보세요.
            </p>
          </div>

          {/* ----------------------------------------------------
              PLAYGROUND 1: AI Documenter (ai-documenter)
              ---------------------------------------------------- */}
          {product.id === "ai-documenter" && (
            <div className="border border-[#0CA678]/25 rounded-[20px] p-6 md:p-8 bg-[#FAF9F5] grid grid-cols-1 lg:grid-cols-12 gap-8 text-left shadow-sm">
              <div className="lg:col-span-5 space-y-6">
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-[16px] p-6 text-center flex flex-col items-center justify-center transition-all ${dragActive ? 'border-[#0CA678] bg-[#0CA678]/5 scale-[0.98]' : 'border-[#EAE6DE] bg-white hover:border-[#0CA678]/50'}`}
                >
                  <input type="file" id="zip-upload-input" accept=".zip" onChange={handleFileChange} className="hidden" />
                  <span className="material-symbols-outlined text-[44px] text-[#0CA678]/50 mb-3 animate-bounce">upload_file</span>
                  <strong className="block text-sm font-bold text-[#0A0F0D]">
                    {uploadedFile ? uploadedFile.name : "소스코드 ZIP 파일 드롭"}
                  </strong>
                  <span className="text-xs text-[#8B928E] block mt-1">
                    {uploadedFile ? `(${(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)` : "여기에 ZIP 파일을 던지거나 클릭해 주세요."}
                  </span>
                  <button 
                    onClick={() => document.getElementById('zip-upload-input').click()}
                    className="mt-4 bg-[#F5F3EF] border border-[#EAE6DE] text-xs font-bold px-4 py-2 rounded-lg hover:bg-[#EAE6DE] transition-colors"
                  >
                    파일 찾기
                  </button>
                </div>

                <button 
                  onClick={startDocGeneration}
                  disabled={!uploadedFile || docGenerating}
                  className={`w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${uploadedFile && !docGenerating ? 'bg-[#0CA678] text-white hover:opacity-95 shadow-md active:scale-98' : 'bg-[#EAE6DE] text-[#8B928E] cursor-not-allowed'}`}
                >
                  <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                  AI 소스코드 정밀 분석 및 그림 생성
                </button>

                {docGenerating && (
                  <div className="bg-white p-5 rounded-xl border border-[#0CA678]/10 space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold text-[#0CA678]">
                      <span>AI 분석 엔진 구동 및 레이아웃 캡처 빌드 중...</span>
                      <span>{Math.round(((docStep + 1) / docSteps.length) * 100)}%</span>
                    </div>
                    <div className="w-full bg-[#F5F3EF] h-2 rounded-full overflow-hidden">
                      <div className="bg-[#0CA678] h-full transition-all duration-700" style={{ width: `${((docStep + 1) / docSteps.length) * 100}%` }} />
                    </div>
                    <div className="space-y-2 pt-1">
                      {docSteps.map((st, i) => (
                        <div key={i} className={`flex items-center gap-2 text-xs transition-colors duration-300 ${i === docStep ? 'text-[#0CA678] font-bold' : i < docStep ? 'text-[#34c759]' : 'text-[#8B928E]'}`}>
                          <span className="material-symbols-outlined text-[16px]">{i < docStep ? 'check_circle' : 'sync'}</span>
                          <span>{st.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="lg:col-span-7 flex flex-col min-h-[460px]">
                {!showDocResult && !docGenerating && (
                  <div className="border border-[#EAE6DE] bg-white rounded-[16px] flex-grow flex flex-col items-center justify-center p-8 text-center">
                    <span className="material-symbols-outlined text-[48px] text-[#8B928E]/30 mb-2">description</span>
                    <strong className="block text-sm font-bold text-[#0A0F0D]">분석 결과 3종 세트 출력창</strong>
                    <span className="text-xs text-[#8B928E] max-w-[280px] mt-1 block">
                      ZIP 소스코드를 업로드한 다음, 상단의 분석 시작 버튼을 실행하면 파일 아키텍처와 가이드가 즉각 도출됩니다.
                    </span>
                  </div>
                )}

                {docGenerating && !showDocResult && (
                  <div className="border border-[#0CA678]/10 bg-white rounded-[16px] flex-grow flex flex-col items-center justify-center p-8 text-center animate-pulse">
                    <span className="material-symbols-outlined text-[48px] text-[#0CA678]/40 mb-2 animate-spin">sync</span>
                    <strong className="block text-sm font-bold text-[#0CA678]">코드 구조 및 컴포넌트 호출 트리 분석 중</strong>
                    <span className="text-xs text-[#8B928E] block mt-1">AI가 기술 가이드북과 아키텍처 캡처 시뮬레이션을 생성하고 있습니다.</span>
                  </div>
                )}

                {showDocResult && projectData && (
                  <div className="border border-[#EAE6DE] bg-white rounded-[16px] flex-grow flex flex-col overflow-hidden shadow-sm">
                    {/* Tabs Menu */}
                    <div className="flex border-b border-[#EAE6DE] bg-[#F5F3EF]">
                      {[
                        { id: 'readme', label: '1. 사용 설명서 (README)', icon: 'article' },
                        { id: 'visual', label: '2. 아키텍처 및 캡처 사진', icon: 'image' },
                        { id: 'manual', label: '3. API 명세 및 사용법', icon: 'menu_book' }
                      ].map(t => (
                        <button 
                          key={t.id} 
                          onClick={() => setActiveDocTab(t.id)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold border-b-2 transition-all ${activeDocTab === t.id ? 'border-[#0CA678] text-[#0CA678] bg-white' : 'border-transparent text-[#6B6E70] hover:text-[#0CA678]'}`}
                        >
                          <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
                          {t.label}
                        </button>
                      ))}
                    </div>

                    {/* Dynamic Generated Output Viewer */}
                    <div className="p-6 flex-grow overflow-y-auto max-h-[340px] text-xs leading-relaxed space-y-4">
                      {activeDocTab === 'readme' && (
                        <div className="space-y-3 text-left">
                          <div className="flex justify-between items-center border-b pb-2">
                            <h4 className="font-bold text-sm text-[#0A0F0D]">README.md</h4>
                            <button onClick={downloadDocReadme} className="text-xs font-bold text-[#0CA678] flex items-center gap-1 hover:underline">
                              <span className="material-symbols-outlined text-[15px]">download</span> 마크다운 다운로드
                            </button>
                          </div>
                          <pre className="bg-[#F5F3EF] p-4 rounded-xl font-mono text-[11px] overflow-x-auto text-[#0A0F0D]">
{`# ${projectData.name}

본 문서는 AI 자동 문서화 에이전트에 의해 소스코드 압축본에서 실시간 추출 및 분석된 기술 사양 가이드입니다.

## 1. 개요 (Overview)
- **애플리케이션 명칭**: ${projectData.name}
- **개발 아키텍처 유형**: ${projectData.type}
- **구동 플랫폼 명세**: Node.js v18.0 이상 권장

## 2. 의존성 정보 (Dependencies)
- 핵심 프레임워크 기반 연동 및 로컬 비동기 컨트롤러 스택 감지됨.
`}
                          </pre>
                        </div>
                      )}

                      {activeDocTab === 'visual' && (
                        <div className="space-y-5 text-left">
                          {/* Live UI Mockup Container (Replicating dynamic elements) */}
                          <div className="space-y-2">
                            <h4 className="font-bold text-sm text-[#0A0F0D]">AI 구동 시뮬레이션 캡처 (Dynamic Screen Capture)</h4>
                            <p className="text-[11px] text-[#6B6E70]">
                              AI가 업로드된 코드를 바탕으로 가상 웹 서버를 실행하여 렌더링을 에뮬레이션한 가상 브라우저 캡처 화면입니다.
                            </p>
                            
                            {/* Browser frame */}
                            <div className="border border-[#EAE6DE] rounded-xl overflow-hidden shadow-sm bg-white">
                              {/* Browser Bar */}
                              <div className="bg-[#F5F3EF] px-4 py-2 flex items-center gap-2 border-b border-[#EAE6DE]">
                                <div className="flex gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
                                  <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
                                </div>
                                <div className="bg-white text-[10px] text-[#8B928E] px-3 py-1 rounded-md flex-grow max-w-sm ml-4 border font-mono">
                                  http://localhost:3000/demo/{projectData.name.toLowerCase()}
                                </div>
                              </div>
                              {/* Browser Viewport */}
                              <div className="p-4 bg-[#FAF9F5] font-sans text-xs space-y-4">
                                <div className="flex justify-between items-center pb-2 border-b border-[#EAE6DE]">
                                  <div>
                                    <strong className="text-[#0A0F0D] text-[13px]">{projectData.name}</strong>
                                    <span className="text-[10px] text-[#6B6E70] ml-2 font-mono">({projectData.type})</span>
                                  </div>
                                  <span className="bg-[#0CA678]/10 text-[#0CA678] text-[9px] font-bold px-2 py-0.5 rounded-full">
                                    Status: ACTIVE (200 OK)
                                  </span>
                                </div>

                                {/* Dynamic Bento Metric Widgets */}
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="bg-white p-3 rounded-lg border border-[#EAE6DE] shadow-sm text-center">
                                    <span className="text-[9px] text-[#8B928E] block uppercase">{projectData.metrics.metric1.label}</span>
                                    <strong className="text-[13px] text-[#0CA678] font-bold font-mono mt-0.5 block">{projectData.metrics.metric1.val}</strong>
                                  </div>
                                  <div className="bg-white p-3 rounded-lg border border-[#EAE6DE] shadow-sm text-center">
                                    <span className="text-[9px] text-[#8B928E] block uppercase">{projectData.metrics.metric2.label}</span>
                                    <strong className="text-[13px] text-[#007aff] font-bold font-mono mt-0.5 block">{projectData.metrics.metric2.val}</strong>
                                  </div>
                                  <div className="bg-white p-3 rounded-lg border border-[#EAE6DE] shadow-sm text-center">
                                    <span className="text-[9px] text-[#8B928E] block uppercase">{projectData.metrics.metric3.label}</span>
                                    <strong className="text-[13px] text-[#FAB005] font-bold font-mono mt-0.5 block">{projectData.metrics.metric3.val}</strong>
                                  </div>
                                </div>

                                {/* Dynamic Table of Endpoints */}
                                <div className="bg-white p-3 rounded-lg border border-[#EAE6DE] shadow-sm space-y-2">
                                  <strong className="block text-[#0A0F0D] text-[10px] uppercase font-bold">API Router Registry</strong>
                                  <div className="space-y-1.5 font-mono text-[10px]">
                                    {projectData.endpoints.map((ep, idx) => (
                                      <div key={idx} className="flex justify-between items-center p-1.5 hover:bg-[#FAF9F5] rounded border border-transparent hover:border-[#EAE6DE]">
                                        <div className="flex gap-2 items-center">
                                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${ep.method === 'GET' ? 'bg-[#007aff]/10 text-[#007aff]' : 'bg-[#0CA678]/10 text-[#0CA678]'}`}>{ep.method}</span>
                                          <strong>{ep.path}</strong>
                                        </div>
                                        <span className="text-[#8B928E] text-[9px]">{ep.desc}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Architecture flowchart */}
                          <div className="space-y-2 pt-2 border-t">
                            <h4 className="font-bold text-sm text-[#0A0F0D]">아키텍처 데이터 흐름도</h4>
                            <div className="p-4 bg-[#F5F3EF] rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-[10px] border">
                              <div className="bg-white border p-2 rounded-lg text-center shadow-xs flex-1 w-full md:w-auto">
                                <strong className="block text-[#007aff]">Client Request</strong>
                                HTTP / WebSocket Call
                              </div>
                              <span className="material-symbols-outlined text-[#8B928E] rotate-90 md:rotate-0">forward</span>
                              <div className="bg-[#FAF9F5] border border-[#0CA678]/30 p-2 rounded-lg text-center shadow-xs flex-1 w-full md:w-auto">
                                <strong className="block text-[#0CA678]">{projectData.type.split(' ')[0]} Handler</strong>
                                Route matching & Controller
                              </div>
                              <span className="material-symbols-outlined text-[#8B928E] rotate-90 md:rotate-0">forward</span>
                              <div className="bg-white border p-2 rounded-lg text-center shadow-xs flex-1 w-full md:w-auto">
                                <strong className="block text-[#FAB005]">Data Repository</strong>
                                DB Access / Cache Store
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeDocTab === 'manual' && (
                        <div className="space-y-4 text-left">
                          <div>
                            <h4 className="font-bold text-sm text-[#0A0F0D] border-b pb-1 mb-2">프로젝트 파일 트리 구조</h4>
                            <pre className="bg-[#F5F3EF] p-4 rounded-xl font-mono text-[10px] text-[#0A0F0D] overflow-x-auto leading-relaxed">
{`. (Root Directory)
${projectData.files.map(f => {
  if (f.includes('/')) {
    const parts = f.split('/');
    return `├── ${parts[0]}\n│   └── ${parts[1]}`;
  }
  return `├── ${f}`;
}).join('\n')}`}
                            </pre>
                          </div>

                          <div>
                            <h4 className="font-bold text-sm text-[#0A0F0D] border-b pb-1 mb-2">에이전트 제안 구동법 및 트러블슈팅</h4>
                            <div className="border border-[#EAE6DE] rounded-xl p-4 bg-[#FAF9F5] space-y-3">
                              <div>
                                <strong className="text-[#0CA678] block">1. 쉘 환경 명령어 실행</strong>
                                <pre className="bg-white p-2 rounded border font-mono text-[9px] mt-1 text-[#0A0F0D]">
{`$ npm install --save-dev
$ npm run build`}
                                </pre>
                              </div>
                              <div>
                                <strong className="text-amber-700 block">2. 종속성 오류 발생 대처</strong>
                                <p className="text-[11px] text-[#6B6E70] mt-0.5">
                                  패키지 로딩 에러 시 <code>npm cache clean --force</code> 명령을 실행한 후 다시 빌드해 주십시오.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ----------------------------------------------------
              PLAYGROUND 2: AI Blog Writer (blog-writer)
              ---------------------------------------------------- */}
          {product.id === "blog-writer" && (
            <div className="border border-[#0CA678]/25 rounded-[20px] p-6 md:p-8 bg-[#FAF9F5] grid grid-cols-1 lg:grid-cols-12 gap-8 text-left shadow-sm">
              <div className="lg:col-span-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#6B6E70] mb-2 uppercase">블로그 작성 주제 입력</label>
                  <input 
                    type="text" 
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="예: 초보자를 위한 챗GPT 업무 활용법"
                    className="w-full border border-[#EAE6DE] bg-white rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-[#0CA678] focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#6B6E70] mb-2 uppercase">글쓰기 톤앤매너 선택</label>
                  <select 
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full border border-[#EAE6DE] bg-white rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-[#0CA678] outline-none"
                  >
                    <option value="friendly">친근한 대화체 (~해요, ~입니다)</option>
                    <option value="professional">전문적인 정보전달체 (~다, ~로 분석된다)</option>
                    <option value="review">직관적인 실사용 리뷰체 (~해 본 후기)</option>
                  </select>
                </div>

                <button 
                  onClick={startBlogGeneration}
                  disabled={!keyword.trim() || blogGenerating}
                  className={`w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${keyword.trim() && !blogGenerating ? 'bg-[#0CA678] text-white hover:opacity-95 shadow-md active:scale-98' : 'bg-[#EAE6DE] text-[#8B928E] cursor-not-allowed'}`}
                >
                  <span className="material-symbols-outlined text-[18px]">edit_note</span>
                  AI 블로그 포스팅 원고 집필
                </button>

                {blogGenerating && (
                  <div className="bg-white p-5 rounded-xl border border-[#0CA678]/10 space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold text-[#0CA678]">
                      <span>AI 마케터 포스팅 구상 중...</span>
                      <span>{Math.round(((blogStep + 1) / blogSteps.length) * 100)}%</span>
                    </div>
                    <div className="w-full bg-[#F5F3EF] h-2 rounded-full overflow-hidden">
                      <div className="bg-[#0CA678] h-full transition-all duration-700" style={{ width: `${((blogStep + 1) / blogSteps.length) * 100}%` }} />
                    </div>
                    <div className="space-y-2 pt-1">
                      {blogSteps.map((st, i) => (
                        <div key={i} className={`flex items-center gap-2 text-xs transition-colors duration-300 ${i === blogStep ? 'text-[#0CA678] font-bold' : i < blogStep ? 'text-[#34c759]' : 'text-[#8B928E]'}`}>
                          <span className="material-symbols-outlined text-[16px]">{i < blogStep ? 'check_circle' : 'sync'}</span>
                          <span>{st.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="lg:col-span-7 flex flex-col min-h-[420px]">
                {!showBlogResult && !blogGenerating && (
                  <div className="border border-[#EAE6DE] bg-white rounded-[16px] flex-grow flex flex-col items-center justify-center p-8 text-center">
                    <span className="material-symbols-outlined text-[48px] text-[#8B928E]/30 mb-2">auto_stories</span>
                    <strong className="block text-sm font-bold text-[#0A0F0D]">완성된 마케팅 포스팅 원고</strong>
                    <span className="text-xs text-[#8B928E] max-w-[280px] mt-1 block">
                      왼쪽 주제 입력칸에 단어들을 적고 [AI 블로그 포스팅 원고 집필]을 클릭해 보세요.
                    </span>
                  </div>
                )}

                {blogGenerating && !showBlogResult && (
                  <div className="border border-[#0CA678]/10 bg-white rounded-[16px] flex-grow flex flex-col items-center justify-center p-8 text-center animate-pulse">
                    <span className="material-symbols-outlined text-[48px] text-[#0CA678]/40 mb-2 animate-spin">sync</span>
                    <strong className="block text-sm font-bold text-[#0CA678]">블로그 단락 배치를 검증하고 있습니다</strong>
                    <span className="text-xs text-[#8B928E] block mt-1">작가가 직접 퇴고하는 과정을 에뮬레이션합니다.</span>
                  </div>
                )}

                {showBlogResult && (
                  <div className="border border-[#EAE6DE] bg-white rounded-[16px] flex-grow p-6 flex flex-col justify-between overflow-hidden shadow-sm">
                    <div className="space-y-4 overflow-y-auto max-h-[320px] pr-2 text-left">
                      <div className="border-b pb-3">
                        <span className="bg-[#007aff]/10 text-[#007aff] px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider block w-max mb-1">
                          Generated Title
                        </span>
                        <h3 className="font-bold text-[15px] text-[#0A0F0D]">{generatedTitle}</h3>
                      </div>
                      
                      <div className="space-y-3">
                        <span className="bg-[#34c759]/10 text-[#34c759] px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider block w-max">
                          Body Content
                        </span>
                        <p className="text-xs leading-relaxed text-[#3F4A45] whitespace-pre-wrap">{generatedBody}</p>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {generatedTags.map((tg, i) => (
                          <span key={i} className="bg-[#FAF9F5] border text-[11px] text-[#007aff] px-2 py-0.5 rounded-full font-medium">
                            {tg}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`제목: ${generatedTitle}\n\n본문:\n${generatedBody}\n\n태그: ${generatedTags.join(' ')}`);
                        showToast("원고 텍스트를 클립보드에 복사했습니다!", "success");
                      }}
                      className="mt-4 bg-[#0CA678] text-white font-bold text-xs py-3 rounded-xl hover:opacity-95 active:scale-95 transition-all text-center flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">content_copy</span>
                      클립보드 전체 복사
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ----------------------------------------------------
              PLAYGROUND 3: DB Backup Script (database-backup)
              ---------------------------------------------------- */}
          {product.id === "database-backup" && (
            <div className="border border-[#0CA678]/25 rounded-[20px] p-6 md:p-8 bg-[#FAF9F5] grid grid-cols-1 lg:grid-cols-12 gap-8 text-left shadow-sm">
              <div className="lg:col-span-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#6B6E70] mb-2 uppercase">대상 데이터베이스</label>
                  <select 
                    value={dbType}
                    onChange={(e) => setDbType(e.target.value)}
                    className="w-full border border-[#EAE6DE] bg-white rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-[#0CA678] outline-none"
                  >
                    <option value="postgresql">PostgreSQL</option>
                    <option value="mysql">MySQL / MariaDB</option>
                    <option value="mongodb">MongoDB</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#6B6E70] mb-2 uppercase">AWS S3 버킷 명칭</label>
                  <input 
                    type="text" 
                    value={s3Bucket}
                    onChange={(e) => setS3Bucket(e.target.value)}
                    className="w-full border border-[#EAE6DE] bg-white rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-[#0CA678] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#6B6E70] mb-2 uppercase">백업 주기 설정 (Cron 표현식)</label>
                  <input 
                    type="text" 
                    value={cronInterval}
                    onChange={(e) => setCronInterval(e.target.value)}
                    className="w-full border border-[#EAE6DE] bg-white rounded-xl py-3 px-4 text-sm font-mono focus:ring-2 focus:ring-[#0CA678] outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 py-1">
                  <input 
                    type="checkbox" 
                    id="slack-toggle"
                    checked={includeSlack}
                    onChange={(e) => setIncludeSlack(e.target.checked)}
                    className="w-4 h-4 text-[#0CA678] focus:ring-[#0CA678] border-[#EAE6DE] rounded"
                  />
                  <label htmlFor="slack-toggle" className="text-xs font-bold text-[#3F4A45] cursor-pointer">
                    성공/실패 시 Slack 웹훅 알림 추가
                  </label>
                </div>

                <button 
                  onClick={generateBackupScript}
                  className="w-full py-4 rounded-xl bg-[#0CA678] text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-95 shadow-md active:scale-98 transition-all btn-animate"
                >
                  <span className="material-symbols-outlined text-[18px]">terminal</span>
                  백업 쉘 스크립트(.sh) 생성
                </button>
              </div>

              <div className="lg:col-span-7 flex flex-col min-h-[420px]">
                {!scriptGenerated && (
                  <div className="border border-[#EAE6DE] bg-white rounded-[16px] flex-grow flex flex-col items-center justify-center p-8 text-center">
                    <span className="material-symbols-outlined text-[48px] text-[#8B928E]/30 mb-2">code_blocks</span>
                    <strong className="block text-sm font-bold text-[#0A0F0D]">커스텀 쉘 스크립트 출력창</strong>
                    <span className="text-xs text-[#8B928E] max-w-[280px] mt-1 block">
                      왼쪽 폼에 세부 백업 인프라 요소를 채우고 [백업 쉘 스크립트 생성]을 클릭해 보세요.
                    </span>
                  </div>
                )}

                {scriptGenerated && (
                  <div className="border border-[#EAE6DE] bg-white rounded-[16px] flex-grow p-6 flex flex-col justify-between overflow-hidden shadow-sm">
                    <div className="space-y-3 flex-grow overflow-y-auto max-h-[320px] pr-2 text-left">
                      <span className="bg-[#007aff]/10 text-[#007aff] px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider block w-max">
                        Generated shell_script.sh
                      </span>
                      <pre className="bg-[#F5F3EF] p-4 rounded-xl font-mono text-[10px] text-[#0A0F0D] overflow-x-auto whitespace-pre leading-relaxed">
                        {generatedScript}
                      </pre>
                    </div>

                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(generatedScript);
                        showToast("스크립트 코드를 클립보드에 복사했습니다!", "success");
                      }}
                      className="mt-4 bg-[#0CA678] text-white font-bold text-xs py-3 rounded-xl hover:opacity-95 active:scale-95 transition-all text-center flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">content_copy</span>
                      스크립트 전체 복사
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ----------------------------------------------------
          FAQ Section (Inspired by skills.ag)
          ---------------------------------------------------- */}
      <section className="px-6 py-20 bg-[#F5F3EF]">
        <div className="max-w-[760px] mx-auto">
          <div className="text-center space-y-4 mb-12">
            <div className="font-mono text-[11px] font-bold tracking-[0.2em] text-[#8B928E] uppercase">FAQ</div>
            <h2 className="font-extrabold text-[26px] md:text-[36px] tracking-tight text-[#0A0F0D]">
              자주 묻는 질문
            </h2>
          </div>

          <div className="space-y-4">
            {info.faqs.map((faq, i) => (
              <div 
                key={i} 
                className="bg-white border border-[#EAE6DE] rounded-[14px] p-6 text-left shadow-sm"
              >
                <h3 className="font-bold text-[15px] text-[#0CA678] mb-2 font-mono">
                  Q. {faq.q}
                </h3>
                <p className="text-[#6B6E70] text-[13px] leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------
          CTA Bottom Callout Card (Inspired by skills.ag)
          ---------------------------------------------------- */}
      <section className="px-6 py-16 bg-white animate-fadeIn">
        <div className="max-w-[640px] mx-auto p-8 bg-[#FAF9F5] border border-[#0CA678]/25 rounded-[14px] text-left space-y-4">
          <h3 className="font-extrabold text-[18px] text-[#0A0F0D] uppercase font-mono tracking-tight text-[#0CA678]">
            지금 즉시 프로젝트에 연동하세요
          </h3>
          <ul className="list-disc pl-5 space-y-2 text-[#3F4A45] text-[13px] leading-relaxed">
            <li>전문가 검증을 통과하여 런타임 오류가 나지 않는 최적화 소스코드 자산입니다.</li>
            <li>구매 및 무료 라이브러리에 보관하여 업데이트 버전을 원클릭으로 내려받으실 수 있습니다.</li>
            <li>문의나 고도화 건의는 마이페이지 연동 채널 또는 크리에이터 오픈 톡으로 즉각 반영해 드립니다.</li>
          </ul>
        </div>
      </section>

      {/* ----------------------------------------------------
          Endmark (Inspired by skills.ag)
          ---------------------------------------------------- */}
      <div className="py-12 text-center text-[#8B928E] font-mono text-[10px] tracking-widest uppercase border-t border-[#EAE6DE] bg-white">
        AUTOHUB · DESIGNED FOR ELITE DEVELOPERS
      </div>
    </main>
  );
}
