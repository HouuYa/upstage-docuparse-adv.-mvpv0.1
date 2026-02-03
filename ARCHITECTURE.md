# Upstage DocuParse Architecture

## KC 안전기준 문서 구조화 시스템

### 개요

본 아키텍처는 KC 안전기준(HWP 중심의 비정형 규제문서)을 **정책 및 AI가 판단할 수 있는 구조화된 데이터**로 전환하기 위한 3단계 파이프라인을 정의합니다.

핵심 원칙: **Human-In-The-Loop (HITL) 최적화**
- 수식, 그림, 측정단위 등 규제 핵심 정보의 정확성 보장
- AI 판단 근거의 가시화 및 추적성 확보

---

### 파이프라인 흐름도

```mermaid
graph LR
    A[파일 업로드] --> B(Step 1: 문서 파싱);
    B --> C{레이아웃 분석 + OCR};
    C -->|HTML/좌표/에셋| D[Step 2: 스키마 & 추출];
    D --> E{AI 정보 추출};
    E --> F[Step 3: 검증 & 내보내기];
    F -->|수정 필요| D;
    F --> G[최종 JSON/CSV];

    style B fill:#f9f,stroke:#333,stroke-width:2px
    style D fill:#bbf,stroke:#333,stroke-width:2px
    style F fill:#bfb,stroke:#333,stroke-width:2px
```

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Step 1       │     │    Step 2       │     │    Step 3       │
│   문서 파싱      │────▶│  스키마 & 추출   │────▶│  검증 & 내보내기  │
│                 │     │                 │     │                 │
│ Upstage         │     │ 스키마 자동생성  │     │ 추출값 검토/수정  │
│ Document        │     │ + 수동 편집     │     │ 에셋↔HTML 연동   │
│ Parse API       │     │ + 정보 추출 실행 │     │ JSON/CSV Export │
└─────────────────┘     └────────┬────────┘     └────────┬────────┘
                                 │                        │
                                 └── 재추출 (스키마 수정 후) ─┘
```

---

## 시스템 구성

### 프론트엔드 (클라이언트)

| 구분 | 기술 |
|------|------|
| Framework | React 19 + TypeScript 5.8 |
| Build Tool | Vite 7 |
| Styling | Tailwind CSS + Lucide Icons |
| State | React `useReducer` (로컬 상태) |
| 보안 | DOMPurify (HTML 살균 - XSS 방지) |
| 수식 | MathJax (LaTeX 렌더링) |
| 프록시 | Vite Dev Server / Netlify (CORS 처리) |

### 주요 파일 구조

```
├── App.tsx                      # 메인 앱 (3단계 워크플로우 관리)
│                                 # - useReducer 상태 관리
│                                 # - 접이식 좌측 패널
│                                 # - 단계별 UI 렌더링
├── constants.ts                 # API URL, 기본 스키마, 설정값
├── types.ts                     # TypeScript 타입 정의
├── services/
│   └── upstageService.ts        # API 호출, 스키마 검증/자동수정
│                                 # - 504 에러 자동 재시도 (3회, 지수 백오프)
│                                 # - parseDocument(), extractInformation()
│                                 # - generateSchema(), validateSchema()
├── components/
│   ├── FileUploader.tsx          # 파일 업로드 컴포넌트
│   ├── ApiKeyModal.tsx           # API Key 입력 모달
│   ├── SchemaBuilder.tsx         # 스키마 편집기 (Visual + Code)
│   └── ExtractionViewer.tsx      # 추출 결과 검증 뷰어
│                                 # - 편집 UI (Pencil 아이콘, 테두리)
│                                 # - 에셋↔HTML 소스 연동
├── vite.config.ts               # Vite 프록시 설정
└── netlify.toml                 # Netlify 배포 프록시 설정
```

---

## Step 1: Document Parsing (문서 디지털화)

> 공식 문서: [Document Digitization](https://console.upstage.ai/docs/capabilities/digitize#document-digitization)

### API 정보
- **Endpoint**: `https://api.upstage.ai/v1/document-ai/document-parse`
- **방식**: `multipart/form-data` POST
- **기능**: 문서 레이아웃 분석 + OCR → HTML/Markdown 변환

### 지원 입력 형식
| 구분 | 형식 |
|------|------|
| 이미지 | JPEG, PNG, BMP, TIFF, HEIC |
| 문서 | PDF, DOCX, PPTX, XLSX, **HWP, HWPX** |

### 입력 제약사항
| 항목 | 제한값 |
|------|--------|
| 최대 파일 크기 | **50MB** |
| 최대 페이지 수 (동기) | 100 페이지 |
| 최대 페이지 수 (비동기) | 1,000 페이지 |
| 페이지당 최대 픽셀 | 200M pixels |
| 지원 문자셋 | 영숫자, 한글, 한자, 가타카나, 히라가나 |

### 출력 구조

```
문서 파싱 결과
├── content
│   ├── html       ← 표/수식 포함 구조화 HTML
│   ├── markdown   ← Markdown 텍스트
│   └── text       ← 순수 텍스트
├── elements[]     ← 개별 요소 목록
│   ├── category   ← paragraph, table, figure, equation, chart...
│   ├── content    ← 요소별 HTML/Markdown/Text
│   ├── coordinates← 페이지 내 위치 (상대 좌표 0.0~1.0)
│   └── base64_encoding ← 이미지 데이터 (표/그림/수식)
└── usage
    └── pages      ← 처리된 페이지 수
```

**Layout Category → HTML 태그 매핑:**

| Category | HTML 태그 | 설명 |
|----------|-----------|------|
| paragraph | `<p>` | 일반 텍스트 |
| table | `<table>` | 표 |
| figure | `<figure>` | 그림/이미지 |
| equation | `<p data-category="equation">` | 수식 (LaTeX) |
| chart | `<table>` 또는 `<figure>` | 차트 (인식 성공/실패) |
| heading1 | `<h1>` | 제목 |
| list | `<ul>`/`<ol>` | 목록 |

### 주요 파라미터

| 파라미터 | 설명 | 본 앱 설정 |
|---------|------|-----------|
| `model` | 파싱 모델 | `document-parse-nightly` |
| `output_formats` | 출력 형식 | `["html"]` |
| `coordinates` | 좌표 포함 여부 | `true` |
| `merge_multipage_tables` | 다중 페이지 표 병합 | `true` |
| `chart_recognition` | 차트 인식 | `true` |
| `base64_encoding` | Base64 이미지 대상 | `["figure","chart","table","equation"]` |

### 좌표 체계
- **상대 좌표**: 0.0 ~ 1.0 범위 (소수점 4자리)
- **절대 좌표 변환**: `absolute_x = relative_x * page_width`
- **형식**: 4개 꼭짓점 `[top-left, top-right, bottom-right, bottom-left]`

---

## Step 2: Schema & Extraction (스키마 설계 + 정보 추출)

이 단계에서는 스키마 설계와 정보 추출을 하나의 화면에서 수행합니다.

### 스키마 설계

> 공식 문서: [Writing a Schema](https://console.upstage.ai/docs/capabilities/extract/writing-a-schema)

```
┌─────────────────────────────────────────┐
│            스키마 설계 방법               │
├──────────────┬──────────────────────────┤
│  자동 생성    │  수동 설계               │
│              │                          │
│  AI가 문서를  │  Visual 편집기로          │
│  분석하여     │  필드 추가/수정           │
│  스키마 제안  │  또는 JSON 직접 작성      │
│              │                          │
│  → 검증 후   │  → 프리셋(KC Safety,     │
│    자동 수정  │    Invoice) 활용 가능     │
└──────────────┴──────────────────────────┘
```

#### Schema Generation API
- **Endpoint**: `https://api.upstage.ai/v1/information-extraction/schema-generation/chat/completions`
- **요청 형식**: 시스템 메시지와 이미지를 별도 메시지로 전송

```json
{
  "model": "information-extract",
  "messages": [
    { "role": "system", "content": "Generate a JSON schema..." },
    { "role": "user", "content": [{ "type": "image_url", "image_url": { "url": "data:..." } }] }
  ],
  "response_format": { "type": "json_schema", ... }
}
```

### 스키마 제약사항 (Upstage API)

| 항목 | 동기 API | 비동기 API |
|------|----------|------------|
| 최대 속성 수 | 100개 | 5,000개 |
| 최대 문자 수 | 15,000자 | 120,000자 |
| 속성명 총 길이 | 10,000자 (공통) | |

### 지원 타입 및 제약

```
허용 타입
├── 기본 타입: string, number, integer, boolean
├── 복합 타입: array
└── 특수: object (array의 items로만 사용 가능)

타입 제약 규칙
├── object는 property 타입으로 사용 불가 (어떤 레벨에서든)
│   ✅ { "type": "array", "items": { "type": "object", ... } }
│   ❌ { "type": "object", "properties": { "foo": { "type": "object" } } }
├── array items 내부 properties도 primitive 또는 array만 가능
├── 중첩 배열 불가 (array 안에 array 불가)
└── 속성명 총 문자수 10,000자 이하
```

> **중첩 구조 해결 방법**: 접두사 기반 플랫화
> `conditions.temperature` → `condition_temperature`

### 정보 추출 (Information Extraction)

> 공식 문서: [Information Extraction](https://console.upstage.ai/docs/capabilities/extract#information-extraction)

- **Endpoint**: `https://api.upstage.ai/v1/information-extraction/chat/completions`
- **호환성**: OpenAI Chat Completion API 형식
- **RPS**: 동기 1 / 비동기 2

### 추출 모드 (Beta)

| 모드 | 설명 | 사용 시점 |
|------|------|----------|
| Standard (기본) | 빠름, 대부분 문서에 정확 | 일반 문서 |
| Enhanced | 복잡한 테이블, 스캔 불량, 수기 문서 | KC 안전기준 권장 |

### 504 에러 자동 재시도

Enhanced 모드에서 504 Gateway Timeout 발생 시:
- **최대 재시도**: 3회
- **지수 백오프**: 3초 → 6초 → 12초
- **사용자 알림**: "서버 타임아웃 (504). Xs 후 자동 재시도... (N/3)"

### 핵심 기능

#### Location Coordinates (위치 좌표)

> 공식 문서: [Location Coordinates](https://console.upstage.ai/docs/capabilities/extract/location-coordinates)

| Granularity | 설명 | 특징 |
|-------------|------|------|
| `element` (기본) | HTML 요소 단위 좌표 | 빠름 |
| `word` | 단어 단위 좌표 | 느리지만 정밀 |
| `all` | element + word 모두 | 가장 느림 |

#### Confidence (신뢰도)

> 공식 문서: [Confidence](https://console.upstage.ai/docs/capabilities/extract/confidence)

추출된 각 값에 `high` 또는 `low` 신뢰도를 부여합니다. `low`인 값은 UI에서 경고 표시되어 우선 검토 대상이 됩니다.

### 요청 형식 (Raw REST API)

```json
{
  "model": "information-extract",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "image_url",
          "image_url": { "url": "data:application/octet-stream;base64,<BASE64>" }
        }
      ]
    }
  ],
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "document_schema",
      "schema": { ... }
    }
  },
  "mode": "standard",
  "confidence": true,
  "location": true,
  "location_granularity": "element"
}
```

### 응답 구조

```
Extraction Response
├── choices[0].message.content    ← 추출된 데이터 (JSON 문자열)
└── choices[0].message.tool_calls ← 메타데이터
    └── [0].function
        ├── name: "additional_values"
        └── arguments               ← 각 필드별 신뢰도/좌표/페이지 정보
            ├── field_name
            │   ├── _value           ← 추출된 값
            │   ├── confidence       ← "high" | "low"
            │   ├── coordinates      ← [{x,y}, {x,y}, {x,y}, {x,y}]
            │   ├── page             ← 페이지 번호
            │   └── word_coordinates ← [[{x,y},...], ...] (word 모드)
            └── ...
```

---

## Step 3: Verification & Export (검증 및 내보내기)

### 검증 워크플로우

```
┌─────────────────┐
│ 추출 결과 수신   │
└────────┬────────┘
         ▼
┌─────────────────┐
│ 신뢰도 기반 분류 │
│ - High: 자동승인 │
│ - Low: 검토 대상 │
└────────┬────────┘
         ▼
┌─────────────────┐
│ 검토 UI 표시     │
│ - 원문 하이라이트│
│ - 좌표 기반 시각화│
│ - 에셋↔HTML 연동│
└────────┬────────┘
         ▼
┌─────────────────┐
│ 사람 수정/승인   │
│ - 값 수정 (✏️)   │
│ - 수식 확인      │
│ - 단위 검증      │
└────────┬────────┘
         ▼
┌─────────────────────────┐
│ 내보내기                 │
│ - JSON (구조화 데이터)    │
│ - CSV (스프레드시트 호환) │
└─────────────────────────┘
```

### ExtractionViewer UI 구성

```
┌──────────────────────────┬──────────────────────────┐
│     좌측 패널 (원문)       │     우측 패널 (검증)       │
│                          │                          │
│  [HTML Source] [Overlay]  │  ── 추출된 데이터 ──      │
│                          │  ┌─────────────────────┐ │
│  파싱된 HTML 문서 표시     │  │ field: [__값__] ✏️  │ │
│  - 에셋 클릭 시           │  │ field: [__값__] ⚠   │ │
│    해당 요소 하이라이트    │  └─────────────────────┘ │
│                          │  클릭하여 수정 가능        │
│  이미지 파일인 경우:       │                          │
│  - 좌표 기반 바운딩 박스   │  ── 감지된 에셋 ──       │
│  - 단어 단위 하이라이트    │  ┌─────────────────────┐ │
│                          │  │ [📊 표] Page 1       │ │
│                          │  │ [📈 그림] Page 2     │ │
│                          │  │ [∑ 수식] Page 3      │ │
│                          │  └─────────────────────┘ │
└──────────────────────────┴──────────────────────────┘
```

### 편집 UI 특징

- **연필 아이콘 (✏️)**: 편집 가능한 필드임을 시각적으로 표시
- **테두리 있는 입력 필드**: 클릭/호버 시 편집 상태 명확히 표시
- **낮은 신뢰도 경고 (⚠)**: "확인" 배지로 우선 검토 유도

### 에셋↔HTML 연동

에셋(표, 그림, 수식) 클릭 시 HTML 소스에서 해당 요소로 자동 스크롤:

1. **Strategy 1**: `data-element-id` 속성으로 직접 매칭
2. **Strategy 2**: 카테고리 + 문서 순서 인덱스로 폴백 매칭

```typescript
// selectorMap: 카테고리별 CSS 선택자
const selectorMap = {
  'table': 'table',
  'figure': 'figure, .parsed-content > img',
  'chart': 'table, figure',
  'equation': '[data-category="equation"], p:has(math)',
};
```

### 내보내기 (Export)

좌측 접이식 패널에서 바로 내보내기 가능:

| 형식 | 설명 |
|------|------|
| **JSON** | 구조화된 데이터, API 연동용 |
| **CSV** | 스프레드시트 호환, UTF-8 BOM 포함 |

### 보안

- 모든 `dangerouslySetInnerHTML`에 **DOMPurify** 적용 (XSS 방지)
- CSV 내보내기 시 수식 주입 방지 (`=`, `+`, `-`, `@` 앞에 `'` 추가)
- UTF-8 BOM 포함으로 한글 Excel 호환성 확보

---

## 기술 스택 요약

| 단계 | Upstage API | 핵심 파라미터 | 본 앱 구현 |
|------|-------------|---------------|-----------|
| Step 1 | Document Parsing | `merge_multipage_tables`, `base64_encoding` | `parseDocument()` |
| Step 2 | Schema Generation + Information Extraction | `mode`, `location`, `confidence` | `generateSchema()` + `extractInformation()` |
| Step 3 | (자체 구현) | Confidence threshold, UI 연동 | `ExtractionViewer` |

---

## 프록시 설정

### 개발 환경 (Vite)

`vite.config.ts`에서 CORS 프록시 설정:
- `/api/upstage/*` → `https://api.upstage.ai/v1/*`

### 배포 환경 (Netlify)

`netlify.toml`에서 리디렉트 프록시:
- `/api/upstage/:splat` → `https://api.upstage.ai/v1/:splat` (status 200)

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
