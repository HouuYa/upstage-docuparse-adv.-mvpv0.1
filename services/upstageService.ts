
import { UPSTAGE_API_URL, UPSTAGE_EXTRACTION_URL, UPSTAGE_SCHEMA_GEN_URL } from "../constants";
import { UpstageResponse, ParseOptions, ExtractionOptions, ExtractionResponse } from "../types";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB Limit (per Upstage docs)

// --- Schema Validation ---

export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates a JSON schema against Upstage Information Extraction API constraints.
 * - First-level properties cannot be 'object' (must be string/number/integer/boolean/array)
 * - No nested arrays
 * - Max 100 properties (sync API)
 * - Max 15,000 characters (sync API)
 */
export const validateSchema = (schema: any): SchemaValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!schema || typeof schema !== 'object') {
    errors.push("스키마가 유효한 JSON 객체가 아닙니다.");
    return { valid: false, errors, warnings };
  }

  if (schema.type !== 'object' || !schema.properties) {
    errors.push("스키마의 최상위는 type: 'object'이고 properties가 있어야 합니다.");
    return { valid: false, errors, warnings };
  }

  const props = schema.properties;
  const propKeys = Object.keys(props);

  // Check property count
  if (propKeys.length > 100) {
    errors.push(`속성 수가 ${propKeys.length}개로 동기 API 제한(100개)을 초과합니다.`);
  }

  // Check total character count
  const schemaStr = JSON.stringify(schema);
  if (schemaStr.length > 15000) {
    warnings.push(`스키마 문자 수가 ${schemaStr.length}자로 동기 API 제한(15,000자)에 근접하거나 초과합니다.`);
  }

  // Check total property name length (docs: cannot exceed 10,000 characters)
  const collectNames = (obj: any): string[] => {
    const names: string[] = [];
    if (obj?.properties) {
      for (const [k, v] of Object.entries(obj.properties) as [string, any][]) {
        names.push(k);
        names.push(...collectNames(v));
      }
    }
    if (obj?.items) {
      names.push(...collectNames(obj.items));
    }
    return names;
  };
  const allNames = collectNames(schema);
  const totalNameLength = allNames.reduce((sum, n) => sum + n.length, 0);
  if (totalNameLength > 10000) {
    errors.push(`속성명 총 문자수가 ${totalNameLength}자로 제한(10,000자)을 초과합니다.`);
  }

  // Check first-level properties for 'object' type
  for (const key of propKeys) {
    const prop = props[key];
    if (prop.type === 'object') {
      errors.push(`1차 속성 "${key}"의 타입이 'object'입니다. API 제약상 1차 속성은 'string', 'number', 'integer', 'boolean', 'array'만 가능합니다. 'array'로 래핑하거나 개별 속성으로 분리해주세요.`);
    }
  }

  // Check for nested arrays
  const checkNestedArray = (obj: any, path: string) => {
    if (obj?.type === 'array' && obj.items?.type === 'array') {
      errors.push(`"${path}"에 중첩 배열이 있습니다. Upstage API는 중첩 배열을 지원하지 않습니다.`);
    }
    if (obj?.type === 'array' && obj.items?.type === 'object' && obj.items.properties) {
      for (const [k, v] of Object.entries(obj.items.properties)) {
        checkNestedArray(v, `${path}.items.${k}`);
      }
    }
    if (obj?.type === 'object' && obj.properties) {
      for (const [k, v] of Object.entries(obj.properties)) {
        checkNestedArray(v, `${path}.${k}`);
      }
    }
  };

  for (const key of propKeys) {
    checkNestedArray(props[key], key);
  }

  return { valid: errors.length === 0, errors, warnings };
};

/**
 * Auto-fix a schema by converting first-level 'object' properties to 'array' wrappers.
 * Returns a new schema object (does not mutate the original).
 */
export const autoFixSchema = (schema: any): any => {
  if (!schema?.properties) return schema;

  const fixed = JSON.parse(JSON.stringify(schema));
  for (const [key, prop] of Object.entries(fixed.properties) as [string, any][]) {
    if (prop.type === 'object' && prop.properties) {
      // Convert object to array with single-item semantics
      fixed.properties[key] = {
        type: 'array',
        description: prop.description || `${key} (auto-converted from object)`,
        items: {
          type: 'object',
          properties: prop.properties,
          ...(prop.required ? { required: prop.required } : {})
        }
      };
    }
  }
  return fixed;
};

// --- Helper Functions ---
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_SIZE) {
      reject(new Error(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds the 50MB limit.`));
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // remove the data URL prefix (e.g. "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

const handleApiError = async (response: Response, context: string): Promise<never> => {
  const status = response.status;
  let errorMessage = "";

  try {
    const errorBody = await response.json();
    errorMessage = errorBody.error?.message || errorBody.message || JSON.stringify(errorBody);
  } catch (e) {
    errorMessage = await response.text().catch(() => "Unknown error");
  }

  if (errorMessage.length > 300) errorMessage = errorMessage.substring(0, 300) + "...";

  // User-friendly error mapping for known patterns
  if (status === 400 && errorMessage.includes("first-level properties cannot be 'object'")) {
    throw new Error(
      `[${context}] 스키마 오류: 1차 속성에 'object' 타입을 사용할 수 없습니다.\n` +
      `'string', 'number', 'integer', 'boolean', 'array'만 허용됩니다.\n` +
      `해결 방법: object 속성을 array로 래핑하거나 개별 string 속성으로 분리해주세요.\n` +
      `(원문: ${errorMessage})`
    );
  }

  if (status === 400 && errorMessage.includes("Invalid Schema")) {
    throw new Error(
      `[${context}] 스키마 유효성 오류: ${errorMessage}\n` +
      `스키마 제약사항을 확인해주세요: 1차 속성에 object 불가, 중첩 배열 불가, 최대 100개 속성.`
    );
  }

  // Standardized Error Messages
  if (status === 400) throw new Error(`[${context}] Bad Request: ${errorMessage}`);
  if (status === 401) throw new Error(`[${context}] Unauthorized: Invalid API Key or Expired.`);
  if (status === 403) throw new Error(`[${context}] Forbidden: Insufficient permissions.`);
  if (status === 404) throw new Error(`[${context}] Endpoint Not Found. Check Proxy Config.`);
  if (status === 413) throw new Error(`[${context}] Payload Too Large: File exceeds limit.`);
  if (status === 422) throw new Error(`[${context}] Unprocessable: Document corrupted.`);
  if (status === 429) throw new Error(`[${context}] Rate Limit Exceeded. Try again later.`);
  if (status >= 500) throw new Error(`[${context}] Server Error (${status}): ${errorMessage}`);

  throw new Error(`[${context}] Operation failed (${status}): ${errorMessage}`);
};

const checkNetworkError = (error: any, context: string): never => {
  if (error.name === 'AbortError') {
    throw new Error(`[${context}] Request Timed Out (300s). The server took too long to respond.`);
  }

  if (error instanceof TypeError && error.message === "Failed to fetch") {
    throw new Error(
      `[${context}] Network/CORS Error.\n` +
      "Possible causes:\n" +
      "1. Proxy server not running (Vite).\n" +
      "2. API Key is invalid.\n" +
      "3. File size is too large (>50MB).\n" +
      "4. Browser blocked the request."
    );
  }
  throw error;
};

// Timeout Wrapper
const fetchWithTimeout = async (url: string, options: RequestInit, timeout = 300000) => { // 5 minutes
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

// --- Parsing Service ---
export const parseDocument = async (
  file: File,
  apiKey: string,
  options: ParseOptions
): Promise<UpstageResponse> => {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds the 50MB limit.`);
  }

  const formData = new FormData();
  formData.append("document", file);
  formData.append("model", options.model);
  formData.append("ocr", options.ocr);
  formData.append("mode", options.mode);
  formData.append("coordinates", options.coordinates.toString());
  formData.append("merge_multipage_tables", options.merge_multipage_tables.toString());
  formData.append("chart_recognition", options.chart_recognition.toString());

  const formatArray = (arr: string[]) => JSON.stringify(arr);
  formData.append("output_formats", formatArray(options.output_formats));

  const encodingOptions = options.base64_encoding.length > 0
    ? options.base64_encoding
    : ["figure", "chart", "table", "equation"];

  formData.append("base64_encoding", formatArray(encodingOptions));

  try {
    const cleanApiKey = apiKey.trim();
    // Using fetchWithTimeout to prevent indefinite hanging
    const response = await fetchWithTimeout(UPSTAGE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cleanApiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      await handleApiError(response, "Document Parsing");
    }

    return await response.json();
  } catch (error: any) {
    console.error("Upstage Parsing Error:", error);
    checkNetworkError(error, "Parsing");
    throw error;
  }
};

// --- Information Extraction Service (Universal) ---

export const extractInformation = async (
  file: File,
  apiKey: string,
  options: ExtractionOptions,
  onProgress?: (status: string) => void
): Promise<ExtractionResponse> => {
  try {
    const cleanApiKey = apiKey.trim();

    if (onProgress) onProgress("Digitizing document (Base64)...");
    const base64Data = await fileToBase64(file);
    const dataUrl = `data:application/octet-stream;base64,${base64Data}`;

    if (onProgress) onProgress("Sending to Universal Extraction API...");

    const payload = {
      model: "information-extract",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: dataUrl }
            }
          ]
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "document_schema",
          schema: options.schema
        }
      },
      mode: options.mode || "standard",
      confidence: options.confidence,
      location: options.location,
      location_granularity: options.location_granularity || "element"
    };

    const response = await fetchWithTimeout(UPSTAGE_EXTRACTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cleanApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      await handleApiError(response, "Information Extraction");
    }

    return await response.json();
  } catch (error: any) {
    console.error("Extraction Error:", error);
    checkNetworkError(error, "Extraction");
    throw error;
  }
};

export const generateSchema = async (
  file: File,
  apiKey: string,
  onProgress?: (status: string) => void
): Promise<any> => {
  try {
    const cleanApiKey = apiKey.trim();

    if (onProgress) onProgress("Preparing file...");
    const base64Data = await fileToBase64(file);
    const dataUrl = `data:application/octet-stream;base64,${base64Data}`;

    if (onProgress) onProgress("Analyzing document structure...");

    const payload = {
      model: "information-extract",
      messages: [
        {
          role: "user",
          content: [
            {
              role: "system",
              content: "Generate a JSON schema for the main tables and key-value pairs in this document. IMPORTANT: First-level properties must be 'string', 'number', 'integer', 'boolean', or 'array' only. Do NOT use 'object' type at the first level. If you need object-type data, wrap them as items of an array."
            },
            {
              type: "image_url",
              image_url: { url: dataUrl }
            }
          ]
        }
      ]
    };

    const response = await fetchWithTimeout(UPSTAGE_SCHEMA_GEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cleanApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      await handleApiError(response, "Schema Generation");
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error("Invalid response format from API");
    }

    const contentStr = data.choices[0].message.content;

    try {
      const cleanJson = contentStr.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      throw new Error("AI generated invalid JSON. Please try again.");
    }

  } catch (error: any) {
    console.error("Schema Gen Error:", error);
    checkNetworkError(error, "Schema Generation");
    throw error;
  }
};
