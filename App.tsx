
import React, { useEffect, useReducer, useMemo, useCallback, useState } from "react";
import { Layout, Play, Settings, RotateCcw, AlertCircle, CheckCircle2, ScanLine, Sparkles, Loader2, ArrowRight, Check, X, Code2, PanelLeftClose, PanelLeftOpen, Download } from "lucide-react";
import DOMPurify from "dompurify";
import FileUploader from "./components/FileUploader";
import ApiKeyModal from "./components/ApiKeyModal";
import ExtractionViewer from "./components/ExtractionViewer";
import SchemaBuilder from "./components/SchemaBuilder";
import { parseDocument, extractInformation, generateSchema, validateSchema, autoFixSchema } from "./services/upstageService";
import { UpstageResponse, ParseOptions, ExtractionOptions, ExtractionResponse } from "./types";
import { DEFAULT_API_KEY, KC_SAFETY_SCHEMA } from "./constants";

// Extend Window interface for MathJax
declare global {
  interface Window {
    MathJax: {
      typesetPromise: () => Promise<void>;
      typeset: () => void;
    }
  }
}

type WorkflowStep = 1 | 2 | 3;

interface AppState {
  apiKey: string;
  isKeyModalOpen: boolean;
  file: File | null;
  previewUrl: string | null;
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
  currentStep: WorkflowStep;
  parsingResult: UpstageResponse | null;
  extractionResult: ExtractionResponse | null;
  schemaJson: string;
  extractionMode: 'standard' | 'enhanced';
  isSchemaGenerating: boolean;
  verifiedData: any;
  model: string;
  base64Encoding: string[];
}

type Action =
  | { type: 'SET_API_KEY'; payload: string }
  | { type: 'TOGGLE_KEY_MODAL'; payload: boolean }
  | { type: 'SET_FILE'; payload: File | null }
  | { type: 'SET_PREVIEW_URL'; payload: string | null }
  | { type: 'RESET' }
  | { type: 'START_LOADING'; payload: string }
  | { type: 'STOP_LOADING' }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PARSING_RESULT'; payload: UpstageResponse }
  | { type: 'SET_EXTRACTION_RESULT'; payload: ExtractionResponse }
  | { type: 'SET_VERIFIED_DATA'; payload: any }
  | { type: 'SET_STEP'; payload: WorkflowStep }
  | { type: 'SET_SCHEMA'; payload: string }
  | { type: 'SET_EXTRACTION_MODE'; payload: 'standard' | 'enhanced' }
  | { type: 'START_SCHEMA_GEN' }
  | { type: 'STOP_SCHEMA_GEN' }
  | { type: 'CLEAR_EXTRACTION' };

const initialState: AppState = {
    apiKey: DEFAULT_API_KEY,
    isKeyModalOpen: false,
    file: null,
    previewUrl: null,
    isLoading: false,
    loadingMessage: "",
    error: null,
    currentStep: 1,
    parsingResult: null,
    extractionResult: null,
    schemaJson: JSON.stringify(KC_SAFETY_SCHEMA, null, 2),
    extractionMode: 'standard',
    isSchemaGenerating: false,
    verifiedData: null,
    model: "document-parse-nightly",
    base64Encoding: ["figure", "chart", "table", "equation"]
};

function appReducer(state: AppState, action: Action): AppState {
    switch (action.type) {
        case 'SET_API_KEY': return { ...state, apiKey: action.payload };
        case 'TOGGLE_KEY_MODAL': return { ...state, isKeyModalOpen: action.payload };
        case 'SET_FILE':
            return {
                ...state,
                file: action.payload,
                error: null,
                currentStep: 1,
                parsingResult: null,
                extractionResult: null,
                verifiedData: null
            };
        case 'SET_PREVIEW_URL': return { ...state, previewUrl: action.payload };
        case 'RESET':
            return {
                ...initialState,
                apiKey: state.apiKey,
                schemaJson: state.schemaJson
            };
        case 'START_LOADING': return { ...state, isLoading: true, loadingMessage: action.payload, error: null };
        case 'STOP_LOADING': return { ...state, isLoading: false };
        case 'SET_ERROR': return { ...state, error: action.payload, isLoading: false };
        case 'SET_PARSING_RESULT': return { ...state, parsingResult: action.payload };
        case 'SET_EXTRACTION_RESULT': return { ...state, extractionResult: action.payload };
        case 'SET_VERIFIED_DATA': return { ...state, verifiedData: action.payload };
        case 'SET_STEP': return { ...state, currentStep: action.payload };
        case 'SET_SCHEMA': return { ...state, schemaJson: action.payload };
        case 'SET_EXTRACTION_MODE': return { ...state, extractionMode: action.payload };
        case 'START_SCHEMA_GEN': return { ...state, isSchemaGenerating: true, loadingMessage: "Generating Schema..." };
        case 'STOP_SCHEMA_GEN': return { ...state, isSchemaGenerating: false };
        case 'CLEAR_EXTRACTION': return { ...state, extractionResult: null, verifiedData: null };
        default: return state;
    }
}

function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  // File Preview & Memory Leak Fix
  useEffect(() => {
    let objectUrl: string | null = null;
    if (state.file) {
      objectUrl = URL.createObjectURL(state.file);
      dispatch({ type: 'SET_PREVIEW_URL', payload: objectUrl });
    } else {
      dispatch({ type: 'SET_PREVIEW_URL', payload: null });
    }
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [state.file]);

  // MathJax Re-render
  useEffect(() => {
    if (state.parsingResult && window.MathJax) {
      setTimeout(() => {
        window.MathJax.typesetPromise().catch(console.error);
      }, 500);
    }
  }, [state.parsingResult, state.currentStep]);

  // --- Handlers ---

  const handleRunParsing = async () => {
    if (!state.file) return;
    dispatch({ type: 'START_LOADING', payload: "Step 1: 문서 디지털화 중 (OCR & 레이아웃 분석)..." });

    try {
      const options: ParseOptions = {
        model: state.model,
        mode: "standard",
        ocr: "auto",
        merge_multipage_tables: true,
        coordinates: true,
        chart_recognition: true,
        output_formats: ["html"],
        base64_encoding: state.base64Encoding
      };
      const data = await parseDocument(state.file, state.apiKey, options);
      dispatch({ type: 'SET_PARSING_RESULT', payload: data });
      dispatch({ type: 'SET_STEP', payload: 2 });
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message || "Parsing failed" });
    } finally {
      dispatch({ type: 'STOP_LOADING' });
    }
  };

  const handleRunExtraction = async () => {
    if (!state.file) return;
    dispatch({ type: 'START_LOADING', payload: "Step 2: 정보 추출 중..." });

    try {
        let parsedSchema;
        try {
            parsedSchema = JSON.parse(state.schemaJson);
        } catch (e) {
            throw new Error("Invalid JSON Schema. JSON 형식을 확인해주세요.");
        }

        const validation = validateSchema(parsedSchema);
        if (!validation.valid) {
            throw new Error(
              "스키마 유효성 검증 실패:\n" + validation.errors.join("\n")
            );
        }
        if (validation.warnings.length > 0) {
            console.warn("Schema warnings:", validation.warnings);
        }

        const options: ExtractionOptions = {
            model: "information-extract",
            mode: state.extractionMode,
            schema: parsedSchema,
            location: true,
            location_granularity: "element",
            confidence: true
        };

        const data = await extractInformation(state.file, state.apiKey, options, (status) =>
            dispatch({ type: 'START_LOADING', payload: status })
        );

        dispatch({ type: 'SET_EXTRACTION_RESULT', payload: data });

        try {
            const initialContent = JSON.parse(data.choices[0].message.content);
            dispatch({ type: 'SET_VERIFIED_DATA', payload: initialContent });
        } catch(e) {
            console.error("Failed to parse extracted content");
        }
        dispatch({ type: 'SET_STEP', payload: 3 });
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message || "Extraction failed" });
    } finally {
      dispatch({ type: 'STOP_LOADING' });
    }
  };

  const handleGenerateSchema = async () => {
    if (!state.file) {
        dispatch({ type: 'SET_ERROR', payload: "Please upload a document first." });
        return;
    }
    dispatch({ type: 'START_SCHEMA_GEN' });
    try {
      let generatedSchema = await generateSchema(state.file, state.apiKey, (s) =>
          dispatch({ type: 'START_LOADING', payload: s })
      );

      const validation = validateSchema(generatedSchema);
      if (!validation.valid) {
        generatedSchema = autoFixSchema(generatedSchema);
        console.info("Auto-fixed generated schema to comply with API constraints.");
      }

      dispatch({ type: 'SET_SCHEMA', payload: JSON.stringify(generatedSchema, null, 2) });
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message || "Schema generation failed" });
    } finally {
      dispatch({ type: 'STOP_SCHEMA_GEN' });
      dispatch({ type: 'STOP_LOADING' });
    }
  };

  const handleReset = () => {
    if(confirm("처음부터 다시 시작하시겠습니까? 모든 데이터가 초기화됩니다.")) {
        dispatch({ type: 'RESET' });
    }
  };

  // --- Export ---
  const downloadFile = useCallback((content: string, filename: string, mimeType: string) => {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  }, []);

  const handleDownloadJson = () => {
      if (!state.verifiedData) return;
      downloadFile(JSON.stringify(state.verifiedData, null, 2), `kc-data-${Date.now()}.json`, "application/json");
  };

  const handleDownloadCsv = () => {
      if (!state.verifiedData) return;

      const flattenObject = (obj: any, prefix = ""): Record<string, string> => {
        const result: Record<string, string> = {};
        for (const [key, value] of Object.entries(obj)) {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          if (Array.isArray(value)) {
            value.forEach((item, idx) => {
              if (typeof item === "object" && item !== null) {
                Object.assign(result, flattenObject(item, `${fullKey}[${idx}]`));
              } else {
                result[`${fullKey}[${idx}]`] = String(item ?? "");
              }
            });
          } else if (typeof value === "object" && value !== null) {
            Object.assign(result, flattenObject(value, fullKey));
          } else {
            result[fullKey] = String(value ?? "");
          }
        }
        return result;
      };

      const flat = flattenObject(state.verifiedData);
      const escapeCsv = (val: string) => {
        const sanitized = (val.startsWith("=") || val.startsWith("+") || val.startsWith("-") || val.startsWith("@")) ? "'" + val : val;
        if (sanitized.includes(",") || sanitized.includes('"') || sanitized.includes("\n")) {
          return "\"" + sanitized.replace(/\"/g, '""') + "\"";
        }
        return sanitized;
      };
      const headers = Object.keys(flat);
      const csvRows = [
        headers.map(escapeCsv).join(","),
        headers.map(h => escapeCsv(flat[h])).join(",")
      ];
      downloadFile("\uFEFF" + csvRows.join("\n"), `kc-data-${Date.now()}.csv`, "text/csv;charset=utf-8");
  };

  const isImageFile = useMemo(() => {
    return state.file && state.file.type.startsWith('image/');
  }, [state.file]);

  const canGoToStep = (step: number) => {
      if (step === 1) return true;
      if (step === 2) return !!state.parsingResult;
      if (step === 3) return !!state.extractionResult;
      return false;
  };

  const STEPS = [
    { id: 1, label: "문서 파싱", labelEn: "Digitize" },
    { id: 2, label: "스키마 & 추출", labelEn: "Design & Extract" },
    { id: 3, label: "검증 & 내보내기", labelEn: "Verify & Export" }
  ];

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden font-sans">
      <header className="flex-none sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleReset}>
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <Layout className="w-4 h-4 text-white" />
            </div>
            <div>
                <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
                Upstage DocuParse
                </h1>
                <p className="text-[9px] text-slate-500 font-medium -mt-0.5">KC Safety Standard Digitization</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleReset} className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> 초기화
            </button>
            <button onClick={() => dispatch({ type: 'TOGGLE_KEY_MODAL', payload: true })} className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
              <Settings className="w-3.5 h-3.5" /> Settings
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 container mx-auto px-4 py-4 max-w-[1600px] flex flex-col relative">

        {/* Step Indicator - 3 Steps */}
        <div className="flex items-center justify-between w-full max-w-2xl mx-auto mb-6 px-4">
            {STEPS.map((step, idx, arr) => {
                const isClickable = canGoToStep(step.id);
                const stepId = step.id as WorkflowStep;
                return (
                    <React.Fragment key={step.id}>
                        <button
                            onClick={() => isClickable && dispatch({ type: 'SET_STEP', payload: stepId })}
                            disabled={!isClickable}
                            className={`flex flex-col items-center gap-1.5 relative z-10 group ${state.currentStep >= stepId ? 'text-indigo-600' : 'text-slate-400'} ${!isClickable ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                        >
                            <div className={`
                                w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 border-2
                                ${state.currentStep === stepId
                                    ? 'bg-white border-indigo-600 text-indigo-600 scale-110 shadow-md ring-4 ring-indigo-50'
                                    : state.currentStep > stepId
                                        ? 'bg-indigo-600 border-indigo-600 text-white'
                                        : 'bg-slate-50 border-slate-300 text-slate-400 group-hover:border-slate-400'
                                }
                            `}>
                                {state.currentStep > stepId ? <Check className="w-4 h-4" /> : step.id}
                            </div>
                            <div className="text-center">
                                <span className="text-[10px] font-bold block">{step.label}</span>
                                <span className="text-[8px] text-slate-400 uppercase tracking-wide">{step.labelEn}</span>
                            </div>
                        </button>
                        {idx < arr.length - 1 && (
                            <div className={`flex-1 h-0.5 mx-2 mb-6 transition-colors duration-300 ${state.currentStep > stepId ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>

        {/* Error Banner */}
        {state.error && (
            <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-red-800 mb-1">오류 발생</h4>
                    <pre className="text-xs text-red-700 whitespace-pre-wrap font-mono break-words">{state.error}</pre>
                </div>
                <button onClick={() => dispatch({ type: 'SET_ERROR', payload: null })} className="p-1 hover:bg-red-100 rounded text-red-500">
                    <X className="w-4 h-4" />
                </button>
            </div>
        )}

        <div className="flex-1 flex gap-4 min-h-0">
            {/* --- LEFT CONTROL PANEL (Collapsible) --- */}
            <div className={`flex-none h-full flex flex-col min-h-0 transition-all duration-300 ${panelCollapsed ? 'w-12' : 'w-80'}`}>

                {/* Collapse Toggle */}
                <button
                    onClick={() => setPanelCollapsed(!panelCollapsed)}
                    className="mb-2 flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium text-slate-400 hover:text-slate-600 self-end transition-colors"
                    title={panelCollapsed ? "패널 펼치기" : "패널 접기"}
                >
                    {panelCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <><PanelLeftClose className="w-4 h-4" /> 접기</>}
                </button>

                {/* Collapsed state: minimal icon strip */}
                {panelCollapsed ? (
                    <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center py-4 gap-4">
                        {STEPS.map(step => {
                            const stepId = step.id as WorkflowStep;
                            const isActive = state.currentStep === stepId;
                            const isDone = state.currentStep > stepId;
                            return (
                                <button
                                    key={step.id}
                                    onClick={() => canGoToStep(step.id) && dispatch({ type: 'SET_STEP', payload: stepId })}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                                        ${isActive ? 'bg-indigo-50 border-indigo-500 text-indigo-600' : isDone ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200 text-slate-400'}
                                        ${canGoToStep(step.id) ? 'cursor-pointer hover:shadow' : 'cursor-not-allowed opacity-50'}
                                    `}
                                    title={step.label}
                                >
                                    {isDone ? <Check className="w-3.5 h-3.5" /> : step.id}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    /* Expanded state: full panel */
                    <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden animate-in fade-in">

                        {/* STEP 1: PARSING */}
                        {state.currentStep === 1 && (
                            <>
                                <div className="p-3 border-b border-slate-100 bg-slate-50">
                                    <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Step 1: 문서 파싱</h2>
                                    <p className="text-[10px] text-slate-500 mt-0.5">HWP/PDF를 구조화된 HTML로 변환</p>
                                </div>
                                <div className="p-3 flex-1 overflow-y-auto custom-scrollbar space-y-4">
                                    <FileUploader
                                        onFileSelect={(f) => dispatch({ type: 'SET_FILE', payload: f })}
                                        selectedFile={state.file}
                                        onClear={handleReset}
                                        disabled={state.isLoading || !!state.parsingResult}
                                    />
                                    <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-lg text-[11px] text-blue-700">
                                        <strong>지원 형식:</strong> HWP, HWPX, PDF, 이미지
                                        <br/>
                                        <strong>출력:</strong> HTML 구조, 표, 수식, 에셋
                                    </div>
                                </div>
                                <div className="p-3 border-t border-slate-100">
                                     {!state.parsingResult ? (
                                        <button onClick={handleRunParsing} disabled={!state.file || state.isLoading} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm">
                                            {state.isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <Play className="w-4 h-4" />}
                                            문서 파싱 실행
                                        </button>
                                     ) : (
                                        <button onClick={() => dispatch({ type: 'SET_STEP', payload: 2 })} className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold shadow-md flex items-center justify-center gap-2 text-sm">
                                            다음: 스키마 & 추출 <ArrowRight className="w-4 h-4" />
                                        </button>
                                     )}
                                </div>
                            </>
                        )}

                        {/* STEP 2: SCHEMA + EXTRACT */}
                        {state.currentStep === 2 && (
                            <>
                                <div className="p-3 border-b border-slate-100 bg-slate-50">
                                    <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Step 2: 스키마 설계 & 추출</h2>
                                    <p className="text-[10px] text-slate-500 mt-0.5">추출할 정보 구조 정의 후 실행</p>
                                </div>
                                <div className="flex-1 flex flex-col min-h-0 p-3 gap-3">
                                     <div className="flex justify-between items-center gap-2">
                                         <button
                                            onClick={handleGenerateSchema}
                                            disabled={state.isSchemaGenerating}
                                            className="flex-1 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-indigo-100"
                                         >
                                             {state.isSchemaGenerating ? <Loader2 className="animate-spin w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                                             Auto-Generate
                                         </button>
                                     </div>
                                     <div className="flex-1 border border-slate-200 rounded-lg overflow-hidden min-h-0">
                                         <SchemaBuilder initialSchema={state.schemaJson} onChange={(s) => dispatch({ type: 'SET_SCHEMA', payload: s })} />
                                     </div>
                                     <div className="space-y-1.5">
                                        <label className="text-[10px] font-semibold text-slate-700">Extraction Mode</label>
                                        <div className="flex gap-1.5 bg-slate-100 p-0.5 rounded-lg">
                                            {['standard', 'enhanced'].map(m => (
                                                <button
                                                    key={m}
                                                    onClick={() => dispatch({ type: 'SET_EXTRACTION_MODE', payload: m as any })}
                                                    className={`flex-1 py-1 text-[10px] font-medium rounded capitalize ${state.extractionMode === m ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                                                >
                                                    {m}
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-[9px] text-slate-400">Enhanced: 복잡한 표/스캔 문서용 (느림)</p>
                                     </div>
                                </div>
                                <div className="p-3 border-t border-slate-100 flex gap-2">
                                    <button onClick={() => dispatch({ type: 'SET_STEP', payload: 1 })} className="px-3 py-2 border border-slate-300 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 text-sm">이전</button>
                                    <button onClick={handleRunExtraction} disabled={state.isLoading} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-md disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                                        {state.isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <Play className="w-4 h-4" />}
                                        추출 실행
                                    </button>
                                </div>
                            </>
                        )}

                        {/* STEP 3: VERIFY + EXPORT (Combined) */}
                        {state.currentStep === 3 && (
                            <>
                                <div className="p-3 border-b border-slate-100 bg-slate-50">
                                    <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Step 3: 검증 & 내보내기</h2>
                                    <p className="text-[10px] text-slate-500 mt-0.5">추출 결과 확인/수정 후 다운로드</p>
                                </div>

                                <div className="p-3 flex-1 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
                                    {/* Review Guide */}
                                    <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-lg">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                                            <span className="text-xs font-semibold text-indigo-800">검증 가이드</span>
                                        </div>
                                        <ul className="text-[10px] text-indigo-700 space-y-0.5 ml-6">
                                            <li>우측 패널에서 추출된 값을 <strong>클릭하여 직접 수정</strong> 가능</li>
                                            <li><span className="text-amber-600 font-bold">Low Confidence</span> 경고 항목을 우선 확인</li>
                                            <li>에셋(표/그림) 클릭 시 좌측 원문에서 위치 확인</li>
                                        </ul>
                                    </div>

                                    {/* Export Section */}
                                    <div className="space-y-2">
                                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">내보내기</h4>
                                        <button onClick={handleDownloadJson} disabled={!state.verifiedData} className="w-full py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors text-xs disabled:opacity-50">
                                            <Download className="w-3.5 h-3.5" /> JSON Export
                                        </button>
                                        <button onClick={handleDownloadCsv} disabled={!state.verifiedData} className="w-full py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors text-xs disabled:opacity-50">
                                            <Download className="w-3.5 h-3.5" /> CSV Export
                                        </button>
                                    </div>
                                </div>

                                <div className="p-3 border-t border-slate-100 flex gap-2">
                                    <button
                                        onClick={() => {
                                            dispatch({ type: 'CLEAR_EXTRACTION' });
                                            dispatch({ type: 'SET_STEP', payload: 2 });
                                        }}
                                        className="px-3 py-2 border border-slate-300 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 text-xs"
                                    >
                                        스키마 수정
                                    </button>
                                    <button onClick={handleReset} className="flex-1 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl font-semibold flex items-center justify-center gap-1.5 text-xs">
                                        <RotateCcw className="w-3.5 h-3.5" /> 새 문서
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* --- RIGHT VIEWER PANEL --- */}
            <div className="flex-1 h-full flex flex-col min-h-0 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {/* PREVIEW / PARSING RESULT (Step 1, 2) */}
                {(state.currentStep === 1 || state.currentStep === 2) && (
                    <div className="flex-1 flex flex-col min-h-0">
                         <div className="flex-none p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                             <h3 className="font-semibold text-slate-700 text-sm">문서 소스</h3>
                             {state.parsingResult && <span className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> 파싱 완료</span>}
                         </div>
                         <div className="flex-1 overflow-auto bg-slate-50 p-4 custom-scrollbar relative">
                             {state.parsingResult ? (
                                <div className="parsed-content bg-white shadow-sm p-8 max-w-4xl mx-auto border border-slate-200 rounded-lg min-h-[500px]" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(state.parsingResult.content.html, { ADD_TAGS: ['figure', 'figcaption', 'math', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'mover', 'munder'], ADD_ATTR: ['data-category', 'data-page', 'data-element-id'] }) }} />
                             ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                    <ScanLine className="w-12 h-12 mb-4 opacity-20" />
                                    <p className="text-sm">문서를 업로드하여 디지털화를 시작하세요.</p>
                                </div>
                             )}
                         </div>
                    </div>
                )}

                {/* EXTRACTION & VERIFICATION VIEWER (Step 3) */}
                {state.currentStep === 3 && state.extractionResult && state.file && state.previewUrl && (
                    <div className="flex-1 p-0 h-full overflow-hidden bg-slate-50">
                        <ExtractionViewer
                            response={state.extractionResult}
                            parsingResult={state.parsingResult}
                            file={state.file}
                            previewUrl={state.previewUrl}
                            initialData={state.verifiedData}
                            onDataChange={(newData) => dispatch({ type: 'SET_VERIFIED_DATA', payload: newData })}
                            onBack={() => {
                                dispatch({ type: 'CLEAR_EXTRACTION' });
                                dispatch({ type: 'SET_STEP', payload: 2 });
                            }}
                            onEditSchema={() => {
                                dispatch({ type: 'CLEAR_EXTRACTION' });
                                dispatch({ type: 'SET_STEP', payload: 2 });
                            }}
                        />
                    </div>
                )}

                {state.isLoading && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                        <p className="text-lg font-semibold text-slate-700 animate-pulse">{state.loadingMessage}</p>
                    </div>
                )}
            </div>
        </div>
      </main>

      <ApiKeyModal
          isOpen={state.isKeyModalOpen}
          onClose={() => dispatch({ type: 'TOGGLE_KEY_MODAL', payload: false })}
          currentKey={state.apiKey}
          onSave={(key) => dispatch({ type: 'SET_API_KEY', payload: key })}
      />
    </div>
  );
}

export default App;
