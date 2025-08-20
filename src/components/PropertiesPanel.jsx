import React, { useMemo, useState, useEffect } from "react";

function TextRow({ label, value, onChange, placeholder }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-gray-700">{label}</label>
      <input
        className="w-full border rounded px-2 py-1 text-sm"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

export default function PropertiesPanel({
  selectedId,
  nodes,
  onChangeField,
  onDelete,
  onChangeNodeData,
}) {
  // ✔ always call hooks at the top
  const node = useMemo(
    () => nodes.find((n) => n.id === selectedId),
    [nodes, selectedId]
  );
  const isField = node?.type === "field";
  const isSubmit = !!node && !isField && node.type === "submit";
  const field = isField ? node?.data?.field : null;

  // local state for the Submit node's headers text area
  const [headersText, setHeadersText] = useState("");

  // Sync headers text when switching selection to a Submit node
  useEffect(() => {
    if (isSubmit) {
      const api = node?.data?.api || {};
      const initial = JSON.stringify(
        api.headers || { "Content-Type": "application/json" },
        null,
        2
      );
      setHeadersText(initial);
    } else {
      setHeadersText(""); // clear when leaving submit node
    }
    // We depend on selectedId so edits in this panel don't keep resetting the textarea
  }, [isSubmit, selectedId, node]);

  if (!node) {
    return (
      <aside className="w-80 border-l bg-white p-4">
        <div className="text-sm text-gray-500">No node selected</div>
      </aside>
    );
  }

  // ---- Submit node special UI ----
  if (isSubmit) {
    const data = node.data || {};
    const api = data.api || {};

    const parseHeaders = () => {
      try {
        const h = JSON.parse(headersText || "{}");
        onChangeNodeData(node.id, { api: { ...api, headers: h } });
      } catch {
        alert("Headers must be a valid JSON object.");
      }
    };

    const setApi = (patch) =>
      onChangeNodeData(node.id, { api: { ...api, ...patch } });

    return (
      <aside className="w-80 border-l bg-white p-4 space-y-3 overflow-auto">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-sm">Submit Button</div>
          <button className="text-red-600 text-sm" onClick={onDelete}>
            Delete
          </button>
        </div>

        <TextRow
          label="Label"
          value={data.label ?? "Submit"}
          onChange={(v) => onChangeNodeData(node.id, { label: v })}
          placeholder="Submit"
        />

        <div className="space-y-1">
          <label className="text-xs text-gray-700">Button Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={data.color ?? "#2563eb"}
              onChange={(e) =>
                onChangeNodeData(node.id, { color: e.target.value })
              }
            />
            <input
              className="flex-1 border rounded px-2 py-1 text-sm"
              value={data.color ?? "#2563eb"}
              onChange={(e) =>
                onChangeNodeData(node.id, { color: e.target.value })
              }
              placeholder="#2563eb"
            />
          </div>
        </div>

        <div className="border-t pt-3 mt-2">
          <div className="font-semibold text-sm mb-1">API</div>
          <TextRow
            label="URL"
            value={api.url || ""}
            onChange={(v) => setApi({ url: v })}
            placeholder="https://api.example.com/submit"
          />

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-gray-700">Method</label>
              <select
                className="w-full border rounded px-2 py-1 text-sm"
                value={api.method || "POST"}
                onChange={(e) => setApi({ method: e.target.value })}
              >
                {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-700">Body Format</label>
              <select
                className="w-full border rounded px-2 py-1 text-sm"
                value={api.contentType || "json"}
                onChange={(e) => setApi({ contentType: e.target.value })}
              >
                <option value="json">JSON</option>
                <option value="form-data">FormData (files supported)</option>
                <option value="urlencoded">x-www-form-urlencoded</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-700">Headers (JSON)</label>
            <textarea
              className="w-full border rounded px-2 py-1 text-xs h-28 font-mono"
              value={headersText}
              onChange={(e) => setHeadersText(e.target.value)}
              onBlur={parseHeaders}
              placeholder='{"Authorization":"Bearer ..." }'
            />
            <div className="text-[11px] text-gray-500">
              For <b>form-data</b>, you usually should <i>omit</i>{" "}
              <code>Content-Type</code>; the browser will set a proper boundary.
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-700">
              Body Template (optional)
            </label>
            <textarea
              className="w-full border rounded px-2 py-1 text-xs h-28 font-mono"
              value={api.bodyTemplate || ""}
              onChange={(e) => setApi({ bodyTemplate: e.target.value })}
              placeholder='{"name":"{{text_1}}","email":"{{email_1}}"}'
            />
            <div className="text-[11px] text-gray-500">
              Use <code>{"{{field_id}}"}</code> to insert values. For JSON
              format, this text should be a valid JSON after replacement.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <TextRow
              label="Success Message Key"
              value={api.successKey ?? "message"}
              onChange={(v) => setApi({ successKey: v })}
              placeholder="message"
            />
            <TextRow
              label="Error Message Key"
              value={api.errorKey ?? "error"}
              onChange={(v) => setApi({ errorKey: v })}
              placeholder="error"
            />
          </div>

          <TextRow
            label="Default Success Message"
            value={api.successDefault ?? "Submitted successfully."}
            onChange={(v) => setApi({ successDefault: v })}
            placeholder="Submitted successfully."
          />
          <TextRow
            label="Default Error Message"
            value={api.errorDefault ?? "Submission failed."}
            onChange={(v) => setApi({ errorDefault: v })}
            placeholder="Submission failed."
          />
        </div>

        <div className="text-xs text-gray-600">
          Connect: <code>... → end → submit</code>. Submit accepts only one
          incoming from End.
        </div>
      </aside>
    );
  }

  // ---- Start/End nodes ----
  if (!isField) {
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

  // ---- Field nodes ----
  const onChange = (patch) => onChangeField(node.id, { ...field, ...patch });

  return (
    <aside className="w-80 border-l bg-white p-4 space-y-3 overflow-auto">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm">Properties</div>
        <button className="text-red-600 text-sm" onClick={onDelete}>
          Delete
        </button>
      </div>
      <div className="text-xs text-gray-500">ID: {field.id}</div>

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
