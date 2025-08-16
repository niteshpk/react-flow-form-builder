import { useCallback, useEffect, useRef, useState } from "react";
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
import { createNodeFromType } from "../lib/schema.js";
// import { downloadJSON } from "../lib/storage.js";

function BuilderInner({ onExport, onCopy }) {
  const reactFlowWrapper = useRef(null);
  const { screenToFlowPosition, setViewport } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedId, setSelectedId] = useState(null);
  const idCounterRef = useRef(1);

  // Export / Copy schema events
  useEffect(() => {
    const exportHandler = () => {
      const schema = nodes.map((n) => n.data.field);
      onExport?.(schema);
      // downloadJSON(schema, "form-schema.json");
    };
    const copyHandler = () => {
      const schema = nodes.map((n) => n.data.field);
      onCopy?.(schema);
    };
    const importHandler = (e) => {
      const schema = e.detail || [];
      // build nodes (grid layout)
      const gridX = 250;
      const gridY = 150;
      let x = 50,
        y = 50,
        col = 0;
      const newNodes = schema.map((field) => {
        if (col >= 3) {
          col = 0;
          y += gridY;
          x = 50;
        }
        const node = createNodeFromType(field.type, field, { x, y });
        x += gridX;
        col += 1;
        return node;
      });
      setNodes(newNodes);
      setEdges([]);
      setSelectedId(null);
      setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 300 });
      idCounterRef.current = newNodes.length + 1;
    };
    window.addEventListener("xyflow:export-schema", exportHandler);
    window.addEventListener("xyflow:copy-schema", copyHandler);
    window.addEventListener("xyflow:import-schema", importHandler);
    window.addEventListener("xyflow:request-schema", requestHandler);
    return () => {
      window.removeEventListener("xyflow:export-schema", exportHandler);
      window.removeEventListener("xyflow:copy-schema", copyHandler);
      window.removeEventListener("xyflow:import-schema", importHandler);
      window.removeEventListener("xyflow:request-schema", requestHandler);
    };
  }, [nodes, onExport, onCopy, setNodes, setEdges, setViewport]);

  const requestHandler = () => {
    const schema = nodes.map((n) => n.data.field);
    window.dispatchEvent(
      new CustomEvent("xyflow:current-schema", { detail: schema })
    );
  };

  const onConnect = useCallback(
    (params) => {
      setEdges((eds) => addEdge({ ...params, animated: true }, eds));
    },
    [setEdges]
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
      const node = createNodeFromType(
        type,
        null,
        position,
        idCounterRef.current++
      );
      setNodes((nds) => nds.concat(node));
    },
    [screenToFlowPosition, setNodes]
  );

  const updateField = useCallback(
    (id, newField) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, field: newField } } : n
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
      const tag = e.target.tagName.toLowerCase();
      const isEditable =
        tag === "input" || tag === "textarea" || e.target.isContentEditable;

      if (isEditable) return; // ✅ allow normal typing

      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        deleteSelected();
      }
    };

    window.addEventListener("keydown", keyHandler);
    return () => window.removeEventListener("keydown", keyHandler);
  }, [selectedId, deleteSelected]);

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
          <Panel
            position="top-left"
            className="pointer-events-none bg-transparent"
          >
            <div className="pointer-events-auto p-2 text-xs bg-white/80 rounded-md shadow">
              Drag from left panel → drop here
            </div>
          </Panel>
        </ReactFlow>
      </div>
      <PropertiesPanel
        selectedId={selectedId}
        nodes={nodes}
        onChangeField={updateField}
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
