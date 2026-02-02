
import React, { useState, useEffect, useRef } from "react";
import DOMPurify from "dompurify";
import { ExtractionResponse, MetadataValue, UpstageResponse, Coordinate } from "../types";
import { 
  AlertTriangle, MousePointerClick, Check, 
  Image as ImageIcon, Grid, ArrowLeft, Info, Copy, 
  RotateCcw, FileText, Sigma
} from "lucide-react";

interface ExtractionViewerProps {
  response: ExtractionResponse;
  parsingResult?: UpstageResponse | null; 
  file: File;
  previewUrl: string;
  onDataChange?: (data: any) => void; 
  initialData?: any; 
  onBack?: () => void;
  onEditSchema?: () => void; 
}

interface NestedMetadata {
  _value?: any;
  confidence?: 'high' | 'low';
  coordinates?: Coordinate[];
  page?: number;
  word_coordinates?: Coordinate[][];
  [key: string]: NestedMetadata | any;
}

const ExtractionViewer: React.FC<ExtractionViewerProps> = ({ 
  response, 
  parsingResult, 
  file, 
  previewUrl, 
  onDataChange, 
  initialData, 
  onBack, 
  onEditSchema 
}) => {
  // --- State ---
  const [extractedData, setExtractedData] = useState<any>(initialData || null);
  const [metadataMap, setMetadataMap] = useState<Map<string, MetadataValue>>(new Map());
  
  // Selection State
  const [activeTab, setActiveTab] = useState<'parsed' | 'preview'>('parsed'); 
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);

  // Derived Assets
  const assets = parsingResult?.elements.filter(
    el => ['figure', 'chart', 'table', 'equation'].includes(el.category) && el.base64_encoding
  ) || [];

  const isImageFile = file.type.startsWith('image/');
  
  // Refs for auto-scrolling
  const previewRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<HTMLDivElement>(null);

  // --- Initialization ---
  useEffect(() => {
    if (isImageFile) setActiveTab('preview');
    else setActiveTab('parsed');

    if (initialData) {
        setExtractedData(initialData);
    } else {
        try {
            if (response.choices?.[0]?.message?.content) {
                const content = JSON.parse(response.choices[0].message.content);
                setExtractedData(content);
                if (onDataChange) onDataChange(content);
            }
        } catch (e) {
            console.error("Failed to parse extracted data", e);
        }
    }

    try {
        if (response.choices?.[0]?.message?.tool_calls) {
            const toolCall = response.choices[0].message.tool_calls[0];
            if (toolCall.function.name === 'additional_values') {
                const args: NestedMetadata = JSON.parse(toolCall.function.arguments);
                setMetadataMap(new Map(Object.entries(flattenMetadata(args))));
            }
        }
    } catch (e) {
        console.error("Failed to parse metadata", e);
    }
  }, [response, initialData]);

  // MathJax Trigger
  useEffect(() => {
    if (window.MathJax) {
      setTimeout(() => window.MathJax.typesetPromise().catch(() => {}), 100);
    }
  }, [extractedData, selectedAssetId, activeTab]);

  // Asset-HTML Source Linking: scroll to and highlight selected asset in HTML source
  // Strategy: try data-element-id first, then fall back to category+index matching
  useEffect(() => {
    if (selectedAssetId === null || activeTab !== 'parsed' || !sourceRef.current) return;

    let targetEl: Element | null = null;

    // Strategy 1: Try data-element-id attribute (if Upstage HTML includes it)
    targetEl = sourceRef.current.querySelector(`[data-element-id="${selectedAssetId}"]`);

    // Strategy 2: Fall back to category + position index matching
    if (!targetEl && parsingResult) {
      const asset = parsingResult.elements.find(el => el.id === selectedAssetId);
      if (asset) {
        // Count how many elements of this category appear before this one
        const sameCategoryBefore = parsingResult.elements.filter(
          el => el.category === asset.category && el.id < asset.id
        );
        const categoryIndex = sameCategoryBefore.length;

        // Map category to CSS selectors for matching DOM elements
        const selectorMap: Record<string, string> = {
          'table': 'table',
          'figure': 'figure, .parsed-content > img',
          'chart': 'table, figure',
          'equation': '[data-category="equation"], p:has(math), .parsed-content math',
        };
        const selector = selectorMap[asset.category];
        if (selector) {
          const candidates = sourceRef.current.querySelectorAll(selector);
          if (categoryIndex < candidates.length) {
            targetEl = candidates[categoryIndex];
          }
        }
      }
    }

    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (targetEl as HTMLElement).classList.add('asset-highlight');
      const timer = setTimeout(() => {
        (targetEl as HTMLElement).classList.remove('asset-highlight');
      }, 3000);
      return () => {
        clearTimeout(timer);
        (targetEl as HTMLElement)?.classList.remove('asset-highlight');
      };
    }
  }, [selectedAssetId, activeTab, parsingResult]);

  // --- Helpers ---
  const flattenMetadata = (obj: NestedMetadata, prefix = ''): Record<string, MetadataValue> => {
    let result: Record<string, MetadataValue> = {};
    for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            const newKey = prefix ? `${prefix}.${key}` : key;
            const value = obj[key] as NestedMetadata;

            if ('_value' in value) {
                // It's a leaf node with metadata
                result[newKey] = value as MetadataValue;
            } else if (Array.isArray(value)) {
                 // It's an array
                 value.forEach((item: any, index: number) => {
                     const arrayKey = `${newKey}[${index}]`;
                     if (item && typeof item === 'object' && '_value' in item) {
                         result[arrayKey] = item as MetadataValue;
                     } else if (item && typeof item === 'object') {
                         Object.assign(result, flattenMetadata(item, arrayKey));
                     }
                 });
            } else {
                // Recurse
                Object.assign(result, flattenMetadata(value, newKey));
            }
        }
    }
    return result;
  };

  const handleValueChange = (path: string, newValue: string) => {
    const newData = JSON.parse(JSON.stringify(extractedData));
    const setPath = (obj: any, pathParts: string[], val: any) => {
        const [head, ...tail] = pathParts;
        if (head.includes('[')) {
            const [key, indexStr] = head.split('[');
            const index = parseInt(indexStr.replace(']', ''));
            if (!obj[key]) obj[key] = [];
            if (tail.length === 0) {
                obj[key][index] = val;
            } else {
                if (!obj[key][index]) obj[key][index] = {};
                setPath(obj[key][index], tail, val);
            }
        } else {
            if (tail.length === 0) {
                obj[head] = val;
            } else {
                if (!obj[head]) obj[head] = {};
                setPath(obj[head], tail, val);
            }
        }
    };
    const parts = path.split('.').filter(p => p); 
    setPath(newData, parts, newValue);
    setExtractedData(newData);
    if (onDataChange) onDataChange(newData);
  };

  // --- Bounding Box Helper ---
  const renderBoundingBox = (
    coords: Coordinate[],
    className: string,
    key?: string
  ): React.ReactNode => {
    if (!coords || coords.length < 4) return null;
    const xs = coords.map(c => c.x);
    const ys = coords.map(c => c.y);
    return (
      <div
        key={key}
        className={`absolute ${className}`}
        style={{
          left: `${Math.min(...xs) * 100}%`,
          top: `${Math.min(...ys) * 100}%`,
          width: `${(Math.max(...xs) - Math.min(...xs)) * 100}%`,
          height: `${(Math.max(...ys) - Math.min(...ys)) * 100}%`,
        }}
      />
    );
  };

  // --- Rendering Components ---

  const renderRecursiveFields = (data: any, path: string = ''): React.ReactNode => {
    if (Array.isArray(data)) {
        return (
            <div className="space-y-3 pl-2 border-l-2 border-slate-100">
                {data.map((item, idx) => (
                    <div key={idx} className="relative">
                         <div className="absolute -left-[17px] top-3 w-3 h-0.5 bg-slate-200"></div>
                         <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                            <span className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Item {idx + 1}</span>
                            {renderRecursiveFields(item, `${path}[${idx}]`)}
                         </div>
                    </div>
                ))}
            </div>
        );
    } else if (typeof data === 'object' && data !== null) {
        return (
            <div className="space-y-2">
                {Object.entries(data).map(([key, value]) => {
                    const currentPath = path ? `${path}.${key}` : key;
                    const meta = metadataMap.get(currentPath);
                    const isSelected = selectedPath === currentPath;
                    const confidence = meta?.confidence;

                    return (
                        <div key={key} className={`transition-all duration-200 ${typeof value === 'object' && value !== null ? 'mt-4' : ''}`}>
                            {typeof value === 'object' && value !== null ? (
                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-2">
                                        {key.replace(/_/g, ' ')}
                                    </h4>
                                    {renderRecursiveFields(value, currentPath)}
                                </div>
                            ) : (
                                <div 
                                    className={`
                                        group flex items-start gap-3 p-2 rounded-md border cursor-pointer transition-all
                                        ${isSelected 
                                            ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-200' 
                                            : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-sm'
                                        }
                                    `}
                                    onClick={() => {
                                        setSelectedPath(currentPath);
                                        setSelectedAssetId(null);
                                        // Auto-switch to visual tab if image and coordinates exist
                                        if (isImageFile && meta?.coordinates) setActiveTab('preview');
                                    }}
                                >
                                    <div className="flex-1 min-w-0">
                                        <label className="text-xs font-semibold text-slate-600 mb-0.5 block truncate" title={key}>
                                            {key.replace(/_/g, ' ')}
                                        </label>
                                        <input 
                                            type="text"
                                            value={String(value)}
                                            onChange={(e) => handleValueChange(currentPath, e.target.value)}
                                            className={`
                                                w-full bg-transparent border-b border-transparent focus:border-indigo-500 focus:outline-none text-sm text-slate-900 font-medium
                                                ${isSelected ? 'border-indigo-300' : 'group-hover:border-slate-300'}
                                            `}
                                        />
                                    </div>
                                    
                                    {/* Status Indicator */}
                                    <div className="flex flex-col items-end gap-1 pt-1">
                                        {confidence === 'low' && (
                                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px] font-bold whitespace-nowrap" title="Low Confidence">
                                                <AlertTriangle className="w-3 h-3" /> Check
                                            </div>
                                        )}
                                        {meta?.coordinates && isImageFile && (
                                            <MousePointerClick className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-600' : 'text-slate-300'}`} />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }
    return null;
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-0 bg-slate-100 border-t border-slate-200">
      {/* Highlight style for asset-HTML linking */}
      <style>{`
        .asset-highlight {
          outline: 3px solid #6366f1;
          outline-offset: 2px;
          background-color: rgba(99, 102, 241, 0.1);
          border-radius: 4px;
          transition: outline-color 0.5s ease-out, background-color 0.5s ease-out;
        }
      `}</style>

      {/* --- LEFT PANEL: DOCUMENT SOURCE --- */}
      <div className="lg:w-1/2 flex flex-col border-r border-slate-200 bg-slate-200/50">
        {/* Toolbar */}
        <div className="flex-none p-2 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm z-10">
           <div className="flex items-center gap-2">
               {onBack && (
                   <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
                       <ArrowLeft className="w-4 h-4" />
                   </button>
               )}
               <div className="flex bg-slate-100 p-1 rounded-lg">
                   <button 
                       onClick={() => setActiveTab('parsed')}
                       className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all ${activeTab === 'parsed' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}
                   >
                       <FileText className="w-3.5 h-3.5" /> HTML Source
                   </button>
                   {isImageFile ? (
                        <button 
                            onClick={() => setActiveTab('preview')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all ${activeTab === 'preview' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}
                        >
                            <MousePointerClick className="w-3.5 h-3.5" /> Image Overlay
                        </button>
                   ) : (
                       <div className="px-3 py-1.5 text-[10px] text-slate-400 flex items-center gap-1 cursor-not-allowed opacity-60">
                            <ImageIcon className="w-3 h-3" /> Visual (Image Only)
                       </div>
                   )}
               </div>
           </div>
           <div className="text-xs font-medium text-slate-500 hidden sm:block">
               {isImageFile ? "Interactive View" : "Document Structure View"}
           </div>
        </div>

        {/* Viewport */}
        <div className="flex-1 overflow-auto relative flex items-center justify-center p-4">
             {activeTab === 'preview' && isImageFile ? (
                 <div className="relative shadow-lg rounded-sm overflow-hidden bg-white max-w-full" ref={previewRef}>
                     <img src={previewUrl} alt="Document" className="max-w-full h-auto block" />
                     {/* Overlay Layer */}
                     <div className="absolute inset-0 pointer-events-none">
                         {/* Highlight for extracted data — bounding box from 4 corners */}
                         {selectedPath && (() => {
                             const meta = metadataMap.get(selectedPath);
                             return meta?.coordinates
                               ? renderBoundingBox(meta.coordinates, 'bg-indigo-500/15 border-2 border-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.4)] rounded-sm')
                               : null;
                         })()}
                         {/* Word-level highlights if available */}
                         {selectedPath && metadataMap.get(selectedPath)?.word_coordinates?.map((wordCoords, i) =>
                             renderBoundingBox(wordCoords, 'bg-blue-400/20 border border-blue-400 rounded-[1px]', `word-${i}`)
                         )}
                     </div>
                 </div>
             ) : (
                 <div className="w-full h-full bg-white rounded-lg shadow-sm p-8 overflow-auto custom-scrollbar relative" ref={sourceRef}>
                     <div className="absolute top-2 right-2 text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-400 font-mono">
                         {isImageFile ? "HTML Representation" : "Converted HWP/PDF Structure"}
                     </div>
                     <div
                        className="parsed-content"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(
                            parsingResult?.content.html || "<p class='text-slate-400 italic text-center'>No Content</p>",
                            { ADD_TAGS: ['figure', 'figcaption', 'math', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'mover', 'munder'], ADD_ATTR: ['data-category', 'data-page', 'data-element-id'] }
                        ) }}
                     />
                 </div>
             )}
        </div>
      </div>

      {/* --- RIGHT PANEL: UNIFIED VERIFICATION LIST --- */}
      <div className="lg:w-1/2 flex flex-col bg-white">
          <div className="flex-none p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" /> Verify & Correct
              </h3>
              <div className="flex items-center gap-2">
                  {onEditSchema && (
                      <button onClick={onEditSchema} className="text-xs font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-1 px-2 py-1 hover:bg-white rounded border border-transparent hover:border-slate-200 transition-all">
                          <RotateCcw className="w-3 h-3" /> Edit Schema
                      </button>
                  )}
                  <div className="text-[10px] bg-slate-200 px-2 py-1 rounded-full text-slate-600 font-mono">
                      {assets.length} Assets
                  </div>
              </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-white">
              
              {/* SECTION 1: EXTRACTED DATA FIELDS */}
              <div className="mb-8">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                      Extracted Data
                  </h4>
                  {extractedData ? (
                      renderRecursiveFields(extractedData)
                  ) : (
                      <div className="p-4 text-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg">
                          No data extracted.
                      </div>
                  )}
              </div>

              {/* SECTION 2: DOCUMENT ASSETS (Tables, Equations, Figures) */}
              <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex justify-between items-center">
                      <span>Detected Assets</span>
                      <span className="text-[10px] font-normal normal-case text-slate-400">Figures, Tables, Equations</span>
                  </h4>
                  
                  <div className="grid grid-cols-1 gap-4">
                      {assets.map((asset) => (
                          <div 
                              key={asset.id}
                              onClick={() => {
                                  setSelectedAssetId(asset.id);
                                  setSelectedPath(null);
                                  setActiveTab('parsed');
                              }}
                              className={`
                                  relative flex gap-4 p-3 rounded-lg border cursor-pointer transition-all
                                  ${selectedAssetId === asset.id 
                                      ? 'border-indigo-500 ring-2 ring-indigo-100 bg-indigo-50/30' 
                                      : 'border-slate-200 hover:border-indigo-300 hover:shadow-md'
                                  }
                              `}
                          >
                              {/* Asset Thumbnail */}
                              <div className="w-24 h-24 bg-white border border-slate-100 rounded-md flex items-center justify-center p-1 shrink-0 overflow-hidden">
                                  <img 
                                    src={`data:image/png;base64,${asset.base64_encoding}`} 
                                    alt={asset.category} 
                                    className="max-w-full max-h-full object-contain" 
                                  />
                              </div>

                              {/* Asset Info */}
                              <div className="flex-1 min-w-0 flex flex-col">
                                  <div className="flex justify-between items-start mb-2">
                                      <span className={`
                                          text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1
                                          ${asset.category === 'equation' ? 'bg-purple-100 text-purple-700' : 
                                            asset.category === 'table' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}
                                      `}>
                                          {asset.category === 'equation' && <Sigma className="w-3 h-3" />}
                                          {asset.category === 'table' && <Grid className="w-3 h-3" />}
                                          {asset.category === 'figure' && <ImageIcon className="w-3 h-3" />}
                                          {asset.category}
                                      </span>
                                      <span className="text-[10px] text-slate-400">Page {asset.page}</span>
                                  </div>

                                  {/* Special Render for Equations */}
                                  {asset.category === 'equation' ? (
                                      <div className="flex-1 bg-white border border-slate-100 rounded p-2 overflow-x-auto">
                                           {asset.content.html ? (
                                                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(asset.content.html, { ADD_TAGS: ['math', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'mover', 'munder'] }) }} className="text-sm" />
                                           ) : (
                                                <code className="text-[10px] text-slate-500">{asset.content.text}</code>
                                           )}
                                      </div>
                                  ) : (
                                      <div className="flex-1">
                                          <p className="text-xs text-slate-600 line-clamp-3 font-mono bg-slate-50 p-2 rounded">
                                              {asset.content.text || asset.content.html || "(No text content)"}
                                          </p>
                                      </div>
                                  )}
                                  
                                  {/* Copy Button */}
                                  <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(asset.content.text || "");
                                    }}
                                    className="mt-2 self-end flex items-center gap-1 text-[10px] font-medium text-slate-400 hover:text-indigo-600"
                                  >
                                      <Copy className="w-3 h-3" /> Copy Text
                                  </button>
                              </div>
                          </div>
                      ))}
                      
                      {assets.length === 0 && (
                          <div className="text-center py-8 text-slate-400">
                              <Info className="w-8 h-8 mx-auto mb-2 opacity-20" />
                              <p className="text-xs">No visual assets detected.</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default ExtractionViewer;
