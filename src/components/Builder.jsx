import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  useEdgesState,
  useNodesState,
  addEdge,
  Controls,
  MiniMap,
  Panel,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Sidebar from "./Sidebar.jsx";
import PropertiesPanel from "./PropertiesPanel.jsx";
import { fieldNodeTypes } from "./nodes/nodeTypes.js";
import { createNodeFromType, seedIdCountersFromFields } from "../lib/schema.js";

function BuilderInner({ onExport, onCopy }) {
  const reactFlowWrapper = useRef(null);
  const { screenToFlowPosition, setViewport } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [validationMsg, setValidationMsg] = useState("");
  const msgTimerRef = useRef(null);
  const idCounterRef = useRef(1);
  const [inspectorOpen, setInspectorOpen] = useState(() => {
    // persist across refresh; remove if you don't want persistence
    const saved = localStorage.getItem("xyflow:inspectorOpen");
    return saved ? saved === "1" : true;
  });

  useEffect(() => {
    localStorage.setItem("xyflow:inspectorOpen", inspectorOpen ? "1" : "0");
  }, [inspectorOpen]);

  // ---- helpers ----
  const nodeById = useCallback((id) => nodes.find((n) => n.id === id), [nodes]);

  const showMsg = useCallback((text) => {
    setValidationMsg(text);
    clearTimeout(msgTimerRef.current);
    msgTimerRef.current = setTimeout(() => setValidationMsg(""), 2000);
  }, []);

  // ---- connection validation ----
  const makesCycle = useCallback(
    (src, tgt) => {
      // would adding src->tgt create a cycle?
      const adj = new Map();
      edges.forEach((e) => {
        if (!adj.has(e.source)) adj.set(e.source, []);
        adj.get(e.source).push(e.target);
      });
      // include the proposed edge
      if (!adj.has(src)) adj.set(src, []);
      adj.get(src).push(tgt);

      // DFS from target; if we can reach source, it cycles
      const stack = [tgt];
      const seen = new Set();
      while (stack.length) {
        const cur = stack.pop();
        if (cur === src) return true;
        if (seen.has(cur)) continue;
        seen.add(cur);
        const nexts = adj.get(cur) || [];
        for (const n of nexts) stack.push(n);
      }
      return false;
    },
    [edges]
  );

  const validateConnection = useCallback(
    (params) => {
      const { source, target } = params || {};
      if (!source || !target)
        return { ok: false, reason: "Invalid connection" };
      if (source === target) return { ok: false, reason: "No self-loops" };

      const s = nodeById(source);
      const t = nodeById(target);
      if (!s || !t) return { ok: false, reason: "Unknown nodes" };

      // disallow duplicates
      if (edges.some((e) => e.source === source && e.target === target)) {
        return { ok: false, reason: "Duplicate edge" };
      }

      // node-specific rules
      if (t.type === "start")
        return { ok: false, reason: "Start cannot have incoming edges" };
      if (s.type === "submit")
        return { ok: false, reason: "Submit cannot have outgoing edges" };
      if (t.type === "submit" && s.type !== "end") {
        return { ok: false, reason: "Submit must connect only from End" };
      }
      if (s.type === "end" && t.type !== "submit") {
        return { ok: false, reason: "End must connect only to Submit" };
      }

      // linearity: max 1 outgoing for any node; max 1 incoming for any node
      if (edges.some((e) => e.source === source)) {
        return { ok: false, reason: "Only one outgoing edge allowed per node" };
      }
      if (edges.some((e) => e.target === target)) {
        return { ok: false, reason: "Only one incoming edge allowed per node" };
      }

      // cycles
      if (makesCycle(source, target))
        return { ok: false, reason: "Connection would create a cycle" };

      return { ok: true };
    },
    [edges, nodeById, makesCycle]
  );

  const onConnect = useCallback(
    (params) => {
      const { ok, reason } = validateConnection(params);
      if (!ok) return showMsg(reason);
      setEdges((eds) => addEdge({ ...params, animated: false }, eds));
    },
    [setEdges, validateConnection, showMsg]
  );

  const onSelectionChange = useCallback(({ nodes: selectedNodes }) => {
    setSelectedId(selectedNodes?.[0]?.id ?? null);
  }, []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/xyflow-node-type");
      if (!type) return;
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const node = createNodeFromType(type, position, idCounterRef.current++);
      setNodes((nds) => nds.concat(node));
    },
    [screenToFlowPosition, setNodes]
  );

  const updateField = useCallback(
    (id, newField) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id && n.type === "field"
            ? { ...n, data: { ...n.data, field: newField } }
            : n
        )
      );
    },
    [setNodes]
  );

  // update structural node data (start/end/submit)
  const updateNodeData = useCallback(
    (id, patch) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...(n.data || {}), ...patch } } : n
        )
      );
    },
    [setNodes]
  );

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedId));
    setEdges((eds) =>
      eds.filter((e) => e.source !== selectedId && e.target !== selectedId)
    );
    setSelectedId(null);
  }, [selectedId, setNodes, setEdges]);

  useEffect(() => {
    const keyHandler = (e) => {
      const tag = e.target.tagName?.toLowerCase?.() || "";
      const isEditable =
        tag === "input" || tag === "textarea" || e.target.isContentEditable;
      if (isEditable) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        deleteSelected();
      }
    };

    window.addEventListener("keydown", keyHandler);
    return () => window.removeEventListener("keydown", keyHandler);
  }, [selectedId, deleteSelected]);

  useEffect(() => {
    const requestSubmit = () => {
      const submitNode = nodes.find((n) => n.type === "submit");
      const meta = {
        label: submitNode?.data?.label ?? "Submit",
        color: submitNode?.data?.color ?? "#2563eb",
        api: submitNode?.data?.api ?? {
          url: "",
          method: "POST",
          contentType: "json",
          headers: { "Content-Type": "application/json" },
          bodyTemplate: "",
          successKey: "message",
          successDefault: "Submitted successfully.",
          errorKey: "error",
          errorDefault: "Submission failed.",
        },
      };
      window.dispatchEvent(
        new CustomEvent("xyflow:current-submit", { detail: meta })
      );
    };

    window.addEventListener("xyflow:request-submit", requestSubmit);
    return () =>
      window.removeEventListener("xyflow:request-submit", requestSubmit);
  }, [nodes]);

  // ----- ORDERING + diagnostics -----
  const diag = useMemo(() => {
    const map = new Map(nodes.map((n) => [n.id, n]));
    const out = new Map();
    const incoming = new Map();
    edges.forEach((e) => {
      if (!out.has(e.source)) out.set(e.source, []);
      out.get(e.source).push(e.target);
      incoming.set(e.target, (incoming.get(e.target) || 0) + 1);
    });

    const start = nodes.find((n) => n.type === "start");
    const end = nodes.find((n) => n.type === "end");
    const submit = nodes.find((n) => n.type === "submit");

    const warnings = [];
    if (!start) warnings.push("Add a Start node.");
    if (!end) warnings.push("Add an End node.");
    if (!submit) warnings.push("Add a Submit node.");

    // edges sanity
    nodes.forEach((n) => {
      const outs = (out.get(n.id) || []).length;
      const ins = incoming.get(n.id) || 0;
      if (n.type === "start" && ins > 0)
        warnings.push("Start has incoming edges (not allowed).");
      if (n.type === "submit" && outs > 0)
        warnings.push("Submit has outgoing edges (not allowed).");
      if (n.type === "end" && outs > 1)
        warnings.push("End should have only one outgoing edge to Submit.");
      if (n.type !== "submit" && outs > 1)
        warnings.push(
          `Node ${n.id} has multiple outgoing edges; order is linear.`
        );
      if (n.type !== "start" && ins > 1)
        warnings.push(
          `Node ${n.id} has multiple incoming edges; order is linear.`
        );
    });

    // follow linear path: Start -> next -> ... until no next
    const seq = [];
    const seqIds = [];
    const visited = new Set();
    let cur = start?.id;
    if (start) {
      seq.push("Start");
      seqIds.push(start.id);
      while (cur) {
        const nexts = out.get(cur) || [];
        if (nexts.length === 0) break;
        const nxt = nexts[0]; // linear
        if (visited.has(nxt)) {
          warnings.push("Cycle detected in path; stopped traversal.");
          break;
        }
        visited.add(nxt);
        const node = map.get(nxt);
        if (!node) break;
        if (node.type === "field" && node.data?.field) {
          seq.push(node.data.field.label || node.data.field.id);
        } else if (node.type === "end") {
          seq.push("End");
        } else if (node.type === "submit") {
          seq.push("Submit");
        }
        seqIds.push(nxt);
        cur = nxt;
      }
    }

    // warn if end->submit missing (when both exist)
    if (end && submit) {
      const ok = edges.some(
        (e) => e.source === end.id && e.target === submit.id
      );
      if (!ok) warnings.push("Connect End → Submit.");
    }

    // un-ordered field nodes
    const orderedSet = new Set(seqIds);
    const orphanFields = nodes.filter(
      (n) => n.type === "field" && !orderedSet.has(n.id)
    );
    if (orphanFields.length)
      warnings.push(
        `${orphanFields.length} field(s) are not in the Start→End→Submit path.`
      );

    return { sequence: seq, warnings };
  }, [nodes, edges]);

  // ----- schema export / import / app bridge -----
  const getOrderedFields = useCallback(() => {
    // Only field objects in path order:
    const map = new Map(nodes.map((n) => [n.id, n]));
    const outMap = new Map();
    edges.forEach((e) => {
      if (!outMap.has(e.source)) outMap.set(e.source, []);
      outMap.get(e.source).push(e.target);
    });
    const start = nodes.find((n) => n.type === "start");
    const seen = new Set();
    const ordered = [];
    const walkLinear = (id) => {
      const nexts = outMap.get(id) || [];
      if (!nexts.length) return;
      const nxt = nexts[0];
      if (seen.has(nxt)) return;
      seen.add(nxt);
      const n = map.get(nxt);
      if (!n) return;
      if (n.type === "field" && n.data?.field) ordered.push(n.data.field);
      walkLinear(nxt);
    };
    if (start) walkLinear(start.id);
    return ordered;
  }, [nodes, edges]);

  // Export / Copy / Import / Request events
  useEffect(() => {
    const exportHandler = () => {
      const schema = getOrderedFields();
      onExport?.(schema);
    };
    const copyHandler = () => {
      const schema = getOrderedFields();
      onCopy?.(schema);
    };

    const importHandler = (e) => {
      const payload = e.detail;

      // Case A: new graph payload { nodes, edges }
      if (
        payload &&
        Array.isArray(payload.nodes) &&
        Array.isArray(payload.edges)
      ) {
        // seed counters from field nodes so next created IDs continue correctly
        const fieldList = payload.nodes
          .filter((n) => n.type === "field" && n.data?.field)
          .map((n) => n.data.field);
        try {
          seedIdCountersFromFields(fieldList);
        } catch {
          console.log("Invalid field data in imported nodes");
        }

        setNodes(payload.nodes);
        setEdges(payload.edges);
        setSelectedId(null);
        setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 300 });
        idCounterRef.current = payload.nodes.length + 1;
        return;
      }

      // Case B: legacy array of fields -> build a linear graph automatically
      const schema = Array.isArray(payload) ? payload : [];
      try {
        seedIdCountersFromFields(schema);
      } catch {
        console.log("Invalid field data in imported schema");
      }

      const gridX = 250,
        gridY = 150;
      // Build field nodes first
      let x = 50,
        y = 50,
        col = 0;
      const fieldNodes = schema.map((field) => {
        if (col >= 3) {
          col = 0;
          y += gridY;
          x = 50;
        }
        const node = createNodeFromType(field, { x, y });
        x += gridX;
        col += 1;
        return node;
      });

      // Add structural nodes (linear)
      const startNode = createNodeFromType("start", { x: 40, y: 40 });
      const endNode = createNodeFromType("end", {
        x: 40,
        y: 40 + 120 * (fieldNodes.length + 0),
      });
      const submitNode = createNodeFromType("submit", {
        x: 40,
        y: 40 + 120 * (fieldNodes.length + 1),
      });

      // Build edges: start -> fields -> end -> submit
      const edgesLin = [];
      if (fieldNodes.length > 0) {
        edgesLin.push({
          id: `e_${startNode.id}_${fieldNodes[0].id}`,
          source: startNode.id,
          target: fieldNodes[0].id,
        });
        for (let i = 0; i < fieldNodes.length - 1; i++) {
          edgesLin.push({
            id: `e_${fieldNodes[i].id}_${fieldNodes[i + 1].id}`,
            source: fieldNodes[i].id,
            target: fieldNodes[i + 1].id,
          });
        }
        edgesLin.push({
          id: `e_${fieldNodes[fieldNodes.length - 1].id}_${endNode.id}`,
          source: fieldNodes[fieldNodes.length - 1].id,
          target: endNode.id,
        });
      } else {
        edgesLin.push({
          id: `e_${startNode.id}_${endNode.id}`,
          source: startNode.id,
          target: endNode.id,
        });
      }
      edgesLin.push({
        id: `e_${endNode.id}_${submitNode.id}`,
        source: endNode.id,
        target: submitNode.id,
      });

      const newNodes = [startNode, ...fieldNodes, endNode, submitNode];

      setNodes(newNodes);
      setEdges(edgesLin);
      setSelectedId(null);
      setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 300 });
      idCounterRef.current = newNodes.length + 1;
    };

    const requestSchema = () => {
      const schema = getOrderedFields();
      window.dispatchEvent(
        new CustomEvent("xyflow:current-schema", { detail: schema })
      );
    };
    const requestSubmit = () => {
      const submitNode = nodes.find((n) => n.type === "submit");
      const meta = {
        label: submitNode?.data?.label || "Submit",
        color: submitNode?.data?.color || "#2563eb",
      };
      window.dispatchEvent(
        new CustomEvent("xyflow:current-submit", { detail: meta })
      );
    };

    window.addEventListener("xyflow:export-schema", exportHandler);
    window.addEventListener("xyflow:copy-schema", copyHandler);
    window.addEventListener("xyflow:import-schema", importHandler);
    window.addEventListener("xyflow:request-schema", requestSchema);
    window.addEventListener("xyflow:request-submit", requestSubmit);
    return () => {
      window.removeEventListener("xyflow:export-schema", exportHandler);
      window.removeEventListener("xyflow:copy-schema", copyHandler);
      window.removeEventListener("xyflow:import-schema", importHandler);
      window.removeEventListener("xyflow:request-schema", requestSchema);
      window.removeEventListener("xyflow:request-submit", requestSubmit);
    };
  }, [
    getOrderedFields,
    nodes,
    onExport,
    onCopy,
    setNodes,
    setEdges,
    setViewport,
  ]);

  return (
    <div className="h-full w-full flex">
      <Sidebar />
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onSelectionChange={onSelectionChange}
          nodeTypes={fieldNodeTypes}
          onDrop={onDrop}
          onDragOver={onDragOver}
          fitView
          minZoom={0.25}
          maxZoom={1.75}
        >
          <Background />
          <MiniMap pannable zoomable />
          <Controls showInteractive={false} />

          {/* Hints */}
          <Panel
            position="top-left"
            className="pointer-events-none bg-transparent"
          >
            <div className="pointer-events-auto p-2 text-xs bg-white/80 rounded-md shadow">
              Connect <b>Start → fields → End → Submit</b> (linear).
            </div>
          </Panel>

          {/* Order Inspector */}
          <Panel
            position="top-right"
            className={`rounded-md shadow bg-white/90 
              ${diag.warnings.length ? "border border-amber-700" : ""}
              ${inspectorOpen ? "w-[280px] p-2 space-y-2" : "w-[180px] p-1"}`}
          >
            {/* Header row — always visible */}
            <div className="flex items-center justify-between">
              <div className="font-semibold text-xs">Order Inspector</div>
              <button
                type="button"
                onClick={() => setInspectorOpen((v) => !v)}
                aria-expanded={inspectorOpen}
                aria-label={
                  inspectorOpen
                    ? "Minimize Order Inspector"
                    : "Maximize Order Inspector"
                }
                className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                title={inspectorOpen ? "Minimize" : "Maximize"}
              >
                {inspectorOpen ? (
                  // minus icon
                  <svg
                    viewBox="0 0 16 16"
                    width="14"
                    height="14"
                    aria-hidden="true"
                  >
                    <rect
                      x="3"
                      y="7.25"
                      width="10"
                      height="1.5"
                      rx="0.75"
                      fill="currentColor"
                    />
                  </svg>
                ) : (
                  // plus icon
                  <svg
                    viewBox="0 0 16 16"
                    width="14"
                    height="14"
                    aria-hidden="true"
                  >
                    <rect
                      x="3"
                      y="7.25"
                      width="10"
                      height="1.5"
                      rx="0.75"
                      fill="currentColor"
                    />
                    <rect
                      x="7.25"
                      y="3"
                      width="1.5"
                      height="10"
                      rx="0.75"
                      fill="currentColor"
                    />
                  </svg>
                )}
              </button>
            </div>

            {/* Body — only when open */}
            {inspectorOpen && (
              <>
                <div className="text-[11px] text-gray-600">
                  Render order follows the path:
                </div>
                <div className="text-[11px] break-words">
                  {diag.sequence.length ? (
                    diag.sequence.join("  →  ")
                  ) : (
                    <span className="text-gray-500">No path yet</span>
                  )}
                </div>
                {diag.warnings.length > 0 && (
                  <div className="pt-1">
                    <div className="font-semibold text-amber-700">Warnings</div>
                    <ul className="list-disc pl-4 space-y-0.5 text-amber-800">
                      {diag.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </Panel>

          {/* Validation toasts */}
          {validationMsg && (
            <Panel
              position="bottom-left"
              className="text-xs bg-red-50 text-red-700 border border-red-300 rounded-md shadow px-2 py-1"
            >
              {validationMsg}
            </Panel>
          )}
        </ReactFlow>
      </div>
      <PropertiesPanel
        selectedId={selectedId}
        nodes={nodes}
        onChangeField={updateField}
        onChangeNodeData={updateNodeData}
        onDelete={deleteSelected}
      />
    </div>
  );
}

export default function Builder(props) {
  return (
    <ReactFlowProvider>
      <BuilderInner {...props} />
    </ReactFlowProvider>
  );
}
