// src/lib/ordering.js
/**
 * Branch-aware ordering & validation for:
 * start -> static_i -> field chain_i -> (end) -> submit
 * Multiple static branches are supported.
 */

export function isFieldNode(n) {
  return n?.type === "field" && n?.data?.field;
}
export function isStaticWrapperNode(n) {
  return isFieldNode(n) && n.data.field.type === "static";
}
export function isStructural(n) {
  return n?.type === "start" || n?.type === "end" || n?.type === "submit";
}

function indexGraph(nodes, edges) {
  const idToNode = new Map(nodes.map((n) => [n.id, n]));
  const outMap = new Map();
  const inMap = new Map();
  for (const e of edges) {
    if (!outMap.has(e.source)) outMap.set(e.source, []);
    if (!inMap.has(e.target)) inMap.set(e.target, []);
    outMap.get(e.source).push(e.target);
    inMap.get(e.target).push(e.source);
  }
  return { idToNode, outMap, inMap };
}

function sortByPosition(ids, idToNode) {
  return [...ids].sort((a, b) => {
    const A = idToNode.get(a);
    const B = idToNode.get(b);
    const ay = A?.position?.y ?? 0;
    const by = B?.position?.y ?? 0;
    const ax = A?.position?.x ?? 0;
    const bx = B?.position?.x ?? 0;
    return ay - by || ax - bx || String(a).localeCompare(String(b));
  });
}

/**
 * Given a list of next ids, pick the first "content" field neighbor
 * (skips structural; prefers non-static fields; falls back to static).
 */
function pickFirstContentNeighbor(nexts, idToNode) {
  const fieldNexts = nexts.filter((id) => isFieldNode(idToNode.get(id)));
  if (!fieldNexts.length) return null;
  // Prefer non-static content fields
  const nonStatic = fieldNexts.filter(
    (id) => !isStaticWrapperNode(idToNode.get(id))
  );
  const sorted = sortByPosition(fieldNexts, idToNode);
  const sortedNonStatic = sortByPosition(nonStatic, idToNode);
  return (sortedNonStatic[0] ?? sorted[0]) || null;
}

/**
 * Derive ordered fields for preview:
 * - Sections (static wrappers) reachable from Start are sorted by position.
 * - Within each section, we render the static label first,
 *   then follow a single linear chain of fields via edges.
 * - We stop a branch when we hit End, another Static, or no next field.
 */
export function deriveOrderedFields(nodes, edges) {
  const { idToNode, outMap } = indexGraph(nodes, edges);
  const start = nodes.find((n) => n.type === "start");
  const end = nodes.find((n) => n.type === "end");
  const submit = nodes.find((n) => n.type === "submit");

  const warnings = [];
  if (!start) warnings.push("Missing Start node.");
  if (!end) warnings.push("Missing End node.");
  if (!submit) warnings.push("Missing Submit node.");

  const orderedFields = [];
  const sequence = [];

  if (!start) return { orderedFields, sequence, warnings };

  // Outgoing from start -> pick all static wrappers (sections)
  const startNexts = outMap.get(start.id) || [];
  const staticBranchIds = startNexts.filter((id) =>
    isStaticWrapperNode(idToNode.get(id))
  );
  if (!staticBranchIds.length) {
    warnings.push(
      "No static-wrapper (section) connected from Start. Connect Start → Static nodes."
    );
  }

  const sortedSections = sortByPosition(staticBranchIds, idToNode);
  const visitedFieldIds = new Set();

  for (const sid of sortedSections) {
    const sNode = idToNode.get(sid);
    if (!sNode) continue;

    // Push the static label itself as the first item of the section
    if (isStaticWrapperNode(sNode)) {
      orderedFields.push(sNode.data.field);
      sequence.push(sNode.id);
    }

    // Follow the chain of fields from this static
    let curr = pickFirstContentNeighbor(outMap.get(sid) || [], idToNode);

    const safetyLimit = nodes.length + 10;
    let guard = 0;
    while (curr && guard++ < safetyLimit) {
      if (visitedFieldIds.has(curr)) break;
      const n = idToNode.get(curr);
      if (!n) break;

      if (n.type === "end") {
        sequence.push(n.id);
        break;
      }
      if (isStaticWrapperNode(n)) {
        // Encountered another static wrapper -> this begins another section; stop this branch
        warnings.push(
          `Section "${
            sNode.data?.field?.label || sNode.id
          }" points to another Static. Consider wiring that Static from Start directly.`
        );
        break;
      }
      if (!isFieldNode(n)) {
        // structural or unknown
        sequence.push(n.id);
        break;
      }

      // normal field
      orderedFields.push(n.data.field);
      sequence.push(n.id);
      visitedFieldIds.add(n.id);

      const nexts = outMap.get(n.id) || [];
      const next = pickFirstContentNeighbor(nexts, idToNode);
      if (!next) {
        // maybe this field goes to End
        const toEnd = nexts.find((id) => idToNode.get(id)?.type === "end");
        if (toEnd) sequence.push(toEnd);
        break;
      }
      curr = next;
    }
  }

  // If End connects to Submit, show that at the tail of the inspector sequence
  if (end && submit) sequence.push(end.id, submit.id);

  return { orderedFields, sequence, warnings };
}

/**
 * Validate a *new* connection while drawing.
 * Rules:
 * - start -> static only (or start -> end)
 * - static -> field (first field in section) OR static -> end
 * - field -> field (chain) OR field -> end
 * - end -> submit only
 * - submit: no outgoing; exactly one incoming from end (checked elsewhere)
 */
export function validateEdgeDraft({ source, target }, nodes) {
  const idToNode = new Map(nodes.map((n) => [n.id, n]));
  const S = idToNode.get(source);
  const T = idToNode.get(target);
  if (!S || !T) return false;

  const sIsField = isFieldNode(S);
  const tIsField = isFieldNode(T);
  const tIsStatic = isStaticWrapperNode(T);

  if (S.type === "start") {
    if (T.type === "end") return true;
    return tIsStatic; // start -> static only
  }
  if (S.type === "end") {
    return T.type === "submit"; // end -> submit
  }
  if (S.type === "submit") {
    return false; // no outgoing
  }
  if (sIsField) {
    // from static wrapper
    if (isStaticWrapperNode(S)) {
      if (T.type === "end") return true;
      // static -> first field (not static)
      return tIsField && !tIsStatic;
    }
    // from normal field: can chain or go to end
    if (tIsField && !tIsStatic) return true;
    if (T.type === "end") return true;
    return false;
  }

  // default deny
  return false;
}

/**
 * Graph-level warnings (not hard fails):
 * - Submit should have exactly one incoming from End
 * - End can have multiple incomings
 * - Start should lead to >=1 static sections
 */
export function validateGraph(nodes, edges) {
  const { inMap } = indexGraph(nodes, edges);
  const warnings = [];

  const submit = nodes.find((n) => n.type === "submit");
  const end = nodes.find((n) => n.type === "end");
  const start = nodes.find((n) => n.type === "start");

  if (submit && end) {
    const ins = inMap.get(submit.id) || [];
    if (ins.length !== 1 || !ins.includes(end.id)) {
      warnings.push("Submit must have exactly one incoming edge from End.");
    }
  }
  if (start) {
    // soft check: at least one static reachable directly
    // (best-effort: just check direct out)
    // not an error; deriveOrderedFields already warns if none
  }
  return warnings;
}
