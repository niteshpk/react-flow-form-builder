import React, { useMemo } from "react";

export default function PropertiesPanel({
  selectedId,
  nodes,
  onChangeField,
  onDelete,
}) {
  const node = useMemo(
    () => nodes.find((n) => n.id === selectedId),
    [nodes, selectedId]
  );
  const isField = node?.type === "field";
  const field = isField ? node?.data?.field : null;

  if (!node) {
    return (
      <aside className="w-80 border-l bg-white p-4">
        <div className="text-sm text-gray-500">No node selected</div>
      </aside>
    );
  }

  if (!isField) {
    // Structural node (start / end / submit)
    return (
      <aside className="w-80 border-l bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-sm capitalize">
            {node.type} node
          </div>
          <button className="text-red-600 text-sm" onClick={onDelete}>
            Delete
          </button>
        </div>
        <div className="text-xs text-gray-600">
          This is a <b>{node.type}</b> node used to define ordering via edges.
          <br />
          Connect: <code>start → …fields… → end → submit</code>.
        </div>
      </aside>
    );
  }

  const onChange = (patch) => {
    onChangeField(node.id, { ...field, ...patch });
  };

  return (
    <aside className="w-80 border-l bg-white p-4 space-y-3 overflow-auto">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm">Properties</div>
        <button className="text-red-600 text-sm" onClick={onDelete}>
          Delete
        </button>
      </div>
      <div className="text-xs text-gray-500">ID: {field.id}</div>

      {/* Common */}
      <div className="space-y-1">
        <label className="text-xs text-gray-700">Type</label>
        <input
          className="w-full border rounded px-2 py-1 text-sm bg-gray-100"
          value={field.type}
          readOnly
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-700">Label</label>
        <input
          className="w-full border rounded px-2 py-1 text-sm"
          value={field.label || ""}
          onChange={(e) => onChange({ label: e.target.value })}
        />
      </div>

      {"placeholder" in field ? (
        <div className="space-y-1">
          <label className="text-xs text-gray-700">Placeholder</label>
          <input
            className="w-full border rounded px-2 py-1 text-sm"
            value={field.placeholder || ""}
            onChange={(e) => onChange({ placeholder: e.target.value })}
          />
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isRequired"
          checked={!!field.isRequired}
          onChange={(e) => onChange({ isRequired: e.target.checked })}
        />
        <label htmlFor="isRequired" className="text-sm">
          Required
        </label>
      </div>

      {/* Type-specific */}
      {field.type === "text" && (
        <div className="space-y-1">
          <label className="text-xs text-gray-700">Input Type</label>
          <select
            className="w-full border rounded px-2 py-1 text-sm"
            value={field.inputType}
            onChange={(e) => onChange({ inputType: e.target.value })}
          >
            {["text", "email", "number", "password", "url", "tel"].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      )}

      {["radio", "select", "checkbox"].includes(field.type) && (
        <div className="space-y-1">
          <label className="text-xs text-gray-700">
            Options (one per line)
          </label>
          <textarea
            className="w-full border rounded px-2 py-1 text-sm h-28"
            value={(field.options || []).join("\n")}
            onChange={(e) =>
              onChange({ options: e.target.value.split("\n").filter(Boolean) })
            }
          />
          {field.type === "select" && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="multi"
                checked={!!field.multiple}
                onChange={(e) => onChange({ multiple: e.target.checked })}
              />
              <label htmlFor="multi" className="text-sm">
                Allow multiple selections
              </label>
            </div>
          )}
          {field.type === "checkbox" && (
            <div className="text-xs text-gray-500">
              Checkboxes support multiple selections by default.
            </div>
          )}
        </div>
      )}

      {field.type === "date" && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs text-gray-700">Min Date</label>
            <input
              type="date"
              className="w-full border rounded px-2 py-1 text-sm"
              value={field.minDate || ""}
              onChange={(e) => onChange({ minDate: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-700">Max Date</label>
            <input
              type="date"
              className="w-full border rounded px-2 py-1 text-sm"
              value={field.maxDate || ""}
              onChange={(e) => onChange({ maxDate: e.target.value })}
            />
          </div>
        </div>
      )}

      {field.type === "file" && (
        <>
          <div className="space-y-1">
            <label className="text-xs text-gray-700">
              Accept (comma separated)
            </label>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder=".png,.jpg,application/pdf"
              value={field.accept || ""}
              onChange={(e) => onChange({ accept: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-gray-700">Max Size (MB)</label>
              <input
                type="number"
                min="0"
                className="w-full border rounded px-2 py-1 text-sm"
                value={field.maxSizeMB ?? 5}
                onChange={(e) =>
                  onChange({ maxSizeMB: Number(e.target.value) })
                }
              />
            </div>
            <div className="flex items-end gap-2">
              <input
                type="checkbox"
                id="file-multi"
                checked={!!field.multiple}
                onChange={(e) => onChange({ multiple: e.target.checked })}
              />
              <label htmlFor="file-multi" className="text-sm">
                Allow multiple
              </label>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
