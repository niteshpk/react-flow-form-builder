import { nanoid } from "nanoid";

export const PALETTE = [
  "text",
  "email", // virtual: becomes text+inputType=email
  "password", // virtual: becomes text+inputType=password
  "textarea",
  "radio",
  "select",
  "checkbox",
  "date",
  "file",
  "static",
];

const idCounters = {};
function nextId(prefix) {
  const n = (idCounters[prefix] || 0) + 1;
  idCounters[prefix] = n;
  return `${prefix}_${n}`;
}

// optional utility: after import, call to keep numbering continuous
export function seedIdCountersFromFields(fields = []) {
  for (const f of fields) {
    const m = typeof f.id === "string" && f.id.match(/^([a-zA-Z]+)_(\d+)$/);
    if (!m) continue;
    const [, prefix, num] = m;
    const n = parseInt(num, 10);
    idCounters[prefix] = Math.max(idCounters[prefix] || 0, n);
  }
}

/**
 * Build a default field object.
 * Virtual types:
 *  - 'email'    => { type: 'text', inputType: 'email', id: 'email_<n>' }
 *  - 'password' => { type: 'text', inputType: 'password', id: 'password_<n>' }
 */
export function defaultField(type) {
  // virtual types map to text with specific inputType but keep id prefix as virtual name
  if (type === "email") {
    const field = {
      type: "text",
      label: "Untitled",
      isRequired: false,
      placeholder: "you@example.com",
      inputType: "email",
      id: nextId("email"),
    };
    return field;
  }
  if (type === "password") {
    const field = {
      type: "text",
      label: "Untitled",
      isRequired: false,
      placeholder: "••••••••",
      inputType: "password",
      id: nextId("password"),
    };
    return field;
  }

  const base = { type, label: "Untitled", isRequired: false };

  let field;
  switch (type) {
    case "text":
      field = { ...base, placeholder: "Enter text", inputType: "text" };
      field.id = nextId("text");
      break;
    case "textarea":
      field = { ...base, placeholder: "Enter details" };
      field.id = nextId("textarea");
      break;
    case "radio":
      field = { ...base, options: ["Option 1", "Option 2"] };
      field.id = nextId("radio");
      break;
    case "select":
      field = { ...base, options: ["Option A", "Option B"], multiple: false };
      field.id = nextId("select");
      break;
    case "checkbox":
      field = { ...base, options: ["Check 1", "Check 2"] };
      field.id = nextId("checkbox");
      break;
    case "date":
      field = { ...base, minDate: "", maxDate: "" };
      field.id = nextId("date");
      break;
    case "file":
      field = { ...base, accept: ".png,.jpg", maxSizeMB: 5, multiple: false };
      field.id = nextId("file");
      break;
    case "static":
      field = { ...base, text: "Section text..." };
      field.id = nextId("static");
      break;
    default:
      field = { ...base, id: nextId(type || "field") };
  }

  return field;
}

/**
 * Create a node from a type or full field object (matches your new signature).
 * - Structural: start/end/submit keep random node ids.
 * - String field type uses defaults (email/password are virtual types).
 * - Object keeps its own id (imported schema).
 */
export function createNodeFromType(typeOrField, position, idNum) {
  let id = String(idNum || nanoid(8));

  // Structural nodes
  if (
    typeof typeOrField === "string" &&
    ["start", "end", "submit"].includes(typeOrField)
  ) {
    const data =
      typeOrField === "submit"
        ? { label: "Submit", color: "#2563eb" }
        : { label: typeOrField };
    return {
      id,
      type: typeOrField,
      position: { x: position?.x ?? 50, y: position?.y ?? 50 },
      data,
    };
  }

  // Field nodes
  let field;
  if (typeof typeOrField === "string") {
    field = defaultField(typeOrField); // includes virtual handling
  } else {
    field = { ...typeOrField }; // preserve id on import
  }

  return {
    id: field.id,
    type: "field",
    position: { x: position?.x ?? 50, y: position?.y ?? 50 },
    data: { field },
  };
}

// sample (aligned with your ids; note: email/password ids use desired prefixes)
export function getSampleSchema() {
  // --- 1) define the field objects (keep your same ids) ---
  const fields = [
    {
      id: "static_1",
      type: "static",
      label: "Registration Form",
      text: "Please fill in all required fields.",
    },
    {
      id: "text_1",
      type: "text",
      label: "Full Name",
      isRequired: true,
      placeholder: "John Doe",
      inputType: "text",
    },
    {
      id: "email_1",
      type: "text",
      label: "Email",
      isRequired: true,
      placeholder: "you@example.com",
      inputType: "email",
    },
    {
      id: "password_1",
      type: "text",
      label: "Password",
      isRequired: true,
      placeholder: "••••••••",
      inputType: "password",
    },
    {
      id: "textarea_1",
      type: "textarea",
      label: "Short Bio",
      placeholder: "Tell us about yourself",
    },
    {
      id: "radio_1",
      type: "radio",
      label: "Gender",
      isRequired: true,
      options: ["Male", "Female", "Other"],
    },
    {
      id: "select_1",
      type: "select",
      label: "Country",
      isRequired: true,
      options: ["India", "USA", "UK", "Germany", "Japan"],
      multiple: false,
    },
    {
      id: "checkbox_1",
      type: "checkbox",
      label: "Languages Known",
      options: ["English", "Hindi", "Marathi", "Spanish", "German"],
    },
    {
      id: "date_1",
      type: "date",
      label: "Date of Birth",
      minDate: "1900-01-01",
      maxDate: "2025-12-31",
      isRequired: true,
    },
    {
      id: "file_1",
      type: "file",
      label: "Upload Resume",
      isRequired: true,
      accept: ".pdf",
      maxSizeMB: 10,
      multiple: false,
    },
  ];

  // --- 2) lay out nodes and build the linear path ---
  const startPos = { x: 40, y: 40 };
  const fieldX = 320;
  const firstY = 40;
  const gapY = 120;

  // structural
  const startNode = createNodeFromType("start", startPos);
  const endNode = createNodeFromType("end", {
    x: 40,
    y: firstY + gapY * (fields.length + 0),
  });
  const submitNode = createNodeFromType("submit", {
    x: 40,
    y: firstY + gapY * (fields.length + 1),
  });

  // field nodes in a vertical column
  const fieldNodes = fields.map((f, i) =>
    createNodeFromType(f, { x: fieldX, y: firstY + i * gapY })
  );

  const nodes = [startNode, ...fieldNodes, endNode, submitNode];

  // --- 3) edges: Start -> first field -> ... -> last field -> End -> Submit ---
  const edges = [];
  if (fieldNodes.length > 0) {
    edges.push({
      id: `e_${startNode.id}_${fieldNodes[0].id}`,
      source: startNode.id,
      target: fieldNodes[0].id,
    });
    for (let i = 0; i < fieldNodes.length - 1; i++) {
      edges.push({
        id: `e_${fieldNodes[i].id}_${fieldNodes[i + 1].id}`,
        source: fieldNodes[i].id,
        target: fieldNodes[i + 1].id,
      });
    }
    edges.push({
      id: `e_${fieldNodes[fieldNodes.length - 1].id}_${endNode.id}`,
      source: fieldNodes[fieldNodes.length - 1].id,
      target: endNode.id,
    });
  } else {
    edges.push({
      id: `e_${startNode.id}_${endNode.id}`,
      source: startNode.id,
      target: endNode.id,
    });
  }
  edges.push({
    id: `e_${endNode.id}_${submitNode.id}`,
    source: endNode.id,
    target: submitNode.id,
  });

  // return a graph payload (nodes + edges) ready for import
  return { nodes, edges };
}
