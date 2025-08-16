import React, { useMemo } from "react";
import { PALETTE } from "../lib/schema.js";

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
  const items = useMemo(
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
    <aside className="w-64 border-r bg-gray-50 p-3 space-y-3 overflow-auto">
      <div className="text-xs font-semibold text-gray-500">FIELD TYPES</div>
      <div className="grid grid-cols-1 gap-2">
        {items.map((item) => (
          <DraggableItem key={item.type} {...item} />
        ))}
      </div>

      <div className="text-xs font-semibold text-gray-500 mt-4">TIP</div>
      <p className="text-xs text-gray-600">
        Drag an item to the canvas. Select a node to edit its properties on the
        right panel. Press <kbd>Delete</kbd> to remove.
      </p>
    </aside>
  );
}
