# Upstage DocuParse (MVP)

KC 안전기준 등 복잡한 문서(**한국 HWP/HWPX**, PDF, 이미지 포함)를 디지털화하고, 정보를 추출하며, 사람이 검증하는 Document AI 도구입니다.
**Upstage Document Parse API** 및 **Information Extraction API**의 전체 기능을 활용합니다.

> **한 줄 요약**: 문서 업로드 → AI가 구조 분석 → 원하는 정보 추출 → 사람이 확인/수정 → JSON/CSV 내보내기

---

## 전체 워크플로우

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  1. Digitize │────▶│  2. Schema   │────▶│  3. Extract  │────▶│  4. Verify   │
│  (문서 파싱)  │     │  (스키마 설계) │     │  (정보 추출)  │     │  (검증/수정)  │
│              │     │              │     │              │     │              │
│  HWP/PDF를   │     │  어떤 정보를  │     │  AI가 스키마  │     │  사람이 결과를│
│  HTML로 변환  │     │  뽑을지 정의  │     │  기반으로 추출 │     │  확인 후 내보내기│
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

---

## 핵심 기능

| 기능 | 설명 |
|------|------|
| **다양한 문서 지원** | HWP, HWPX, PDF, 이미지(JPG/PNG) 등 한국 문서 형식 기본 지원 |
| **AI 스키마 자동 생성** | 문서를 분석하여 추출 스키마를 AI가 자동 제안 |
| **순환형 HITL 워크플로우** | 파싱 1회 후 스키마 수정/재추출 반복 가능 (재업로드 불필요) |
| **시각적 위치 검증** | 추출값 클릭 시 원문 내 위치를 하이라이트로 표시 |
| **에셋 연동** | 표/그림/수식 등 에셋 클릭 시 HTML 소스의 해당 위치로 자동 스크롤 |
| **신뢰도 표시** | AI가 낮은 확신도를 가진 값에 경고 표시 → 우선 검토 |
| **수식 지원** | MathJax를 통한 LaTeX 수식 렌더링 |
| **JSON/CSV 내보내기** | 검증 완료된 데이터를 즉시 다운로드 |

---

## Upstage API 기능 소개

이 앱은 Upstage의 두 가지 핵심 API를 활용합니다.

### Document Digitization (문서 디지털화)

> 공식 문서: [Document Digitization](https://console.upstage.ai/docs/capabilities/digitize#document-digitization)

**무엇을 하나요?**
스캔한 이미지나 HWP/PDF 등 비정형 문서를 **기계가 읽을 수 있는 HTML/Markdown**으로 변환합니다.

**동작 원리:**
```
원본 문서 (HWP/PDF/이미지)
         │
         ▼
  ┌─────────────────┐
  │  Layout Analysis │  ← 문서 레이아웃(제목, 표, 그림 등) 자동 인식
  │  + OCR 처리      │  ← 이미지 내 글자를 텍스트로 변환
  └────────┬────────┘
           ▼
  ┌─────────────────┐
  │  구조화된 출력    │
  │  - HTML (표/수식) │
  │  - Markdown      │
  │  - 좌표 정보     │  ← 각 요소의 페이지 내 위치
  │  - Base64 이미지  │  ← 표/그림/수식의 이미지 데이터
  └─────────────────┘
```

**주요 특징:**
- **HWP 네이티브 지원**: 한국 공문서 형식을 변환 손실 없이 처리
- **표 인식**: 복잡한 표도 HTML `<table>`로 정확히 변환
- **수식 인식**: LaTeX 형식으로 수학 공식 추출
- **차트 인식**: 막대/선/파이 차트를 데이터 테이블로 변환
- **다중 페이지 표 병합**: 여러 페이지에 걸친 동일 표를 하나로 통합

### Information Extraction (정보 추출)

> 공식 문서: [Information Extraction](https://console.upstage.ai/docs/capabilities/extract#information-extraction)

**무엇을 하나요?**
문서에서 **사용자가 정의한 스키마(틀)**에 맞춰 원하는 정보만 정확하게 뽑아냅니다.

**동작 원리:**
```
문서 파일 + JSON 스키마 (추출 틀)
         │
         ▼
  ┌─────────────────────┐
  │  AI 분석             │
  │  - 스키마에 맞는     │
  │    값 찾기/추출      │
  │  - 신뢰도 평가       │  ← 각 값의 확신 정도 (high/low)
  │  - 위치 좌표 매핑    │  ← 값이 문서 어디에 있는지
  └────────┬────────────┘
           ▼
  ┌─────────────────────┐
  │  구조화된 JSON 결과   │
  │  + 신뢰도 정보       │
  │  + 원문 위치 좌표    │
  └─────────────────────┘
```

**주요 특징:**
- **스키마 기반 추출**: JSON Schema로 원하는 필드를 미리 정의
- **2가지 모드**: Standard (빠름) / Enhanced (복잡한 표/스캔 문서에 적합)
- **신뢰도(Confidence)**: 추출값의 확신도를 `high`/`low`로 표시
- **위치 추적(Location)**: 추출값이 원문 어디에서 왔는지 좌표로 제공
- **스키마 자동 생성**: 샘플 문서를 주면 AI가 스키마를 자동으로 제안

---

## 시작하기

### 사전 요구사항
- **Node.js**: v18 이상 (v20+ 권장)
- **API Key**: [Upstage AI Console](https://console.upstage.ai/)에서 발급

### 설치 및 실행

```bash
# 1. 저장소 클론
git clone https://github.com/your-username/upstage-docuparse-adv.-mvp.git
cd upstage-docuparse-adv.-mvp

# 2. 의존성 설치
npm install

# 3. 개발 서버 시작
npm run dev
```

앱이 `http://localhost:3000`에서 열립니다.

### API Key 설정
- **권장**: 앱 우측 상단 **Settings** 버튼에서 런타임에 입력
- `constants.ts`의 `DEFAULT_API_KEY`로 기본값 설정 가능 (프로덕션 비권장)

### 시스템 요구사항
| 항목 | 요구사항 |
|------|---------|
| OS | Windows, macOS, Linux |
| 브라우저 | Chrome(권장), Edge, Firefox, Safari |
| 네트워크 | `api.upstage.ai`로의 아웃바운드 트래픽 허용 (Vite 프록시 경유) |

---

## 사용 가이드

### Step 1: 문서 디지털화 (Digitize)
1. 우측 상단 **Settings**에서 Upstage API Key 입력
2. 파일 업로드 (`.hwp`, `.pdf`, `.jpg` 등)
3. **Run Digitize** 클릭
   - 문서가 HTML로 변환되고, 표/그림/수식 등 에셋이 추출됩니다

### Step 2: 스키마 설계 (Schema Design)
1. 추출할 정보의 구조를 정의합니다
2. **옵션:**
   - **Auto-Generate**: AI가 문서를 분석하여 스키마 자동 생성
   - **프리셋 로드**: KC 안전기준, Invoice 등 사전 정의 스키마 사용
   - **Visual/Code 편집기**: 수동으로 필드 추가/수정
3. **Extract Info** 클릭하여 추출 실행

### Step 3: 검증 (HITL Verify)
1. **데이터 확인**: 우측 패널에서 추출된 정보 목록 확인
2. **에셋 확인**: 하단의 "Detected Assets"에서 표/그림/수식 확인
3. **수정**: 값 클릭 후 직접 수정 가능
4. **위치 확인**: 항목 클릭 시 좌측 패널에서 원문 위치 하이라이트

### Step 4: 내보내기 (Export)
- **JSON Export**: 구조화된 JSON 파일 다운로드
- **CSV Export**: 스프레드시트 호환 CSV 파일 다운로드 (UTF-8 BOM 포함)

---

## 설정

`constants.ts`에서 기본 설정을 변경할 수 있습니다:
- `DEFAULT_API_KEY`: 기본 API 키 (데모 전용)
- `PRESET_SCHEMAS`: 스키마 라이브러리에 제공되는 기본 JSON 스키마
- `KC_SAFETY_SCHEMA`: KC 안전기준 문서용 기본 스키마

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| Framework | React 19 + TypeScript 5.8 |
| Build Tool | Vite 7 |
| Styling | Tailwind CSS + Lucide Icons |
| State | React `useReducer` |
| 보안 | DOMPurify (HTML 살균) |
| 수식 | MathJax (LaTeX 렌더링) |
| 배포 | Netlify (프록시 설정 포함) |

---

## 참고 문서

- [Document Digitization](https://console.upstage.ai/docs/capabilities/digitize#document-digitization)
- [Document Parsing](https://console.upstage.ai/docs/capabilities/digitize/document-parsing)
- [Input Requirements](https://console.upstage.ai/docs/capabilities/digitize/input-requirements)
- [Understanding Output](https://console.upstage.ai/docs/capabilities/digitize/understanding-output)
- [Chart Recognition](https://console.upstage.ai/docs/capabilities/digitize/chart-recognition)
- [Information Extraction](https://console.upstage.ai/docs/capabilities/extract#information-extraction)
- [Universal Information Extraction](https://console.upstage.ai/docs/capabilities/extract/universal-extraction)
- [Writing a Schema](https://console.upstage.ai/docs/capabilities/extract/writing-a-schema)
- [Location Coordinates](https://console.upstage.ai/docs/capabilities/extract/location-coordinates)
- [Confidence](https://console.upstage.ai/docs/capabilities/extract/confidence)

## License

This project is an MVP demonstration for Upstage AI integration.
