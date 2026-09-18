import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {generateUVs,cleanerDiagnostics} from './model-cleaner';
import {prepareModelExport,disposeExport} from './model-export';
import {fresh,part} from './model';
test('projection UVs preserve positions and use a consistent metre scale',()=>{
 const root=new T.Group(),g=new T.BoxGeometry(2,3,4).toNonIndexed();g.deleteAttribute('uv');const mesh=new T.Mesh(g,new T.MeshStandardMaterial());root.add(mesh);
 const before=Array.from(g.getAttribute('position').array);assert.equal(cleanerDiagnostics(root).missingUVs,1);
 generateUVs(root,2);assert.equal(cleanerDiagnostics(root).missingUVs,0);assert.deepEqual(Array.from(mesh.geometry.getAttribute('position').array),before);
 assert.ok(Array.from(mesh.geometry.getAttribute('uv').array).every(Number.isFinite));assert.equal(mesh.geometry.getAttribute('uv').count,mesh.geometry.getAttribute('position').count);
 assert.throws(()=>generateUVs(root,0));disposeExport(root);
});
test('export groups clusters and quoins without merging or moving meshes',()=>{
 const p=part(),solids=new T.Group(),component=new T.Group();component.userData.partId=p.id;component.name=p.name;component.position.x=5;solids.add(component);
 p.stoneClusters={enabled:true,seed:1,size:.3,variation:0,projection:.1,gap:.01,chamfer:.01,clearance:.2,material:'Stone',clusters:[{id:'cluster-a',seed:1,count:3,spread:1}]};
 for(const name of ['Cluster stone','Quoin']){const m=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial());m.name=name;m.userData={part:p.id,...(name==='Quoin'?{}:{clusterId:'cluster-a'})};component.add(m);}
 const result=prepareModelExport(solids,undefined,{...fresh(),parts:[p]},false);assert.equal(result.report.meshes,2);
 const cluster=result.root.getObjectByName('Cluster 1')!;assert.ok(cluster);assert.equal(cluster.children.length,1);result.root.updateMatrixWorld(true);assert.equal(cluster.children[0].getWorldPosition(new T.Vector3()).x,5);assert.ok(result.root.getObjectByName('Quoins'));disposeExport(result.root);
});

test('saved preparation survives scene serialization and expires after geometry edits',async()=>{
 const {preparationKey,preparationStatus,applyPreparedUVs}=await import('./model-cleaner');
 const p=part(),plan={...fresh(),parts:[p]};
 assert.equal(preparationStatus(plan,[p.id]),false);
 const prepared={...plan,preparedUVs:{[p.id]:{sourceKey:preparationKey(plan),metresPerTile:2}}};
 assert.equal(preparationStatus(JSON.parse(JSON.stringify(prepared)),[p.id]),true);
 const root=new T.Group(),component=new T.Group();component.userData.partId=p.id;root.add(component);
 const geometry=new T.BoxGeometry();geometry.deleteAttribute('uv');component.add(new T.Mesh(geometry,new T.MeshStandardMaterial()));
 assert.equal(applyPreparedUVs(root,prepared),1);assert.equal(cleanerDiagnostics(root).missingUVs,0);
 p.materials='Changed description';assert.equal(preparationStatus(prepared,[p.id]),true);
 p.width+=1;assert.equal(preparationStatus(prepared,[p.id]),false);assert.equal(applyPreparedUVs(root,prepared),0);disposeExport(root);
});
