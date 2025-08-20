import React from "react";
import { Handle, Position } from "@xyflow/react";

export default function EndNode({ selected }) {
  return (
    <div
      className={`rounded-xl border bg-amber-50 text-amber-900 w-[200px] shadow-sm ${
        selected ? "ring-2 ring-amber-500" : ""
      }`}
    >
      <div className="px-3 py-2 font-semibold">End</div>
      <div className="px-3 pb-2 text-xs text-amber-800">Connect to Submit</div>
      <Handle
        type="target"
        position={Position.Top}
        style={{ width: 10, height: 10 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ width: 10, height: 10 }}
      />
    </div>
  );
}
