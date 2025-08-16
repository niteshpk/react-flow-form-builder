export function saveToFile(text, filename, mime = "text/plain") {
  const blob = new Blob([text], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 0);
}

export function downloadJSON(json, filename = "schema.json") {
  saveToFile(JSON.stringify(json, null, 2), filename, "application/json");
}

export function readTextFile(acceptExts = [".json"]) {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = acceptExts.join(",");
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return reject(new Error("No file"));
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsText(file);
    };
    input.click();
  });
}
