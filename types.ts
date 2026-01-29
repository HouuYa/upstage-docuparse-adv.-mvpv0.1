
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
  usage: {
    total_tokens: number;
  };
  choices: Array<{
    message: {
      content: string; // Stringified JSON of the extracted data
      tool_calls?: Array<{
        function: {
          name: string;
          arguments: string; // Stringified JSON with metadata (coordinates, confidence)
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
