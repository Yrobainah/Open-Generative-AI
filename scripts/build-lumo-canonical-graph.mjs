import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const output = 'content/continuity/lumo-canonical-graph-v1.json';
const roots = [
  'config/lumo-canon-lock-v4.json',
  'config/lumo-tool-policy-v1.json',
  'content/characters',
  'content/continuity',
  'content/production',
  'content/season-01',
];

function listJson(target) {
  const absolute = path.join(root, target);
  if (!fs.existsSync(absolute)) return [];
  if (fs.statSync(absolute).isFile()) return target === output ? [] : [target];
  return fs.readdirSync(absolute, { withFileTypes: true })
    .flatMap((entry) => listJson(path.join(target, entry.name)))
    .filter((file) => file.endsWith('.json') && file !== output)
    .sort();
}

const files = [...new Set(roots.flatMap(listJson))].sort();
const nodes = new Map();
const edges = new Map();
const documents = [];

function addNode(id, type, source, label = id) {
  if (!nodes.has(id)) nodes.set(id, { id, type, label, source, state: 'EXTRACTED' });
}

function addEdge(from, to, relation, source) {
  if (!from || !to || from === to) return;
  const id = `${from}|${relation}|${to}`;
  if (!edges.has(id)) edges.set(id, { id, from, to, relation, source, state: 'EXTRACTED' });
}

function collectObjects(value, file, parentId = `file:${file}`, key = 'root') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectObjects(item, file, parentId, `${key}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  const objectId = typeof value.id === 'string' && value.id.trim() ? value.id : null;
  const nextParent = objectId || parentId;
  if (objectId) {
    addNode(objectId, key, file, value.name || value.title || objectId);
    addEdge(parentId, objectId, parentId.startsWith('file:') ? 'DEFINES' : 'CONTAINS', file);
  }
  for (const [childKey, child] of Object.entries(value)) collectObjects(child, file, nextParent, childKey);
}

function collectReferences(value, file, ownerId, knownIds) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectReferences(item, file, ownerId, knownIds));
    return;
  }
  if (value && typeof value === 'object') {
    const nextOwner = typeof value.id === 'string' && knownIds.has(value.id) ? value.id : ownerId;
    for (const child of Object.values(value)) collectReferences(child, file, nextOwner, knownIds);
    return;
  }
  if (typeof value !== 'string') return;
  if (knownIds.has(value)) addEdge(ownerId, value, 'REFERENCES', file);
  if (value.startsWith('/lumo-kids/canon/')) {
    const assetId = `asset:${value}`;
    addNode(assetId, 'canonical-asset', file, value.split('/').at(-1));
    addEdge(ownerId, assetId, 'USES_ASSET', file);
  }
}

for (const file of files) {
  const value = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  documents.push({ file, value });
  addNode(`file:${file}`, 'source-file', file, file);
  collectObjects(value, file);
}

const knownIds = new Set(nodes.keys());
for (const { file, value } of documents) collectReferences(value, file, `file:${file}`, knownIds);

const graph = {
  id: 'LUMO-CANONICAL-GRAPH-V1',
  version: 1,
  generatedBy: 'scripts/build-lumo-canonical-graph.mjs',
  authority: 'derived',
  graphifyMode: 'augment-only',
  sourceFiles: files,
  counts: { nodes: nodes.size, relationships: edges.size },
  nodes: [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id)),
  relationships: [...edges.values()].sort((a, b) => a.id.localeCompare(b.id)),
};

fs.writeFileSync(path.join(root, output), `${JSON.stringify(graph, null, 2)}\n`);
console.log(`Lumo canonical graph: ${graph.counts.nodes} nodes / ${graph.counts.relationships} relationships`);
