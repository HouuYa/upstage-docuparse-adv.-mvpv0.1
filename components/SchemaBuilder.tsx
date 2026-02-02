
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Trash2, Code, List, Maximize2, Minimize2, X, AlertCircle, Save, FolderOpen, ChevronDown } from "lucide-react";
import { PRESET_SCHEMAS } from "../constants";

interface SchemaBuilderProps {
  initialSchema: string;
  onChange: (schema: string) => void;
}

interface SchemaField {
  id: string;
  name: string;
  description: string;
  type: "string" | "number" | "integer" | "boolean" | "array" | "object";
  // Preserve the original JSON definition for complex types (array with object items)
  _originalDef?: any;
}

const SchemaBuilder: React.FC<SchemaBuilderProps> = ({ initialSchema, onChange }) => {
  const [mode, setMode] = useState<"visual" | "code">("code");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Library State
  const [savedSchemas, setSavedSchemas] = useState<Record<string, any>>({});
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [newSchemaName, setNewSchemaName] = useState("");
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  // Separate states for each mode
  const [codeValue, setCodeValue] = useState(initialSchema);
  const [visualFields, setVisualFields] = useState<SchemaField[]>([]);

  // Use a ref to track if the update came from internal typing
  const isInternalUpdate = useRef(false);

  // --- Initialization ---
  useEffect(() => {
    // Load saved schemas from localStorage
    const saved = localStorage.getItem("upstage_saved_schemas");
    if (saved) {
      try {
        setSavedSchemas(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load saved schemas");
      }
    }
  }, []);

  // Parse JSON to Fields — preserves original definition for complex types
  const parseJsonToFields = useCallback((jsonStr: string): SchemaField[] => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.type === "object" && parsed.properties) {
        return Object.entries(parsed.properties).map(([key, value]: [string, any]) => {
          const field: SchemaField = {
            id: Math.random().toString(36).substr(2, 9),
            name: key,
            description: value.description || "",
            type: value.type || "string",
          };
          // Preserve original definition for array (with object items) so we don't lose nested structure
          if (value.type === "array" && value.items) {
            field._originalDef = value;
          }
          return field;
        });
      }
    } catch (e) { }
    return [];
  }, []);

  // Sync from props
  useEffect(() => {
    if (initialSchema !== codeValue) {
        setCodeValue(initialSchema);
        const fields = parseJsonToFields(initialSchema);
        if (fields.length > 0) setVisualFields(fields);
    }
  }, [initialSchema, parseJsonToFields, codeValue]);

  // --- Logic ---
  const convertFieldsToJson = useCallback((fields: SchemaField[]) => {
    const properties: any = {};
    fields.forEach((f) => {
      if (f.type === "array" && f._originalDef) {
        // Preserve the original nested structure, but update description
        properties[f.name] = { ...f._originalDef, description: f.description };
      } else if (f.type === "array") {
        properties[f.name] = {
          type: "array",
          description: f.description,
          items: {
            type: "object",
            properties: {
              "value": { type: "string", description: "Value" }
            }
          }
        };
      } else if (f.type === "object") {
        // Convert object to array wrapper to comply with API constraints
        properties[f.name] = {
          type: "array",
          description: f.description + " (auto-wrapped from object)",
          items: {
            type: "object",
            properties: {
              "value": { type: "string", description: "Value" }
            }
          }
        };
      } else {
        properties[f.name] = {
          type: f.type,
          description: f.description,
        };
      }
    });

    return JSON.stringify({
      type: "object",
      properties,
      required: fields.map(f => f.name)
    }, null, 2);
  }, []);

  const handleModeSwitch = (newMode: "visual" | "code") => {
    if (newMode === "visual") {
      const fields = parseJsonToFields(codeValue);
      setVisualFields(fields);
    } else {
      const json = convertFieldsToJson(visualFields);
      setCodeValue(json);
      onChange(json);
    }
    setMode(newMode);
  };

  const handleCodeChange = (val: string) => {
    setCodeValue(val);
    try {
        JSON.parse(val);
        setJsonError(null);
        isInternalUpdate.current = true;
        onChange(val); 
    } catch(e: any) {
        setJsonError(e.message);
        isInternalUpdate.current = true;
        onChange(val); 
    }
  };

  const handleFieldChange = (id: string, key: keyof SchemaField, val: any) => {
    setVisualFields(prev => {
        const newFields = prev.map(f => f.id === id ? { ...f, [key]: val } : f);
        const json = convertFieldsToJson(newFields);
        
        setCodeValue(json); // Update local code view
        isInternalUpdate.current = true; // Flag that this update is internal
        onChange(json); // Propagate to parent
        
        return newFields;
    });
  };

  const handleAddField = () => {
    const newField: SchemaField = {
      id: Math.random().toString(36).substr(2, 9),
      name: `field_${visualFields.length + 1}`,
      description: "",
      type: "string",
    };
    const newFields = [...visualFields, newField];
    setVisualFields(newFields);
    const json = convertFieldsToJson(newFields);
    setCodeValue(json);
    isInternalUpdate.current = true;
    onChange(json);
  };

  const handleRemoveField = (id: string) => {
    const newFields = visualFields.filter(f => f.id !== id);
    setVisualFields(newFields);
    const json = convertFieldsToJson(newFields);
    setCodeValue(json);
    isInternalUpdate.current = true;
    onChange(json);
  };

  // --- Library Logic ---
  const loadSchema = (schema: object) => {
      const jsonStr = JSON.stringify(schema, null, 2);
      setCodeValue(jsonStr);
      setVisualFields(parseJsonToFields(jsonStr));
      isInternalUpdate.current = true;
      onChange(jsonStr);
      setJsonError(null);
  };

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const key = e.target.value;
      setSelectedPreset(key);
      if (!key) return;

      if (PRESET_SCHEMAS[key as keyof typeof PRESET_SCHEMAS]) {
          loadSchema(PRESET_SCHEMAS[key as keyof typeof PRESET_SCHEMAS]);
      } else if (savedSchemas[key]) {
          loadSchema(savedSchemas[key]);
      }
  };

  const handleSaveSchema = () => {
      if (!newSchemaName.trim()) return;
      try {
          const schemaObj = JSON.parse(codeValue);
          const updated = { ...savedSchemas, [newSchemaName]: schemaObj };
          setSavedSchemas(updated);
          localStorage.setItem("upstage_saved_schemas", JSON.stringify(updated));
          setIsSaveModalOpen(false);
          setNewSchemaName("");
          setSelectedPreset(newSchemaName); // Select the newly saved one
      } catch (e) {
          alert("Cannot save invalid JSON");
      }
  };

  const handleDeleteSchema = (key: string) => {
      if (!confirm(`Delete schema "${key}"?`)) return;
      const { [key]: deleted, ...rest } = savedSchemas;
      setSavedSchemas(rest);
      localStorage.setItem("upstage_saved_schemas", JSON.stringify(rest));
      if (selectedPreset === key) setSelectedPreset("");
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar */}
      <div className="flex-none flex flex-wrap items-center justify-between p-2 bg-slate-100 border-b border-slate-200 gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <div className="relative">
                <FolderOpen className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <select 
                    value={selectedPreset} 
                    onChange={handlePresetChange}
                    className="pl-9 pr-8 py-1.5 text-xs font-medium border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none min-w-[180px]"
                >
                    <option value="">-- Load Schema --</option>
                    <optgroup label="Standard Presets">
                        {Object.keys(PRESET_SCHEMAS).map(k => <option key={k} value={k}>{k}</option>)}
                    </optgroup>
                    {Object.keys(savedSchemas).length > 0 && (
                        <optgroup label="My Saved Schemas">
                            {Object.keys(savedSchemas).map(k => <option key={k} value={k}>{k}</option>)}
                        </optgroup>
                    )}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
            </div>

            <button 
                onClick={() => setIsSaveModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-600 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
                title="Save current schema"
            >
                <Save className="w-3.5 h-3.5" />
                Save
            </button>

            {savedSchemas[selectedPreset] && (
                <button 
                    onClick={() => handleDeleteSchema(selectedPreset)}
                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                    title="Delete saved schema"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            )}
        </div>

        <div className="flex items-center gap-2">
             <div className="flex gap-1 bg-white rounded-md p-0.5 border border-slate-300">
                <button
                    onClick={() => handleModeSwitch("visual")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    mode === "visual"
                        ? "bg-indigo-50 text-indigo-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                >
                    <List className="w-3.5 h-3.5" />
                    Visual
                </button>
                <button
                    onClick={() => handleModeSwitch("code")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    mode === "code"
                        ? "bg-indigo-50 text-indigo-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                >
                    <Code className="w-3.5 h-3.5" />
                    Code
                </button>
            </div>

            {jsonError && mode === 'code' && (
                <div className="hidden sm:flex items-center gap-1 text-[10px] text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100">
                    <AlertCircle className="w-3 h-3" />
                    <span>Invalid JSON</span>
                </div>
            )}
            
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 hover:bg-slate-200 text-slate-500 rounded transition-colors"
                title={isExpanded ? "Close Full Screen" : "Expand to Full Screen"}
            >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {mode === "visual" ? (
          <div className="h-full flex flex-col">
             {/* Warning about Root Objects */}
             <div className="bg-amber-50 px-4 py-2 border-b border-amber-100 flex items-center gap-2 text-[11px] text-amber-800">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Note: Root-level properties must be string, number, array, or boolean. Objects are not allowed at the root level.</span>
             </div>

             <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50">
                {visualFields.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        <p className="text-sm">No fields defined.</p>
                        <p className="text-xs mt-1">Click "Add Field" or load a preset.</p>
                    </div>
                ) : (
                    visualFields.map((field) => (
                    <div
                        key={field.id}
                        className="group flex flex-col gap-2 p-3 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-indigo-300 hover:shadow-md transition-all"
                    >
                        <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={field.name}
                            onChange={(e) => handleFieldChange(field.id, "name", e.target.value)}
                            className="flex-1 text-sm font-semibold text-slate-800 bg-transparent border-b border-transparent focus:border-indigo-500 focus:outline-none px-1"
                            placeholder="Field Name"
                        />
                        <select
                            value={field.type}
                            onChange={(e) => handleFieldChange(field.id, "type", e.target.value)}
                            className="text-xs border border-slate-300 rounded px-2 py-1 bg-slate-50 text-slate-600 focus:ring-1 focus:ring-indigo-500 outline-none"
                        >
                            <option value="string">String</option>
                            <option value="number">Number</option>
                            <option value="integer">Integer</option>
                            <option value="boolean">Boolean</option>
                            <option value="array">Array</option>
                        </select>
                        <button
                            onClick={() => handleRemoveField(field.id)}
                            className="p-1 text-slate-400 hover:text-red-500 transition-colors opacity-10 sm:opacity-0 group-hover:opacity-100"
                            title="Remove Field"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                        </div>
                        <input
                        type="text"
                        value={field.description}
                        onChange={(e) => handleFieldChange(field.id, "description", e.target.value)}
                        className="w-full text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded px-2 py-1.5 focus:border-indigo-400 focus:bg-white focus:outline-none transition-colors"
                        placeholder="Description"
                        />
                        {field.type === "array" && field._originalDef?.items?.properties && (
                            <div className="mt-1 px-2 py-1.5 bg-indigo-50 border border-indigo-100 rounded text-[10px] text-indigo-700">
                                <span className="font-semibold">Array items:</span>{" "}
                                {Object.keys(field._originalDef.items.properties).join(", ")}
                                <span className="text-indigo-400 ml-1">(edit in Code mode for details)</span>
                            </div>
                        )}
                    </div>
                    ))
                )}
            </div>
            <div className="p-3 border-t border-slate-200 bg-white">
                <button
                    onClick={handleAddField}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-all text-xs font-semibold"
                >
                    <Plus className="w-4 h-4" />
                    Add Field
                </button>
            </div>
          </div>
        ) : (
          <textarea
            value={codeValue}
            onChange={(e) => handleCodeChange(e.target.value)}
            className="w-full h-full p-4 text-[12px] font-mono leading-relaxed bg-slate-900 text-slate-50 outline-none resize-none"
            spellCheck={false}
            placeholder='{ "type": "object", "properties": { ... } }'
          />
        )}
      </div>

      {/* Save Modal */}
      {isSaveModalOpen && (
          <div className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-5 animate-in zoom-in-95">
                  <h3 className="text-sm font-bold text-slate-800 mb-3">Save Schema to Library</h3>
                  <input 
                    type="text" 
                    value={newSchemaName}
                    onChange={(e) => setNewSchemaName(e.target.value)}
                    placeholder="Enter schema name (e.g., My Invoice)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm mb-4 focus:ring-2 focus:ring-indigo-500 outline-none"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                      <button onClick={() => setIsSaveModalOpen(false)} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
                      <button onClick={handleSaveSchema} disabled={!newSchemaName.trim()} className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded disabled:opacity-50">Save</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default SchemaBuilder;
