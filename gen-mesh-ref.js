const fs = require('fs');

const g = JSON.parse(fs.readFileSync('E:/f1-exploded-view/model/scene.gltf', 'utf8'));
const bin = fs.readFileSync('E:/f1-exploded-view/model/scene.bin');

function readAccessor(accIdx) {
  const acc = g.accessors[accIdx];
  const bv = g.bufferViews[acc.bufferView];
  const buf = bin;
  const compSizes = { 5120:1, 5121:1, 5122:2, 5123:2, 5125:4, 5126:4 };
  const compSize = compSizes[acc.componentType] || 4;
  const numComps = { SCALAR:1, VEC2:2, VEC3:3, VEC4:4, MAT2:4, MAT3:9, MAT4:16 }[acc.type] || 3;
  const stride = bv.byteStride || compSize * numComps;
  const count = acc.count;
  const result = [];
  let offset = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  for (let i = 0; i < count; i++) {
    const elem = [];
    for (let c = 0; c < numComps; c++) {
      const bo = offset + c * compSize;
      if (acc.componentType === 5126) elem.push(buf.readFloatLE(bo));
      else if (acc.componentType === 5125) elem.push(buf.readUInt32LE(bo));
      else if (acc.componentType === 5123) elem.push(buf.readUInt16LE(bo));
      else if (acc.componentType === 5122) elem.push(buf.readInt16LE(bo));
      else if (acc.componentType === 5121) elem.push(buf.readUInt8(bo));
      else if (acc.componentType === 5120) elem.push(buf.readInt8(bo));
    }
    result.push(numComps === 1 ? elem[0] : elem);
    offset += stride;
  }
  return result;
}

const rootKids = g.nodes[8].children;
const allMeshes = [];

function collectMeshNodes(nodeIdx, parentGroup) {
  const node = g.nodes[nodeIdx];
  if (node.mesh !== undefined && /^Object_\d+$/.test(node.name)) {
    const mesh = g.meshes[node.mesh];
    let posAccIdx = null;
    if (mesh.primitives && mesh.primitives.length > 0) {
      posAccIdx = mesh.primitives[0].attributes.POSITION;
    }
    let cx=0, cy=0, cz=0, min=[Infinity,Infinity,Infinity], max=[-Infinity,-Infinity,-Infinity];
    if (posAccIdx != null) {
      const verts = readAccessor(posAccIdx);
      for (const v of verts) {
        if (v[0] < min[0]) min[0] = v[0]; if (v[1] < min[1]) min[1] = v[1]; if (v[2] < min[2]) min[2] = v[2];
        if (v[0] > max[0]) max[0] = v[0]; if (v[1] > max[1]) max[1] = v[1]; if (v[2] > max[2]) max[2] = v[2];
      }
      cx = (min[0] + max[0]) / 2; cy = (min[1] + max[1]) / 2; cz = (min[2] + max[2]) / 2;
    }
    allMeshes.push({ nodeName: node.name, meshName: mesh.name, group: parentGroup, cx, cy, cz, min, max });
  }
  if (node.children) for (const c of node.children) collectMeshNodes(c, parentGroup);
}
for (const kidIdx of rootKids) collectMeshNodes(kidIdx, g.nodes[kidIdx].name);

// Use CINTURE_OFF group center as origin
const cintureOff = allMeshes.filter(m => m.group === 'CINTURE_OFF_233_362_521');
const mc = { x:0, y:0, z:0 };
if (cintureOff.length > 0) {
  cintureOff.forEach(m => { mc.x += m.cx; mc.y += m.cy; mc.z += m.cz; });
  mc.x /= cintureOff.length; mc.y /= cintureOff.length; mc.z /= cintureOff.length;
} else {
  // Fallback to model center
  allMeshes.forEach(m => { mc.x += m.cx; mc.y += m.cy; mc.z += m.cz; });
  mc.x /= allMeshes.length; mc.y /= allMeshes.length; mc.z /= allMeshes.length;
}

const groups = new Map();
for (const m of allMeshes) {
  if (!groups.has(m.group)) groups.set(m.group, []);
  groups.get(m.group).push({
    node: m.nodeName, mesh: m.meshName,
    rx: m.cx - mc.x, ry: m.cy - mc.y, rz: m.cz - mc.z,
  });
}

const sorted = [...groups.entries()].sort((a,b) => a[0].localeCompare(b[0]));

let out = [];
out.push('# F1 Mesh Coordinate Reference');
out.push('');
out.push('Model: Aston Martin AMR26');
out.push('Origin: CINTURE_OFF group center (' + mc.x.toFixed(4) + ', ' + mc.y.toFixed(4) + ', ' + mc.z.toFixed(4) + ')');
out.push('All coordinates relative to CINTURE_OFF center (X=right, Y=up, Z=forward)');
out.push('');
out.push('| # | Group | Count | Group Center (X, Y, Z) | Meshes |');
out.push('|---|-------|-------|------------------------|--------|');

let idx = 1;
for (const [grp, meshes] of sorted) {
  let gx=0, gy=0, gz=0;
  for (const m of meshes) { gx+=m.rx; gy+=m.ry; gz+=m.rz; }
  gx/=meshes.length; gy/=meshes.length; gz/=meshes.length;

  const meshList = meshes.map(function(m) {
    return m.node + ' (' + m.rx.toFixed(3)+', '+m.ry.toFixed(3)+', '+m.rz.toFixed(3)+')';
  }).join('<br>');

  out.push('| ' + idx + ' | `' + grp + '` | ' + meshes.length + ' | (' +
    gx.toFixed(3) + ', ' + gy.toFixed(3) + ', ' + gz.toFixed(3) + ') | ' + meshList + ' |');
  idx++;
}

out.push('');
out.push('## Blender Cross-Reference');
out.push('');
out.push('Search for each group name in Blender Outliner to find the corresponding geometry.');
out.push('Fill in the real F1 component name below:');
out.push('');
out.push('```');
out.push('#  Group Name                              | F1 Component Name');
out.push('-- --------------------------------------- | -----------------');
idx = 1;
for (const [grp, _] of sorted) {
  out.push(String(idx).padStart(2) + '  ' + grp.padEnd(42) + ' | ');
  idx++;
}
out.push('```');

fs.writeFileSync('E:/f1-exploded-view/mesh-coordinates.md', out.join('\n'), 'utf8');
console.log('Done! Written mesh-coordinates.md with ' + allMeshes.length + ' meshes in ' + sorted.length + ' groups.');
