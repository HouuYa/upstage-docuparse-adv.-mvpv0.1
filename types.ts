
export interface UpstageResponse {
  api: string;
  content: {
    html: string;
    markdown: string;
    text: string;
  };
  elements: UpstageElement[];
  model: string;
  usage: {
    pages: number;
  };
  error?: {
    message: string;
    type: string;
  };
}

export interface UpstageElement {
  id: number;
  page: number;
  category: string;
  content: {
    html: string;
    markdown: string;
    text: string;
  };
  coordinates: Array<{ x: number; y: number }>;
  base64_encoding?: string;
}

export interface ParseOptions {
  model: string;
  ocr: 'auto' | 'force';
  mode: 'standard' | 'enhanced' | 'auto';
  output_formats: string[];
  coordinates: boolean;
  merge_multipage_tables: boolean;
  base64_encoding: string[];
  chart_recognition: boolean;
}

// --- Information Extraction Types ---

export interface ExtractionOptions {
  model: string; // e.g., "information-extract"
  mode?: 'standard' | 'enhanced'; // Beta features
  schema: object; // JSON Schema object
  confidence?: boolean;
  location?: boolean;
  location_granularity?: 'element' | 'word' | 'all';
}

export interface ExtractionResponse {
  id: string;
  model: string;
  created: number;
  object: string | null;
  system_fingerprint: string | null;
  usage: {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
    completion_tokens_details: any | null;
    prompt_tokens_details: any | null;
  };
  choices: Array<{
    finish_reason: string;
    index: number | null;
    logprobs: any | null;
    message: {
      content: string; // Stringified JSON of the extracted data
      role: string;
      function_call: any | null;
      tool_calls?: Array<{
        type: string; // "function"
        function: {
          name: string; // "additional_values"
          arguments: string; // Stringified JSON with _value, confidence, coordinates, page
        };
      }>;
    };
  }>;
}

export interface ExtractedDataWithMetadata {
  [key: string]: any; 
  // Structure mimics the schema but values might be objects with _value, coordinates, confidence
  // if location/confidence is enabled.
}

export interface Coordinate {
  x: number;
  y: number;
}

export interface MetadataValue {
  _value: any;
  confidence?: 'high' | 'low';
  coordinates?: Coordinate[];
  page?: number;
  word_coordinates?: Coordinate[][];
}
