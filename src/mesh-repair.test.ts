import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {repairMeshes,inspectionLines} from './mesh-repair';
import {cleanerDiagnostics,applyPreparedUVs,preparationKey} from './model-cleaner';
import {fresh,part} from './model';
function fixture(){const root=new T.Group(),g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([0,0,0,1,0,0,0,1,0, 0,0,0,1,0,0,0,1,0, 2,0,0,2,0,0,2,0,0],3));root.add(new T.Mesh(g,new T.MeshStandardMaterial()));return root;}
test('repair removes duplicate/degenerate triangles without changing retained positions',()=>{const root=fixture();assert.equal(repairMeshes(root),2);assert.equal(cleanerDiagnostics(root).triangles,1);assert.equal(cleanerDiagnostics(root).degenerate,0);assert.equal(repairMeshes(root),0);});
test('problem edges show open boundaries but no closed-box boundaries',()=>{const box=new T.BoxGeometry();const edges=inspectionLines(box,true);assert.equal(edges.getAttribute('position').count,0);const root=fixture();repairMeshes(root);const mesh=root.children[0] as T.Mesh;assert.equal(inspectionLines(mesh.geometry,true).getAttribute('position').count,6);});
test('welding preserves sharp normals and UV seams',()=>{const root=new T.Group(),mesh=new T.Mesh(new T.BoxGeometry().toNonIndexed());root.add(mesh);repairMeshes(root);assert.equal(mesh.geometry.getAttribute('position').count,24);assert.equal(mesh.geometry.index?.count,36);});
test('saved repair is reapplied before export UV generation',()=>{const p=part(),plan={...fresh(),parts:[p]};const root=fixture();root.userData.partId=p.id;const saved={...plan,preparedUVs:{[p.id]:{sourceKey:preparationKey(plan),metresPerTile:1,repair:true}}};applyPreparedUVs(root,saved);assert.equal(cleanerDiagnostics(root).triangles,1);assert.equal(cleanerDiagnostics(root).missingUVs,0);});
