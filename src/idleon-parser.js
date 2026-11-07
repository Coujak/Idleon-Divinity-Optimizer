// Conservative schema inspection for Idleon Toolbox JSON.
// Reports exact paths and raw values; it does not guess game meanings.
export function inspectIdleonSave(root) {
  if (!root || typeof root !== "object" || Array.isArray(root)) throw new TypeError("Expected a JSON object at the document root.");
  const data = root.data && typeof root.data === "object" && !Array.isArray(root.data) ? root.data : null;
  const divinity = data && Array.isArray(data.Divinity) ? data.Divinity : null;
  const candidateDataKeys = data ? Object.keys(data).filter(key => /divin|coral|reef|sing|spiral|god.?rank/i.test(key)) : [];
  const matchingPaths = [], seen = new WeakSet();
  function visit(value, path) {
    if (!value || typeof value !== "object" || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) { value.forEach((item, index) => visit(item, path + "[" + index + "]")); return; }
    for (const [key, child] of Object.entries(value)) {
      const childPath = path ? path + "." + key : key;
      if (/divin|coral|reef|sing|spiral|god.?rank/i.test(key)) matchingPaths.push({
        path: childPath, type: Array.isArray(child) ? "array" : child === null ? "null" : typeof child,
        length: Array.isArray(child) || typeof child === "string" ? child.length : undefined
      });
      visit(child, childPath);
    }
  }
  visit(root, "");
  return { rootKeys: Object.keys(root), hasDataObject: Boolean(data), dataKeyCount: data ? Object.keys(data).length : 0,
    divinityVector: divinity ? divinity.map((value, index) => ({ index, value, type: typeof value })) : null,
    candidateDataKeys, matchingPaths: matchingPaths.slice(0, 100) };
}
