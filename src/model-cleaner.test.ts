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

test('cylinder unwrap uses circumference, height and a local seam',()=>{
 const root=new T.Group(),mesh=new T.Mesh(new T.CylinderGeometry(2,2,4,64),new T.MeshStandardMaterial());mesh.userData.uvSurface='cylinder';root.add(mesh);generateUVs(root,1);
 const p=mesh.geometry.getAttribute('position'),uv=mesh.geometry.getAttribute('uv');let maxWidth=0;
 for(let i=0;i<p.count;i+=3){if(Math.abs(p.getY(i)-p.getY(i+1))<1e-6&&Math.abs(p.getY(i)-p.getY(i+2))<1e-6)continue;
 const us=[0,1,2].map(j=>uv.getX(i+j));maxWidth=Math.max(maxWidth,Math.max(...us)-Math.min(...us));
 const ys=[0,1,2].map(j=>uv.getY(i+j));assert.ok(Math.abs(Math.max(...ys)-Math.min(...ys)-4)<1e-5);
 }assert.ok(maxWidth<.21);assert.ok(maxWidth>.19);disposeExport(root);
});
test('tapered development preserves wall slant height',()=>{
 const root=new T.Group(),mesh=new T.Mesh(new T.CylinderGeometry(1,2,4,64,1,true),new T.MeshStandardMaterial());mesh.userData.uvSurface='cylinder';root.add(mesh);generateUVs(root);
 const p=mesh.geometry.getAttribute('position'),uv=mesh.geometry.getAttribute('uv');let checked=0;
 for(let i=0;i<p.count;i+=3)for(let a=0;a<3;a++)for(let b=a+1;b<3;b++){
 const aa=i+a,bb=i+b;if(Math.abs(p.getY(aa)-p.getY(bb))<1)continue;
 const thetaA=Math.atan2(p.getZ(aa),p.getX(aa)),thetaB=Math.atan2(p.getZ(bb),p.getX(bb));if(Math.abs(thetaA-thetaB)>1e-5)continue;
 assert.ok(Math.abs(Math.hypot(uv.getX(aa)-uv.getX(bb),uv.getY(aa)-uv.getY(bb))-Math.sqrt(17))<1e-4);checked++;
 }assert.ok(checked>0);disposeExport(root);
});
test('sloping planar mapping preserves edge lengths',()=>{
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([0,0,0,3,0,0,0,4,3],3));const root=new T.Group(),mesh=new T.Mesh(g,new T.MeshStandardMaterial());root.add(mesh);generateUVs(root);const uv=mesh.geometry.getAttribute('uv');assert.ok(Math.abs(Math.hypot(uv.getX(2)-uv.getX(0),uv.getY(2)-uv.getY(0))-5)<1e-5);disposeExport(root);
});
test('hollow cylinder inner wall uses its own circumference and caps stay planar',async()=>{
 const {foundationGeometry}=await import('./foundations');const root=new T.Group();
 const mesh=new T.Mesh(foundationGeometry({...part(),shape:'circle',width:4,innerDiameter:2},{enabled:true,depth:2,margin:0}),new T.MeshStandardMaterial());mesh.userData.uvSurface='cylinder';root.add(mesh);generateUVs(root);
 const p=mesh.geometry.getAttribute('position'),uv=mesh.geometry.getAttribute('uv');let inner=0,caps=0;
 for(let i=0;i<p.count;i+=3){const vs=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,i+j));
 if(vs.every(v=>Math.abs(v.y-vs[0].y)<1e-5)){for(let j=1;j<3;j++)assert.ok(Math.abs(vs[j].distanceTo(vs[0])-Math.hypot(uv.getX(i+j)-uv.getX(i),uv.getY(i+j)-uv.getY(i)))<1e-5);caps++;}
 else if(vs.every(v=>Math.abs(Math.hypot(v.x,v.z)-1)<1e-5)){const us=[0,1,2].map(j=>uv.getX(i+j));assert.ok(Math.max(...us)-Math.min(...us)<.14);inner++;}
 }assert.ok(inner>0&&caps>0);disposeExport(root);
});

test('walls face outward and share the gable UV orientation with or without openings',async()=>{
 const {partGeometry}=await import('./geometry');
 const {gableInfill,defaultRoofDetails}=await import('./roof-details');
 for(const hollow of [false,true])for(const openings of [false,true]){
  const p={...part(),roof:'gable' as const,roofDetails:defaultRoofDetails(),hollowWalls:hollow};
  if(openings)p.openings=[{id:'window',name:'Window',kind:'window',face:0,x:1,y:1,width:1,height:1}];
  const wall=new T.Mesh(partGeometry(p,false));const roof=partGeometry(p,true);
  const root=new T.Group();root.add(wall);
  const ends=gableInfill(p,roof);for(const e of ends)root.add(new T.Mesh(e.geometry));
  generateUVs(root);
  for(const mesh of root.children as T.Mesh[]){
   const pos=mesh.geometry.getAttribute('position'),norm=mesh.geometry.getAttribute('normal'),uv=mesh.geometry.getAttribute('uv');let checked=0;
   for(let i=0;i<pos.count;i+=3){
    const vs=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(pos,i+j));
    const edge=vs.every(v=>Math.abs(v.z+p.depth/2)<1e-5)?'front':vs.every(v=>Math.abs(v.z-p.depth/2)<1e-5)?'back':vs.every(v=>Math.abs(v.x+p.width/2)<1e-5)?'left':vs.every(v=>Math.abs(v.x-p.width/2)<1e-5)?'right':null;
    if(!edge||Math.abs(norm.getY(i))>.01)continue;
    const expected=edge==='front'?new T.Vector3(0,0,-1):edge==='back'?new T.Vector3(0,0,1):edge==='left'?new T.Vector3(-1,0,0):new T.Vector3(1,0,0);
    assert.ok(new T.Vector3().fromBufferAttribute(norm,i).dot(expected)>.99,`inward ${edge} wall hollow=${hollow} openings=${openings} mesh=${root.children.indexOf(mesh)} y=${vs[0].y}`);
    const u=new T.Vector3(0,1,0).cross(expected);
    for(let j=0;j<3;j++){assert.ok(Math.abs(uv.getX(i+j)-vs[j].dot(u))<1e-5);assert.ok(Math.abs(uv.getY(i+j)-vs[j].y)<1e-5);}
    checked++;
   }
   assert.ok(checked>0);
  }
  roof.dispose();disposeExport(root);
 }
});

test('foundation toggles compare generated geometry and accept equivalent legacy preparations',async()=>{
 const {preparationKey,preparationStatus}=await import('./model-cleaner');
 const p=part(),plan={...fresh(),parts:[p]};
 const saved={...plan,preparedUVs:{[p.id]:{sourceKey:preparationKey(plan),metresPerTile:1}}};
 const enabled={...saved,foundation:{enabled:true,depth:1,margin:0}};
 assert.equal(preparationStatus(enabled,[p.id]),false);
 assert.equal(preparationStatus({...enabled,foundation:{enabled:false,depth:2,margin:.3}},[p.id]),true);
 const legacy={...saved,preparedUVs:{[p.id]:{sourceKey:JSON.stringify({mappingVersion:6,parts:plan.parts}),metresPerTile:1}}};
 assert.equal(preparationStatus({...legacy,foundation:{enabled:false,depth:1,margin:0}},[p.id]),true);
 assert.equal(preparationStatus({...legacy,foundation:{enabled:true,depth:1,margin:0}},[p.id]),false);
 const elevated={...plan,parts:[{...p,baseY:3}]};
 assert.equal(preparationKey(elevated),preparationKey({...elevated,foundation:{enabled:true,depth:1,margin:0}}));
});


test('ring cap curved faces use continuous metre-scaled UVs across segment boundaries',()=>{
 const positions:number[]=[];
 for(const [a,b] of [[.1,.2],[.2,.3]]){
  const point=(angle:number,y:number)=>[2*Math.cos(angle),y,2*Math.sin(angle)];
  positions.push(...point(a,0),...point(b,0),...point(b,.2),...point(a,0),...point(b,.2),...point(a,.2));
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.computeVertexNormals();
 const mesh=new T.Mesh(g);mesh.userData.uvSurface='cylinder-band';generateUVs(mesh);
 const uv=mesh.geometry.getAttribute('uv');
 assert.ok(Math.abs(uv.getX(1)-uv.getX(6))<1e-6);
 assert.ok(Math.abs(Math.abs(uv.getX(1)-uv.getX(0))-.2)<1e-5);
 assert.ok(Math.abs(uv.getY(2)-uv.getY(1)-.2)<1e-5);
 mesh.geometry.dispose();(mesh.material as T.Material).dispose();
});
