import React, { useMemo } from "react";

function DraggableItem({ label, type }) {
  const onDragStart = (event) => {
    event.dataTransfer.setData("application/xyflow-node-type", type);
    event.dataTransfer.effectAllowed = "move";
  };
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="px-3 py-2 rounded-lg bg-white hover:bg-gray-100 border cursor-move text-sm"
      title={`Drag ${label}`}
    >
      {label}
    </div>
  );
}

export default function Sidebar() {
  const structure = useMemo(
    () => [
      { type: "start", label: "Start" },
      { type: "end", label: "End" },
      { type: "submit", label: "Submit Button" },
    ],
    []
  );

  const fields = useMemo(
    () => [
      { type: "text", label: "Text Input" },
      { type: "textarea", label: "Textarea" },
      { type: "radio", label: "Radio Buttons" },
      { type: "select", label: "Select Dropdown" },
      { type: "checkbox", label: "Checkboxes" },
      { type: "date", label: "Date Picker" },
      { type: "file", label: "File Upload" },
      { type: "static", label: "Static Label/Paragraph" },
    ],
    []
  );

  return (
    <aside className="w-64 border-r bg-gray-50 p-3 space-y-4 overflow-auto">
      <div>
        <div className="text-xs font-semibold text-gray-500 mb-2">
          FLOW STRUCTURE
        </div>
        <div className="grid grid-cols-1 gap-2">
          {structure.map((item) => (
            <DraggableItem key={item.type} {...item} />
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-gray-500 mb-2">
          FIELD TYPES
        </div>
        <div className="grid grid-cols-1 gap-2">
          {fields.map((item) => (
            <DraggableItem key={item.type} {...item} />
          ))}
        </div>
      </div>

      <div className="text-xs text-gray-600">
        Connect nodes to define order: <b>Start → fields → End → Submit</b>.
      </div>
    </aside>
  );
}
