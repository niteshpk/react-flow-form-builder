import React, { useCallback, useState, useEffect } from "react";

function FieldRenderer({ field, value, onChange, errors }) {
  const err = errors[field.id];

  if (field.type === "static") {
    return (
      <div className="">
        <div className="font-semibold">{field.label || "Section"}</div>
        {field.text && (
          <div className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
            {field.text}
          </div>
        )}
      </div>
    );
  }

  const requiredMark = field.isRequired ? (
    <span className="text-red-600">*</span>
  ) : null;

  return (
    <div>
      {field.label && (
        <label className="block mb-1 text-sm font-medium">
          {field.label} {requiredMark}
        </label>
      )}

      {field.type === "text" && (
        <input
          className="w-full border rounded px-3 py-2"
          type={field.inputType || "text"}
          placeholder={field.placeholder || ""}
          value={value ?? ""}
          onChange={(e) => onChange(field.id, e.target.value)}
        />
      )}

      {field.type === "textarea" && (
        <textarea
          className="w-full border rounded px-3 py-2"
          placeholder={field.placeholder || ""}
          value={value ?? ""}
          onChange={(e) => onChange(field.id, e.target.value)}
        />
      )}

      {field.type === "radio" && (
        <div className="space-y-2">
          {(field.options || []).map((opt) => (
            <label key={opt} className="flex gap-2 items-center">
              <input
                type="radio"
                name={field.id}
                value={opt}
                checked={value === opt}
                onChange={(e) => onChange(field.id, e.target.value)}
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      )}

      {field.type === "select" && (
        <select
          multiple={!!field.multiple}
          className="w-full border rounded px-3 py-2"
          value={value ?? (field.multiple ? [] : "")}
          onChange={(e) => {
            if (field.multiple) {
              const arr = Array.from(e.target.selectedOptions).map(
                (o) => o.value
              );
              onChange(field.id, arr);
            } else {
              onChange(field.id, e.target.value);
            }
          }}
        >
          <option value="" disabled={!field.multiple}>
            Select...
          </option>
          {(field.options || []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )}

      {field.type === "checkbox" && (
        <div className="space-y-2">
          {(field.options || []).map((opt) => (
            <label key={opt} className="flex gap-2 items-center">
              <input
                type="checkbox"
                checked={Array.isArray(value) ? value.includes(opt) : false}
                onChange={(e) => {
                  const set = new Set(Array.isArray(value) ? value : []);
                  if (e.target.checked) set.add(opt);
                  else set.delete(opt);
                  onChange(field.id, Array.from(set));
                }}
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      )}

      {field.type === "date" && (
        <input
          type="date"
          className="w-full border rounded px-3 py-2"
          min={field.minDate || undefined}
          max={field.maxDate || undefined}
          value={value ?? ""}
          onChange={(e) => onChange(field.id, e.target.value)}
        />
      )}

      {field.type === "file" && (
        <input
          type="file"
          className="w-full"
          multiple={!!field.multiple}
          accept={field.accept || undefined}
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            onChange(field.id, files);
          }}
        />
      )}

      {err && <div className="text-xs text-red-600 mt-1">{err}</div>}
    </div>
  );
}

export default function Preview({ schema, values, onValuesChange }) {
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(null);

  const onChange = useCallback(
    (id, val) => {
      onValuesChange((v) => ({ ...v, [id]: val }));
    },
    [onValuesChange]
  );

  // Optional: when schema changes, drop values for removed fields
  useEffect(() => {
    const ids = new Set((schema || []).map((f) => f.id));
    onValuesChange((v) => {
      const out = {};
      for (const k of Object.keys(v || {})) if (ids.has(k)) out[k] = v[k];
      return out;
    });
  }, [schema, onValuesChange]);

  const validate = useCallback(() => {
    const errs = {};
    for (const f of schema) {
      if (f.type === "static") continue;
      const v = values[f.id];

      if (f.isRequired) {
        const empty =
          v == null ||
          (typeof v === "string" && v.trim() === "") ||
          (Array.isArray(v) && v.length === 0);
        if (empty) {
          errs[f.id] = "This field is required.";
          continue;
        }
      }

      if (f.type === "text" && f.inputType === "email" && v) {
        const ok = /\S+@\S+\.\S+/.test(v);
        if (!ok) errs[f.id] = "Please enter a valid email.";
      }

      if (f.type === "date" && v) {
        if (f.minDate && v < f.minDate)
          errs[f.id] = `Date should be on or after ${f.minDate}.`;
        if (f.maxDate && v > f.maxDate)
          errs[f.id] = `Date should be on or before ${f.maxDate}.`;
      }

      if (f.type === "file" && v && Array.isArray(v)) {
        const max = (f.maxSizeMB ?? 5) * 1024 * 1024;
        for (const file of v) {
          if (file.size > max) {
            errs[f.id] = `File ${file.name} exceeds ${f.maxSizeMB}MB.`;
            break;
          }
          if (f.accept) {
            // Simple accept check: match by extension or mime startsWith
            const accepts = f.accept
              .split(",")
              .map((s) => s.trim().toLowerCase())
              .filter(Boolean);
            const ok = accepts.some((a) => {
              if (a.includes("/"))
                return (file.type || "").toLowerCase().startsWith(a);
              if (a.startsWith(".")) return file.name.toLowerCase().endsWith(a);
              return false;
            });
            if (accepts.length && !ok) {
              errs[f.id] = `File ${file.name} is not an accepted type.`;
              break;
            }
          }
        }
      }
    }
    setErrors(errs);
    return errs;
  }, [schema, values]);

  const onSubmit = useCallback(
    (e) => {
      e.preventDefault();
      const errs = validate();
      if (Object.keys(errs).length) return;
      const output = {};
      for (const f of schema) {
        if (f.type === "file") {
          const files = values[f.id];
          output[f.id] = Array.isArray(files)
            ? files.map((f) => ({ name: f.name, size: f.size, type: f.type }))
            : null;
        } else {
          output[f.id] = values[f.id] ?? null;
        }
      }
      console.log("Submitted values:", output);
      setSubmitted(output);
      alert("Form submitted! Check console for JSON. Also shown below.");
    },
    [schema, validate, values]
  );

  const hasSchema = Array.isArray(schema) && schema.length > 0;

  return (
    <div className="h-full w-full overflow-auto p-6">
      {!hasSchema ? (
        <div className="text-sm text-gray-600">
          No schema loaded yet. Go back to Builder and Export or Load Sample.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="max-w-3xl mx-auto space-y-5">
          {schema.map((f) => (
            <div
              key={f.id}
              className="p-4 bg-white rounded-lg border space-y-2"
            >
              <FieldRenderer
                field={f}
                value={values?.[f.id]}
                onChange={onChange}
                errors={errors}
              />
            </div>
          ))}
          <button className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">
            Submit
          </button>
        </form>
      )}

      {submitted && (
        <div className="max-w-3xl mx-auto mt-6">
          <div className="text-sm font-semibold mb-2">Submitted JSON</div>
          <pre className="text-xs bg-gray-900 text-green-300 p-3 rounded-lg overflow-auto">
            {JSON.stringify(submitted, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
