
import { UPSTAGE_API_URL, UPSTAGE_EXTRACTION_URL, UPSTAGE_SCHEMA_GEN_URL } from "../constants";
import { UpstageResponse, ParseOptions, ExtractionOptions, ExtractionResponse } from "../types";

const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB Limit

// --- Helper Functions ---
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_SIZE) {
      reject(new Error(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds the 30MB limit.`));
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
      "3. File size is too large (>30MB).\n" +
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
    throw new Error(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds the 30MB limit.`);
  }

  const formData = new FormData();
  formData.append("document", file);
  formData.append("model", options.model);
  formData.append("ocr", options.ocr);
  formData.append("mode", options.mode);
  formData.append("coordinates", options.coordinates.toString());
  formData.append("merge_multipage_tables", options.merge_multipage_tables.toString());
  formData.append("chart_recognition", options.chart_recognition.toString());

  const formatArray = (arr: string[]) => `[${arr.map(item => `'${item}'`).join(', ')}]`;
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
              content: "Generate a JSON schema for the main tables and key-value pairs in this document."
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
