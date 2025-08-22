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
import {
  deriveOrderedFields,
  validateEdgeDraft,
  validateGraph,
} from "../lib/ordering.js";

function BuilderInner({ onExport, onCopy }) {
  const reactFlowWrapper = useRef(null);
  const { screenToFlowPosition, setViewport } = useReactFlow();
  const [selectedIds, setSelectedIds] = useState([]);

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

  const isValidConnection = useCallback(
    (conn) => validateEdgeDraft(conn, nodes),
    [nodes]
  );

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

  const onSelectionChange = useCallback(({ nodes: selNodes }) => {
    const ids = (selNodes || []).map((n) => n.id);
    setSelectedIds(ids);
    setSelectedId(ids[0] ?? null);
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
    const d = deriveOrderedFields(nodes, edges);
    const gw = validateGraph(nodes, edges);
    return {
      sequence: d.sequence,
      warnings: [...d.warnings, ...gw],
      orderedFields: d.orderedFields,
    };
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
      // export ordered fields (falls back to raw if empty)
      const out = diag.orderedFields?.length
        ? diag.orderedFields
        : nodes.filter((n) => n.type === "field").map((n) => n.data.field);
      onExport?.(out);
    };
    const copyHandler = () => {
      const out = diag.orderedFields?.length
        ? diag.orderedFields
        : nodes.filter((n) => n.type === "field").map((n) => n.data.field);
      onCopy?.(out);
    };

    const requestHandler = () => {
      const out = diag.orderedFields?.length
        ? diag.orderedFields
        : nodes.filter((n) => n.type === "field").map((n) => n.data.field);
      window.dispatchEvent(
        new CustomEvent("xyflow:current-schema", { detail: out })
      );
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
    window.addEventListener("xyflow:request-schema", requestHandler);
    return () => {
      window.removeEventListener("xyflow:export-schema", exportHandler);
      window.removeEventListener("xyflow:copy-schema", copyHandler);
      window.removeEventListener("xyflow:import-schema", importHandler);
      window.removeEventListener("xyflow:request-schema", requestSchema);
      window.removeEventListener("xyflow:request-submit", requestSubmit);
      window.removeEventListener("xyflow:request-submit", requestHandler);
    };
  }, [nodes, edges, diag, onExport, onCopy, setNodes, setEdges, setViewport]);

  // Utility: stable sort by canvas position
  const sortByPos = (arr) =>
    [...arr].sort(
      (a, b) =>
        (a.position?.y ?? 0) - (b.position?.y ?? 0) ||
        (a.position?.x ?? 0) - (b.position?.x ?? 0) ||
        String(a.id).localeCompare(String(b.id))
    );

  // Utility: unique edge by source-target pair
  const uniqEdges = (eds) => {
    const seen = new Set();
    const out = [];
    for (const e of eds) {
      const key = `${e.source}->${e.target}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ id: e.id || `e_${e.source}_${e.target}`, ...e });
      }
    }
    return out;
  };

  const makeSection = useCallback(() => {
    if (!selectedIds.length) {
      alert("Select one or more field nodes (non-static) to make a section.");
      return;
    }

    // Map ids to nodes
    const idToNode = new Map(nodes.map((n) => [n.id, n]));
    const isFieldNode = (n) => n?.type === "field" && n?.data?.field;
    const isStaticField = (n) =>
      isFieldNode(n) && n.data.field.type === "static";

    // Eligible = field nodes that are NOT static wrappers
    const eligible = selectedIds
      .map((id) => idToNode.get(id))
      .filter((n) => isFieldNode(n) && !isStaticField(n));

    if (!eligible.length) {
      alert("No eligible fields in selection (static/structural are ignored).");
      return;
    }

    // Order selected fields vertically (then x)
    const ordered = sortByPos(eligible);
    const first = ordered[0];
    const last = ordered[ordered.length - 1];

    // Place the new static wrapper to the left of the first field
    const staticPos = {
      x: (first.position?.x ?? 0) - 240,
      y: (first.position?.y ?? 0) - 16,
    };
    const staticNode = createNodeFromType("static", staticPos);

    // Compute sets and helpers
    const selectedSet = new Set(ordered.map((n) => n.id));
    const startNode = nodes.find((n) => n.type === "start");
    const startId = startNode?.id;

    // Split edges
    const fullyOutside = edges.filter(
      (e) => !selectedSet.has(e.source) && !selectedSet.has(e.target)
    );
    const incomingToSel = edges.filter(
      (e) => !selectedSet.has(e.source) && selectedSet.has(e.target)
    );
    const outgoingFromSel = edges.filter(
      (e) => selectedSet.has(e.source) && !selectedSet.has(e.target)
    );

    // Rebuild edges:
    const newEdges = [...fullyOutside];

    // 1) Start -> Static (always if start exists)
    if (startId) {
      const candidate = { source: startId, target: staticNode.id };
      // optional guard with validateEdgeDraft
      if (
        !validateEdgeDraft ||
        validateEdgeDraft(candidate, nodes.concat(staticNode))
      ) {
        newEdges.push({ ...candidate });
      }
    }

    // 2) Static -> first field
    newEdges.push({ source: staticNode.id, target: first.id });

    // 3) Chain among ordered fields
    for (let i = 0; i < ordered.length - 1; i++) {
      newEdges.push({ source: ordered[i].id, target: ordered[i + 1].id });
    }

    // 4) Re-route incoming edges:
    //    - From Start: go to Static
    //    - From others: go to the first field of the section
    for (const e of incomingToSel) {
      if (startId && e.source === startId) {
        newEdges.push({ source: e.source, target: staticNode.id });
      } else {
        newEdges.push({ source: e.source, target: first.id });
      }
    }

    // 5) Re-attach outgoing edges from any selected field to the outside,
    //    but now originating from the LAST field of the section.
    //    (dedupe targets)
    const outTargets = Array.from(
      new Set(outgoingFromSel.map((e) => e.target))
    );
    for (const tgt of outTargets) {
      newEdges.push({ source: last.id, target: tgt });
    }

    setNodes((nds) => nds.concat(staticNode));
    setEdges((eds) => uniqEdges(newEdges));

    // Optional: focus the new Static
    setSelectedIds([staticNode.id]);
    setSelectedId(staticNode.id);
  }, [selectedIds, nodes, edges, setNodes, setEdges]);

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
          isValidConnection={isValidConnection}
          fitView
          minZoom={0.25}
          maxZoom={1.75}
        >
          <Background />
          <MiniMap pannable zoomable />
          <Controls showInteractive={false} />

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

          <Panel
            position="top-left"
            className="bg-white/90 rounded-md shadow p-2 text-xs"
          >
            <div className="flex items-center gap-2">
              <button
                className={`px-2 py-1 rounded-md ${
                  selectedIds.length
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-200 text-gray-500"
                }`}
                disabled={!selectedIds.length}
                title="Wrap selected fields into a new Static (section) and auto-wire"
                onClick={makeSection}
                type="button"
              >
                Make Section ({selectedIds.length})
              </button>
              <span className="text-[11px] text-gray-600 hidden sm:inline">
                Select one or more fields (non-static), then click
              </span>
            </div>
          </Panel>
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
