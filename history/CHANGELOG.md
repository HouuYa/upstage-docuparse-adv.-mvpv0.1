# 변경 이력 (Changelog)

프로젝트의 주요 변경 사항을 기록합니다.

---

## [v0.2.0] - 2026-02-03

### 주요 변경사항

#### UI/UX 개선
- **4단계 → 3단계 워크플로우 통합**
  - Step 1: 문서 파싱 (Document Parse)
  - Step 2: 스키마 & 추출 (Schema Design + Information Extraction)
  - Step 3: 검증 & 내보내기 (Verify + Export)
- **접이식 좌측 패널**: 화면 공간 효율화를 위한 패널 숨기기/보이기 기능
- **편집 UI 가시성 개선**
  - 입력 필드에 테두리 추가
  - 연필 아이콘(✏️)으로 편집 가능 상태 표시
  - 호버/클릭 시 시각적 피드백 강화
- **한국어 UI 텍스트**: 주요 레이블 및 메시지 한국어화

#### 안정성 개선
- **504 에러 자동 재시도**: Information Extraction API 504 Gateway Timeout 발생 시
  - 최대 3회 재시도
  - 지수 백오프 (3초 → 6초 → 12초)
  - 사용자에게 재시도 상태 메시지 표시
- **기본 추출 모드 변경**: Enhanced → Standard (504 에러 빈도 감소)

#### API 수정
- **Schema Generation API 수정**: 시스템 메시지와 이미지를 별도 메시지로 분리
  - 기존: `content` 배열 내에 `{type: "text", text: "..."}` 포함
  - 수정: `messages` 배열에 `{role: "system", content: "..."}` 별도 메시지

#### 에셋-HTML 연동 개선
- **듀얼 전략 매칭**
  - Strategy 1: `data-element-id` 속성으로 직접 매칭
  - Strategy 2: 카테고리 + 문서 순서 인덱스로 폴백 매칭
- **카테고리 인덱스 계산 수정**: `el.id < asset.id` 비교 대신 `indexOf()` + `slice()` 사용

#### 문서 업데이트
- README.md: 3단계 워크플로우 반영, 새 기능 설명 추가
- ARCHITECTURE.md: 3단계 파이프라인 흐름도 업데이트, 504 재시도 로직 설명 추가

---

## [v0.1.0] - 2026-01-XX

### 초기 릴리스
- Upstage Document Parse API 연동
- Upstage Information Extraction API 연동
- 스키마 자동 생성 (Schema Generation API)
- Visual/Code 스키마 편집기
- ExtractionViewer: 추출 결과 검증 UI
- 좌표 기반 바운딩 박스 시각화
- 신뢰도(Confidence) 표시
- JSON/CSV 내보내기
- MathJax 수식 렌더링
- DOMPurify XSS 방지
