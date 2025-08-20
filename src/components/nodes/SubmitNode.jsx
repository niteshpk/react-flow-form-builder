import React from "react";
import { Handle, Position } from "@xyflow/react";

export default function SubmitNode({ selected, data }) {
  const label = data?.label ?? "Submit";
  const color = data?.color ?? "#2563eb";
  return (
    <div
      className={`rounded-xl border w-[220px] shadow-sm ${
        selected ? "ring-2 ring-blue-500" : ""
      }`}
    >
      <div className="px-3 py-2 font-semibold bg-blue-50 text-blue-900 rounded-t-xl">
        Submit
      </div>
      <div className="p-3 space-y-2">
        <div className="text-xs text-gray-600">Preview button preview:</div>
        <button
          type="button"
          style={{ backgroundColor: color }}
          className="px-3 py-1.5 rounded-md text-white text-sm w-full"
        >
          {label}
        </button>
      </div>
      <Handle
        type="target"
        position={Position.Top}
        style={{ width: 10, height: 10 }}
      />
    </div>
  );
}
