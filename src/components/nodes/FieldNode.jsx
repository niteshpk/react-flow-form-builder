import React from "react";
import { Handle, Position } from "@xyflow/react";
import clsx from "classnames";

export default function FieldNode({ id, data, selected }) {
  const f = data.field;
  return (
    <div
      className={clsx(
        "w-[220px] rounded-xl border bg-white shadow-sm",
        selected ? "ring-2 ring-blue-500" : ""
      )}
    >
      <div className="px-3 py-2 border-b bg-gray-50 rounded-t-xl text-xs text-gray-600 flex items-center justify-between">
        <span className="font-medium capitalize">{f.type}</span>
        <span className="text-[10px] text-gray-400">ID: {id}</span>
      </div>
      <div className="p-3">
        <div className="text-sm font-semibold truncate">
          {f.label || "(untitled)"}
        </div>
        {f.placeholder && (
          <div className="text-xs text-gray-500 truncate">{f.placeholder}</div>
        )}
        {["radio", "select", "checkbox"].includes(f.type) && (
          <div className="text-[11px] text-gray-500 mt-1">
            {(f.options || []).length} options
          </div>
        )}
        {f.type === "file" && (
          <div className="text-[11px] text-gray-500 mt-1">
            {f.multiple ? "Multiple" : "Single"} • {f.maxSizeMB ?? 5}MB max
          </div>
        )}
        {f.type === "date" && (
          <div className="text-[11px] text-gray-500 mt-1">
            {f.minDate ? `min ${f.minDate}` : ""}{" "}
            {f.maxDate ? `• max ${f.maxDate}` : ""}
          </div>
        )}
      </div>

      {/* Minimal, meaningful connectors (top/bottom only) */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ width: 8, height: 8 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ width: 8, height: 8 }}
      />
    </div>
  );
}
