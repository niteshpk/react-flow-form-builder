import React from "react";
import { Handle, Position } from "@xyflow/react";

export default function StartNode({ selected }) {
  return (
    <div
      className={`rounded-xl border bg-emerald-50 text-emerald-800 w-[200px] shadow-sm ${
        selected ? "ring-2 ring-emerald-500" : ""
      }`}
    >
      <div className="px-3 py-2 font-semibold">Start</div>
      <div className="px-3 pb-2 text-xs text-emerald-700">Begin flow here</div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ width: 10, height: 10 }}
      />
    </div>
  );
}
