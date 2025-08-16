import { nanoid } from "nanoid";

export const PALETTE = [
  "text",
  "textarea",
  "radio",
  "select",
  "checkbox",
  "date",
  "file",
  "static",
];

export function defaultField(type) {
  const base = {
    id: nanoid(8),
    type,
    label: "Untitled",
    isRequired: false,
  };

  switch (type) {
    case "text":
      return { ...base, placeholder: "Enter text", inputType: "text" };
    case "textarea":
      return { ...base, placeholder: "Enter details" };
    case "radio":
      return { ...base, options: ["Option 1", "Option 2"] };
    case "select":
      return { ...base, options: ["Option A", "Option B"], multiple: false };
    case "checkbox":
      return { ...base, options: ["Check 1", "Check 2"] };
    case "date":
      return { ...base, minDate: "", maxDate: "" };
    case "file":
      return { ...base, accept: ".png,.jpg", maxSizeMB: 5, multiple: false };
    case "static":
      return { ...base };
    default:
      return base;
  }
}

export function createNodeFromType(typeOrField, fieldOrNull, position, idNum) {
  let field;
  if (typeof typeOrField === "string") {
    field = fieldOrNull || defaultField(typeOrField);
  } else {
    // Provided full field object
    field = typeOrField;
  }
  const id = field.id || String(idNum || nanoid(8));
  field.id = id;

  return {
    id,
    type: "field",
    position: { x: position?.x ?? 50, y: position?.y ?? 50 },
    data: { field },
  };
}

// A LARGE sample schema (40+ mixed fields)
export function getSampleSchema() {
  const s = [];
  s.push({
    id: "title",
    type: "static",
    label: "Registration Form",
    text: "Please fill in all required fields.",
  });
  s.push({
    id: "name",
    type: "text",
    label: "Full Name",
    isRequired: true,
    placeholder: "John Doe",
    inputType: "text",
  });
  s.push({
    id: "email",
    type: "text",
    label: "Email",
    isRequired: true,
    placeholder: "you@example.com",
    inputType: "email",
  });
  s.push({
    id: "pwd",
    type: "text",
    label: "Password",
    isRequired: true,
    placeholder: "••••••••",
    inputType: "password",
  });
  s.push({
    id: "age",
    type: "text",
    label: "Age",
    placeholder: "30",
    inputType: "number",
  });
  s.push({
    id: "bio",
    type: "textarea",
    label: "Short Bio",
    placeholder: "Tell us about yourself",
  });
  s.push({
    id: "gender",
    type: "radio",
    label: "Gender",
    isRequired: true,
    options: ["Male", "Female", "Other"],
  });
  s.push({
    id: "country",
    type: "select",
    label: "Country",
    isRequired: true,
    options: ["India", "USA", "UK", "Germany", "Japan"],
    multiple: false,
  });
  s.push({
    id: "langs",
    type: "checkbox",
    label: "Languages Known",
    options: ["English", "Hindi", "Marathi", "Spanish", "German"],
  });
  s.push({
    id: "dob",
    type: "date",
    label: "Date of Birth",
    minDate: "1900-01-01",
    maxDate: "2025-12-31",
    isRequired: true,
  });
  s.push({
    id: "resume",
    type: "file",
    label: "Upload Resume",
    isRequired: true,
    accept: ".pdf",
    maxSizeMB: 10,
    multiple: false,
  });
  s.push({
    id: "avatar",
    type: "file",
    label: "Profile Photos",
    accept: ".png,.jpg,.jpeg",
    maxSizeMB: 5,
    multiple: true,
  });
  s.push({
    id: "sec-1",
    type: "static",
    label: "Work Preferences",
    text: "Choose your preferences",
  });
  s.push({
    id: "role",
    type: "select",
    label: "Preferred Role",
    options: ["Frontend", "Backend", "Fullstack", "Data"],
    multiple: false,
  });
  s.push({
    id: "skills",
    type: "checkbox",
    label: "Key Skills",
    options: ["React", "Angular", "Node.js", "Python", "SQL", "AWS", "Docker"],
  });
  s.push({
    id: "notice",
    type: "radio",
    label: "Notice Period",
    options: ["Immediate", "15 days", "30 days", "60 days"],
  });
  s.push({
    id: "joinDate",
    type: "date",
    label: "Earliest Joining Date",
    minDate: "2024-01-01",
    maxDate: "2026-12-31",
  });
  s.push({
    id: "sec-2",
    type: "static",
    label: "Contact",
    text: "How we can reach you",
  });
  s.push({
    id: "phone",
    type: "text",
    label: "Phone",
    placeholder: "+91-XXXXXXXXXX",
    inputType: "tel",
    isRequired: true,
  });
  s.push({
    id: "site",
    type: "text",
    label: "Website",
    placeholder: "https://",
    inputType: "url",
  });
  s.push({
    id: "addr1",
    type: "text",
    label: "Address Line 1",
    placeholder: "Street address",
    inputType: "text",
  });
  s.push({
    id: "addr2",
    type: "text",
    label: "Address Line 2",
    placeholder: "Apt, suite",
    inputType: "text",
  });
  s.push({
    id: "city",
    type: "text",
    label: "City",
    placeholder: "Pune",
    inputType: "text",
  });
  s.push({
    id: "state",
    type: "text",
    label: "State",
    placeholder: "Maharashtra",
    inputType: "text",
  });
  s.push({
    id: "zip",
    type: "text",
    label: "ZIP",
    placeholder: "411014",
    inputType: "text",
  });
  s.push({
    id: "favLang",
    type: "radio",
    label: "Favorite Programming Language",
    options: ["JS", "TS", "Python", "Go", "Rust"],
  });
  s.push({
    id: "editor",
    type: "select",
    label: "Preferred Editor",
    options: ["VSCode", "WebStorm", "Vim", "Emacs"],
    multiple: false,
  });
  s.push({
    id: "expYears",
    type: "text",
    label: "Years of Experience",
    inputType: "number",
    placeholder: "8",
  });
  s.push({
    id: "certs",
    type: "checkbox",
    label: "Certifications",
    options: ["AWS", "GCP", "Azure", "CKA", "PMP"],
  });
  s.push({
    id: "shift",
    type: "select",
    label: "Shift Preference",
    options: ["Day", "Evening", "Night"],
    multiple: false,
  });
  s.push({
    id: "tshirt",
    type: "radio",
    label: "T-Shirt Size",
    options: ["S", "M", "L", "XL", "XXL"],
  });
  s.push({
    id: "meal",
    type: "select",
    label: "Meal Preference",
    options: ["Veg", "Non-Veg", "Vegan", "Jain"],
    multiple: false,
  });
  s.push({
    id: "hobbies",
    type: "textarea",
    label: "Hobbies",
    placeholder: "Reading, Cricket, Trekking...",
  });
  s.push({
    id: "github",
    type: "text",
    label: "GitHub URL",
    inputType: "url",
    placeholder: "https://github.com/yourname",
  });
  s.push({
    id: "linkedin",
    type: "text",
    label: "LinkedIn URL",
    inputType: "url",
    placeholder: "https://linkedin.com/in/yourname",
  });
  s.push({
    id: "ref1",
    type: "text",
    label: "Reference 1 Name",
    inputType: "text",
  });
  s.push({
    id: "ref1contact",
    type: "text",
    label: "Reference 1 Contact",
    inputType: "tel",
  });
  s.push({
    id: "ref2",
    type: "text",
    label: "Reference 2 Name",
    inputType: "text",
  });
  s.push({
    id: "ref2contact",
    type: "text",
    label: "Reference 2 Contact",
    inputType: "tel",
  });
  s.push({
    id: "portfolio",
    type: "file",
    label: "Portfolio (zip)",
    accept: ".zip",
    maxSizeMB: 25,
    multiple: false,
  });
  s.push({
    id: "finalNote",
    type: "textarea",
    label: "Any final note?",
    placeholder: "Optional message",
  });
  return s;
}
