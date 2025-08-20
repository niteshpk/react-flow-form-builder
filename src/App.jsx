import React, { useState, useCallback } from "react";
import Builder from "./components/Builder.jsx";
import Preview from "./components/Preview.jsx";
import { getSampleSchema } from "./lib/schema.js";
import { readTextFile } from "./lib/storage.js";

export default function App() {
  const [mode, setMode] = useState("builder"); // 'builder' | 'preview'
  const [schema, setSchema] = useState([]); // ordered fields
  const [submitMeta, setSubmitMeta] = useState({
    label: "Submit",
    color: "#2563eb",
  });
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [previewValues, setPreviewValues] = useState({});

  // Request latest schema + submit from Builder, then show Preview
  const goPreview = useCallback(() => {
    let gotA = false,
      gotB = false;
    const onSchema = (e) => {
      setSchema(e.detail || []);
      gotA = true;
      maybe();
    };
    const onSubmit = (e) => {
      setSubmitMeta(e.detail || { label: "Submit", color: "#2563eb" });
      gotB = true;
      maybe();
    };
    const cleanup = () => {
      window.removeEventListener("xyflow:current-schema", onSchema);
      window.removeEventListener("xyflow:current-submit", onSubmit);
    };
    const maybe = () => {
      if (gotA && gotB) {
        cleanup();
        setMode("preview");
      }
    };
    window.addEventListener("xyflow:current-schema", onSchema);
    window.addEventListener("xyflow:current-submit", onSubmit);
    window.dispatchEvent(new Event("xyflow:request-schema"));
    window.dispatchEvent(new Event("xyflow:request-submit"));
  }, []);

  const onExport = useCallback((exported) => {
    setSchema(exported);
  }, []);

  const onCopy = useCallback((exported) => {
    navigator.clipboard
      .writeText(JSON.stringify(exported, null, 2))
      .then(() => alert("Schema copied to clipboard"))
      .catch(() => alert("Copy failed"));
  }, []);

  const onImportSchema = useCallback(() => setImportOpen(true), []);

  const handleImportText = useCallback(() => {
    try {
      const parsed = JSON.parse(importText);
      window.dispatchEvent(
        new CustomEvent("xyflow:import-schema", { detail: parsed })
      );
      setImportOpen(false);
      setImportText("");
    } catch {
      alert("Invalid JSON");
    }
  }, [importText]);

  const handleImportFromFile = useCallback(async () => {
    try {
      const text = await readTextFile([".json"]);
      const parsed = JSON.parse(text);
      window.dispatchEvent(
        new CustomEvent("xyflow:import-schema", { detail: parsed })
      );
      setImportOpen(false);
      setImportText("");
    } catch {
      alert("Failed to import file / invalid JSON");
    }
  }, []);

  const loadSample = useCallback(() => {
    const graph = getSampleSchema();
    window.dispatchEvent(
      new CustomEvent("xyflow:import-schema", { detail: graph })
    );
  }, []);

  return (
    <div className="h-full w-full bg-gray-50 text-gray-900">
      <header className="h-14 border-b bg-white flex items-center px-4 gap-2">
        <h1 className="font-semibold tracking-tight">XYFlow Form Builder</h1>
        <div className="ml-auto flex items-center gap-2">
          {mode === "builder" ? (
            <>
              <button
                className="px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200"
                onClick={goPreview}
              >
                Preview
              </button>
              <button
                className="px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                onClick={() =>
                  window.dispatchEvent(new Event("xyflow:export-schema"))
                }
              >
                Export JSON
              </button>
              <button
                className="px-3 py-1.5 rounded-md bg-blue-100 hover:bg-blue-200"
                onClick={() =>
                  window.dispatchEvent(new Event("xyflow:copy-schema"))
                }
              >
                Copy JSON
              </button>
              <button
                className="px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={onImportSchema}
              >
                Import JSON
              </button>
              <button
                className="px-3 py-1.5 rounded-md bg-purple-600 text-white hover:bg-purple-700"
                onClick={loadSample}
              >
                Load Sample
              </button>
            </>
          ) : (
            <>
              <button
                className="px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200"
                onClick={() => setMode("builder")}
              >
                Back to Builder
              </button>
            </>
          )}
        </div>
      </header>

      <main className="h-[calc(100%-3.5rem)] relative">
        <div className={mode === "builder" ? "block h-full" : "hidden"}>
          <Builder onExport={onExport} onCopy={onCopy} />
        </div>
        <div className={mode === "preview" ? "block h-full" : "hidden"}>
          <Preview
            schema={schema}
            values={previewValues}
            onValuesChange={setPreviewValues}
            submit={submitMeta}
          />
        </div>
      </main>

      {importOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-lg">
            <div className="p-4 border-b font-semibold">
              Import Schema (JSON)
            </div>
            <div className="p-4 space-y-2">
              <textarea
                className="w-full h-64 border rounded-md p-2"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste JSON here..."
              />
              <div className="flex items-center gap-2 justify-between">
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={handleImportText}
                  >
                    Import from Text
                  </button>
                  <button
                    className="px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                    onClick={handleImportFromFile}
                  >
                    Import from File
                  </button>
                </div>
                <button
                  className="px-3 py-1.5 rounded-md"
                  onClick={() => setImportOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
