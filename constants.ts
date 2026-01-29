
// Note: In a production environment, API keys should be handled via a backend proxy to prevent exposure.
// For this client-side demo, we allow the user to use the provided key or input their own.
export const DEFAULT_API_KEY = "up_FOL8gHVxpNkw8LqkYSTDqTKHpo1DK";

// --- CORS PROXY PATHS (See vite.config.ts) ---

// 1. Document Parsing Proxy Path
// Maps to: https://api.upstage.ai/v1/document-ai/document-parse
export const UPSTAGE_API_URL = "/api/upstage/document-ai/document-parse";

// 2. Information Extraction Proxy Path
// Maps to: https://api.upstage.ai/v1/information-extraction/chat/completions
export const UPSTAGE_EXTRACTION_URL = "/api/upstage/information-extraction/chat/completions";

// 3. Schema Generation Proxy Path
// Maps to: https://api.upstage.ai/v1/information-extraction/schema-generation/chat/completions
export const UPSTAGE_SCHEMA_GEN_URL = "/api/upstage/information-extraction/schema-generation/chat/completions";

export const SUPPORTED_EXTENSIONS = [".hwp", ".hwpx", ".pdf", ".jpg", ".png", ".jpeg", ".docx", ".pptx", ".xlsx"];

export const LAYOUT_CATEGORIES = [
  "figure",
  "table",
  "chart",
  "heading1",
  "header",
  "footer",
  "caption",
  "paragraph",
  "equation",
  "list",
  "index",
  "footnote"
];

export const OUTPUT_FORMATS = [
  { value: "html", label: "HTML" },
  { value: "text", label: "Text" },
  { value: "markdown", label: "Markdown" },
];

// Refined Schema based on "KC Safety Standard Document Structuring" Analysis
export const KC_SAFETY_SCHEMA = {
  "type": "object",
  "properties": {
    "document_metadata": {
      "type": "object",
      "properties": {
        "title": { "type": "string", "description": "문서 제목 (예: 안전확인대상생활용품의 안전기준)" },
        "revision_date": { "type": "string", "description": "개정 연월일" },
        "product_scope": { "type": "string", "description": "적용 대상 제품군" }
      }
    },
    "safety_criteria": {
      "type": "array",
      "description": "안전기준 항목 목록",
      "items": {
        "type": "object",
        "properties": {
          "test_item": { 
            "type": "string", 
            "description": "시험 항목명 (예: 점도, 끓는점, 인장강도)" 
          },
          "conditions": {
            "type": "object",
            "properties": {
                "temperature": { "type": "string", "description": "시험 온도 (예: 25±3℃)" },
                "time": { "type": "string", "description": "시험 시간 (예: 24시간)" },
                "method": { "type": "string", "description": "시험 방법 요약" }
            }
          },
          "standard_value": {
            "type": "object",
            "properties": {
                 "value": { "type": "string", "description": "기준값 (숫자 및 범위 포함)" },
                 "unit": { "type": "string", "description": "단위 (예: mm²/s, mg/kg)" }
            }
          }
        },
        "required": ["test_item"]
      }
    }
  },
  "required": ["safety_criteria"]
};

export const PRESET_SCHEMAS = {
  "KC Safety Standard (Recommended)": KC_SAFETY_SCHEMA,
  "Invoice Standard": {
    "type": "object",
    "properties": {
      "invoice_number": { "type": "string", "description": "Unique identifier for the invoice" },
      "invoice_date": { "type": "string", "description": "Date of issue" },
      "vendor_name": { "type": "string", "description": "Name of the vendor" },
      "vendor_address": { "type": "string", "description": "Address of the vendor" },
      "total_amount": { "type": "number", "description": "Grand total including tax" },
      "line_items": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "description": { "type": "string" },
            "amount": { "type": "number" }
          }
        }
      }
    },
    "required": ["invoice_number", "total_amount"]
  }
};
