
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
 *
 * Key rule: 'object' type can ONLY appear as 'items' of an 'array'.
 * It CANNOT be used as a property type at ANY level (not just first-level).
 * Inside array items (which are objects), all properties must be primitive or array.
 *
 * Other constraints:
 * - No nested arrays (array items cannot be another array)
 * - Max 100 properties (sync API)
 * - Max 15,000 characters (sync API)
 * - Total property name length <= 10,000 characters
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

  // Check total character count
  const schemaStr = JSON.stringify(schema);
  if (schemaStr.length > 15000) {
    warnings.push(`스키마 문자 수가 ${schemaStr.length}자로 동기 API 제한(15,000자)에 근접하거나 초과합니다.`);
  }

  // Collect all property names and count total properties
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

  if (allNames.length > 100) {
    errors.push(`총 속성 수가 ${allNames.length}개로 동기 API 제한(100개)을 초과합니다.`);
  }

  const totalNameLength = allNames.reduce((sum, n) => sum + n.length, 0);
  if (totalNameLength > 10000) {
    errors.push(`속성명 총 문자수가 ${totalNameLength}자로 제한(10,000자)을 초과합니다.`);
  }

  // Recursively check ALL properties at every level:
  // - No property can have type 'object' (object is only allowed as array items)
  // - No nested arrays
  const checkProperties = (properties: Record<string, any>, path: string) => {
    for (const [key, prop] of Object.entries(properties) as [string, any][]) {
      const currentPath = path ? `${path}.${key}` : key;

      if (prop.type === 'object') {
        errors.push(
          `"${currentPath}"의 타입이 'object'입니다. ` +
          `Upstage API에서 'object'는 array의 items로만 사용 가능합니다. ` +
          `개별 속성으로 플랫화하거나 array로 래핑해주세요.`
        );
      }

      if (prop.type === 'array') {
        if (prop.items?.type === 'array') {
          errors.push(`"${currentPath}"에 중첩 배열이 있습니다. Upstage API는 중첩 배열을 지원하지 않습니다.`);
        }
        // Recurse into array items object properties
        if (prop.items?.type === 'object' && prop.items.properties) {
          checkProperties(prop.items.properties, `${currentPath}[]`);
        }
      }
    }
  };

  checkProperties(schema.properties, '');

  return { valid: errors.length === 0, errors, warnings };
};

/**
 * Auto-fix a schema by flattening 'object' properties at ALL levels.
 * Object properties are expanded into their parent with prefixed names.
 * This is applied recursively through array items as well.
 * Returns a new schema object (does not mutate the original).
 */
export const autoFixSchema = (schema: any): any => {
  if (!schema?.properties) return schema;

  const fixed = JSON.parse(JSON.stringify(schema));

  const flattenObjectProperties = (properties: Record<string, any>): Record<string, any> => {
    const result: Record<string, any> = {};

    for (const [key, prop] of Object.entries(properties) as [string, any][]) {
      if (prop.type === 'object' && prop.properties) {
        // Flatten: expand nested object properties into parent with prefix
        for (const [subKey, subProp] of Object.entries(prop.properties) as [string, any][]) {
          const flatKey = `${key}_${subKey}`;
          if (subProp.type === 'object' && subProp.properties) {
            // Recursively flatten deeper nested objects
            const deepFlat = flattenObjectProperties({ [flatKey]: subProp });
            Object.assign(result, deepFlat);
          } else {
            result[flatKey] = { ...subProp };
            if (!result[flatKey].description) {
              result[flatKey].description = `${key} > ${subKey}`;
            }
          }
        }
      } else if (prop.type === 'array' && prop.items?.type === 'object' && prop.items.properties) {
        // Recurse into array items to fix nested objects there too
        result[key] = {
          ...prop,
          items: {
            ...prop.items,
            properties: flattenObjectProperties(prop.items.properties)
          }
        };
      } else {
        result[key] = prop;
      }
    }

    return result;
  };

  fixed.properties = flattenObjectProperties(fixed.properties);
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
  if (status === 400 && (
    errorMessage.includes("cannot be 'object'") ||
    errorMessage.includes("properties of object cannot")
  )) {
    throw new Error(
      `[${context}] 스키마 오류: 'object' 타입은 property로 사용할 수 없습니다.\n` +
      `'object'는 오직 array의 items로만 허용됩니다.\n` +
      `array items 안의 properties도 string/number/integer/boolean/array만 가능합니다.\n` +
      `해결 방법: 중첩 object를 접두사 기반 flat 속성으로 분리해주세요.\n` +
      `(예: conditions.temperature → condition_temperature)\n` +
      `(원문: ${errorMessage})`
    );
  }

  if (status === 400 && errorMessage.includes("Invalid Schema")) {
    throw new Error(
      `[${context}] 스키마 유효성 오류: ${errorMessage}\n` +
      `스키마 제약사항: object는 array items로만 사용 가능, 중첩 배열 불가, 최대 100개 속성.`
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

const MAX_RETRIES = 3;
const RETRY_DELAYS = [3000, 6000, 12000]; // 3s, 6s, 12s exponential backoff

export const extractInformation = async (
  file: File,
  apiKey: string,
  options: ExtractionOptions,
  onProgress?: (status: string) => void
): Promise<ExtractionResponse> => {
  const cleanApiKey = apiKey.trim();

  if (onProgress) onProgress("Digitizing document (Base64)...");
  const base64Data = await fileToBase64(file);
  const dataUrl = `data:application/octet-stream;base64,${base64Data}`;

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

  const fetchOptions: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cleanApiKey}`,
    },
    body: JSON.stringify(payload),
  };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        const delay = RETRY_DELAYS[attempt - 1] || 12000;
        if (onProgress) onProgress(`서버 타임아웃 (504). ${delay / 1000}초 후 자동 재시도... (${attempt}/${MAX_RETRIES})`);
        await new Promise(r => setTimeout(r, delay));
        if (onProgress) onProgress(`재시도 중... (${attempt}/${MAX_RETRIES})`);
      } else {
        if (onProgress) onProgress("Sending to Universal Extraction API...");
      }

      const response = await fetchWithTimeout(UPSTAGE_EXTRACTION_URL, fetchOptions);

      // Retry on 504 Gateway Timeout
      if (response.status === 504 && attempt < MAX_RETRIES) {
        console.warn(`Extraction API returned 504, retrying (${attempt + 1}/${MAX_RETRIES})...`);
        continue;
      }

      if (!response.ok) {
        await handleApiError(response, "Information Extraction");
      }

      return await response.json();
    } catch (error: any) {
      // Only retry on 504-related errors; throw everything else immediately
      if (attempt < MAX_RETRIES && error.message?.includes('504')) {
        continue;
      }
      if (attempt === MAX_RETRIES || !error.message?.includes('504')) {
        console.error("Extraction Error:", error);
        checkNetworkError(error, "Extraction");
        throw error;
      }
    }
  }

  throw new Error("[Information Extraction] 서버 타임아웃이 반복됩니다. 잠시 후 다시 시도하거나 Standard 모드를 사용해주세요.");
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

    // Schema Generation API uses the same OpenAI chat completions format.
    // System instruction goes as a separate message (role: "system"),
    // and the document goes as image_url in the user message.
    const payload = {
      model: "information-extract",
      messages: [
        {
          role: "system",
          content: "Generate a JSON schema for the main tables and key-value pairs in this document. CRITICAL RULES: 1) NEVER use 'object' as a property type at ANY level. 'object' can ONLY appear as 'items' of an 'array'. 2) Inside array items, all properties must be primitive types (string, number, integer, boolean) or array. 3) If you need grouped fields, flatten them with prefixed names (e.g., 'condition_temperature' instead of nested object). 4) No nested arrays."
        },
        {
          role: "user",
          content: [
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
