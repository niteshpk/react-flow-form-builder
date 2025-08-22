import React, { useCallback, useState, useEffect, useMemo } from "react";

function FieldRenderer({ field, value, onChange, errors }) {
  const err = errors[field.id];

  // We won't call FieldRenderer for "static" inside grouped rendering.
  // If you still accidentally pass one, just skip.
  if (field.type === "static") return null;

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

// read nested message like data.message or error.detail
function getByPath(obj, path) {
  if (!path) return undefined;
  return path
    .split(".")
    .reduce((acc, k) => (acc && acc[k] != null ? acc[k] : undefined), obj);
}

// replace {{field_id}} tokens with current values
function applyTemplate(str, values) {
  if (!str) return "";
  return str.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const v = values[key.trim()];
    if (v == null) return "";
    if (Array.isArray(v)) return v.join(", ");
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  });
}

// helper: build an “empty” values object for the current schema
function buildClearedValues(schema) {
  const cleared = {};
  for (const f of schema) {
    switch (f.type) {
      case "text":
      case "textarea":
      case "date":
        cleared[f.id] = "";
        break;
      case "radio":
        cleared[f.id] = ""; // nothing selected
        break;
      case "select":
        cleared[f.id] = f.multiple ? [] : "";
        break;
      case "checkbox":
        cleared[f.id] = [];
        break;
      case "file":
        cleared[f.id] = []; // we’ll also remount the form to clear native FileList
        break;
      // static has no value
      default:
        cleared[f.id] = null;
    }
  }
  return cleared;
}

function computeErrors(schema, values) {
  const errs = {};
  for (const f of schema) {
    if (f.type === "static") continue;
    const v = values[f.id];

    // Required
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

    // Type-specific
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

    if (f.type === "file" && Array.isArray(v) && v.length) {
      const max = (f.maxSizeMB ?? 5) * 1024 * 1024;
      for (const file of v) {
        if (file.size > max) {
          errs[f.id] = `File ${file.name} exceeds ${f.maxSizeMB}MB.`;
          break;
        }
        if (f.accept) {
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
  return errs;
}

function computeFieldError(field, values) {
  if (!field || field.type === "static") return undefined;

  const v = values[field.id];

  // Required
  if (field.isRequired) {
    const empty =
      v == null ||
      (typeof v === "string" && v.trim() === "") ||
      (Array.isArray(v) && v.length === 0);
    if (empty) return "This field is required.";
  }

  // Type-specific
  if (field.type === "text" && v) {
    if (field.inputType === "email") {
      const ok = /\S+@\S+\.\S+/.test(v);
      if (!ok) return "Please enter a valid email.";
    }
  }

  if (field.type === "date" && v) {
    if (field.minDate && v < field.minDate)
      return `Date should be on or after ${field.minDate}.`;
    if (field.maxDate && v > field.maxDate)
      return `Date should be on or before ${field.maxDate}.`;
  }

  if (field.type === "file" && Array.isArray(v) && v.length) {
    const max = (field.maxSizeMB ?? 5) * 1024 * 1024;
    for (const file of v) {
      if (file.size > max)
        return `File ${file.name} exceeds ${field.maxSizeMB}MB.`;
      if (field.accept) {
        const accepts = field.accept
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);
        const ok = accepts.some((a) => {
          if (a.includes("/"))
            return (file.type || "").toLowerCase().startsWith(a);
          if (a.startsWith(".")) return file.name.toLowerCase().endsWith(a);
          return false;
        });
        if (accepts.length && !ok)
          return `File ${file.name} is not an accepted type.`;
      }
    }
  }

  return undefined;
}

// ---- NEW: group schema into sections (each static starts a section) ----
function groupIntoSections(schema) {
  const groups = [];
  let current = null;

  for (const f of schema || []) {
    if (f.type === "static") {
      current = { static: f, fields: [] };
      groups.push(current);
    } else {
      if (!current) {
        // fields before any static → ungrouped section
        current = { static: null, fields: [] };
        groups.push(current);
      }
      current.fields.push(f);
    }
  }
  return groups;
}

export default function Preview({
  schema,
  values,
  onValuesChange,
  submit,
  show,
}) {
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverMsg, setServerMsg] = useState(null);
  const [serverErr, setServerErr] = useState(null);
  const [formKey, setFormKey] = useState(0);

  const submitMeta = {
    label: submit?.label || "Submit",
    color: submit?.color || "#2563eb",
    api: submit?.api || {
      url: "",
      method: "POST",
      contentType: "json", // 'json' | 'form-data' | 'urlencoded'
      headers: { "Content-Type": "application/json" },
      bodyTemplate: "", // optional, supports {{field_id}} tokens
      successKey: "message",
      successDefault: "Submitted successfully.",
      errorKey: "error",
      errorDefault: "Submission failed.",
    },
  };

  const validate = useCallback(
    (overrideValues = values) => {
      const errs = computeErrors(schema, overrideValues);
      setErrors(errs);
      return errs;
    },
    [schema, values]
  );

  const onChange = useCallback(
    (id, val) => {
      onValuesChange((prev) => {
        const next = { ...prev, [id]: val };

        const field = schema.find((f) => f.id === id);
        const msg = computeFieldError(field, next);

        setErrors((prevErrs) => {
          if (msg) return { ...prevErrs, [id]: msg };
          const { [id]: _, ...rest } = prevErrs;
          return rest;
        });

        return next;
      });
    },
    [onValuesChange, schema]
  );

  useEffect(() => {
    const ids = new Set((schema || []).map((f) => f.id));
    onValuesChange((v) => {
      const out = {};
      for (const k of Object.keys(v || {})) if (ids.has(k)) out[k] = v[k];
      return out;
    });
  }, [schema, onValuesChange]);

  useEffect(() => {
    clearForm();
    setServerErr(null);
    setServerMsg(null);
    setLoading(false);
    setErrors({});
    setFormKey(0); // reset form key to remount inputs
  }, [show]);

  const groups = useMemo(() => groupIntoSections(schema), [schema]);

  const buildRequest = useCallback(() => {
    const api = submitMeta.api || {};
    const ct = api.contentType || "json";
    const headers = { ...(api.headers || {}) };

    // Collect non-file field values
    const plain = {};
    for (const f of schema) {
      if (f.type === "file") continue;
      plain[f.id] = values[f.id];
    }

    const tpl =
      api.bodyTemplate && api.bodyTemplate.trim() ? api.bodyTemplate : null;

    if (ct === "form-data") {
      const fd = new FormData();

      if (tpl) {
        try {
          const text = applyTemplate(tpl, values);
          const obj = JSON.parse(text);
          Object.entries(obj).forEach(([k, v]) => {
            if (Array.isArray(v)) v.forEach((item) => fd.append(k, item));
            else fd.append(k, v ?? "");
          });
        } catch {
          Object.entries(plain).forEach(([k, v]) => fd.append(k, v ?? ""));
        }
      } else {
        Object.entries(plain).forEach(([k, v]) => fd.append(k, v ?? ""));
      }

      // append files
      for (const f of schema) {
        if (f.type === "file") {
          const files = values[f.id];
          if (Array.isArray(files)) {
            for (const file of files) fd.append(f.id, file, file.name);
          }
        }
      }

      if ("Content-Type" in headers) delete headers["Content-Type"];
      return { body: fd, headers };
    }

    if (ct === "urlencoded") {
      const usp = new URLSearchParams();
      if (tpl) {
        try {
          const text = applyTemplate(tpl, values);
          const obj = JSON.parse(text);
          Object.entries(obj).forEach(([k, v]) => {
            if (Array.isArray(v))
              v.forEach((item) => usp.append(k, String(item)));
            else usp.set(k, v == null ? "" : String(v));
          });
        } catch {
          Object.entries(plain).forEach(([k, v]) =>
            usp.set(k, v == null ? "" : String(v))
          );
        }
      } else {
        Object.entries(plain).forEach(([k, v]) =>
          usp.set(k, v == null ? "" : String(v))
        );
      }
      headers["Content-Type"] =
        "application/x-www-form-urlencoded;charset=UTF-8";
      return { body: usp, headers };
    }

    // JSON (default)
    let obj;
    if (tpl) {
      try {
        const text = applyTemplate(tpl, values);
        obj = JSON.parse(text);
      } catch {
        obj = plain;
      }
    } else {
      obj = plain;
    }

    // include file names in JSON if present
    for (const f of schema) {
      if (f.type === "file") {
        const files = values[f.id];
        if (Array.isArray(files)) obj[f.id] = files.map((x) => x?.name);
      }
    }

    headers["Content-Type"] = "application/json";
    return { body: JSON.stringify(obj), headers };
  }, [schema, values, submitMeta.api]);

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setServerMsg(null);
      setServerErr(null);

      const errs = validate();
      if (Object.keys(errs).length) return;

      const api = submitMeta.api || {};
      if (!api.url) {
        setServerErr("No API URL configured on Submit node.");
        return;
      }

      try {
        const { body, headers } = buildRequest();
        setLoading(true);

        const method = (api.method || "POST").toUpperCase();
        const res = await fetch(api.url, {
          method,
          headers,
          body: ["GET", "HEAD"].includes(method) ? undefined : body,
        });

        const contentType = res.headers.get("content-type") || "";
        let payload = null;
        try {
          payload = contentType.includes("application/json")
            ? await res.json()
            : await res.text();
        } catch {
          payload = null;
        }

        if (res.ok) {
          let msg = api.successDefault || "Submitted successfully.";
          if (payload && typeof payload === "object" && api.successKey) {
            const found = getByPath(payload, api.successKey);
            if (found != null) msg = String(found);
          }
          setServerMsg(msg);

          clearForm();
        } else {
          let msg = api.errorDefault || "Submission failed.";
          if (payload && typeof payload === "object" && api.errorKey) {
            const found = getByPath(payload, api.errorKey);
            if (found != null) msg = String(found);
          } else if (typeof payload === "string" && payload) {
            msg = payload;
          }
          setServerErr(msg);
        }
      } catch (err) {
        setServerErr(api.errorDefault || "Submission failed.");
        console.error("Submission error:", err);
      } finally {
        setLoading(false);
      }
    },
    [validate, buildRequest, submitMeta]
  );

  const clearForm = () => {
    const cleared = buildClearedValues(schema);
    onValuesChange(cleared);
    setErrors({});
    setFormKey((k) => k + 1);
  };

  const hasSchema = Array.isArray(schema) && schema.length > 0;

  return (
    <div className="h-full w-full overflow-auto p-6">
      {!hasSchema ? (
        <div className="text-sm text-gray-600">
          No schema loaded yet. Go back to Builder and Export or Load Sample.
        </div>
      ) : (
        <form
          key={formKey}
          onSubmit={onSubmit}
          className="max-w-3xl mx-auto space-y-5"
        >
          {groups.map((g, idx) => (
            <div
              key={g.static?.id || `group_${idx}`}
              className="p-4 bg-white rounded-lg border space-y-3"
            >
              {g.static && (
                <div className="p-3 bg-gray-50 rounded border">
                  <div className="font-semibold">
                    {g.static.label || "Section"}
                  </div>
                  {g.static.text && (
                    <div className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                      {g.static.text}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                {g.fields.length === 0 ? (
                  <div className="text-xs text-gray-500">
                    No fields in this section.
                  </div>
                ) : (
                  g.fields.map((f, i) => (
                    <div key={f.id} className={i ? "pt-3 border-t" : undefined}>
                      <FieldRenderer
                        field={f}
                        value={values?.[f.id]}
                        onChange={onChange}
                        errors={errors}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}

          <button
            className="px-4 py-2 rounded-md text-white disabled:opacity-60"
            style={{ backgroundColor: submitMeta.color }}
            disabled={loading}
          >
            {loading ? "Submitting..." : submitMeta.label}
          </button>
        </form>
      )}

      {serverMsg && (
        <div className="max-w-3xl mx-auto mt-6">
          <div className="p-3 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 text-sm">
            {serverMsg}
          </div>
        </div>
      )}
      {serverErr && (
        <div className="max-w-3xl mx-auto mt-6">
          <div className="p-3 rounded-md bg-red-50 text-red-800 border border-red-300 text-sm">
            {serverErr}
          </div>
        </div>
      )}
    </div>
  );
}
