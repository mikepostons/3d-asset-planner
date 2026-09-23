import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {part,fresh,validate,scalePart,height} from './model';
import {partGeometry} from './geometry';
import {defaultRoofDetails,splitRoofSurfaces} from './roof-details';
import {endFaces} from './end-walls';
import {wallFrame} from './openings';
import {platformDefaults,platformGeometry} from './platforms';
function hit(geometry:T.BufferGeometry,p:ReturnType<typeof part>,face:number,x:number,y:number){const f=wallFrame(p,face),mesh=new T.Mesh(geometry,new T.MeshBasicMaterial({side:T.FrontSide}));const hits=new T.Raycaster(f.point(x,y,-1),f.inward,0,1.05).intersectObject(mesh);mesh.material.dispose();return hits;}
test('continuous end walls rise to the roof, retain openings and have no eaves join',()=>{
 for(const ridge of ['width','depth']as const)for(const hollow of [false,true]){
  const p={...part(),ridge,hollowWalls:hollow,roofDetails:defaultRoofDetails()};const face=endFaces(p)[0],f=wallFrame(p,face);
  p.openings=[{id:'w',name:'Window',kind:'window',face,x:1,y:1,width:1,height:1}];
  const g=partGeometry(p,false);
  assert.ok(hit(g,p,face,f.length/2,height(p)+.5).length);
  assert.equal(hit(g,p,face,1.5,1.5).length,0);
  assert.ok(hit(g,p,face,f.length/2,height(p)-.05).length);
  // A contour-built wall must have triangles crossing the former gable seam.
  const pos=g.getAttribute('position');let crossing=0;
  for(let i=0;i<pos.count;i+=3){const vs=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(pos,i+j));if(vs.every(v=>Math.abs(v.clone().sub(f.a).dot(f.inward))<1e-5)&&Math.min(...vs.map(v=>v.y))<height(p)-.1&&Math.max(...vs.map(v=>v.y))>height(p)+.1)crossing++;}
  assert.ok(crossing>0);g.dispose();
 }
});
test('cladding starts at a chosen floor without duplicate wall triangles and each end is independent',()=>{
 const p={...part(),roofDetails:{...defaultRoofDetails(),gableSeparate:true,gableStart:'material' as const,gableStartBaseFloor:1,gableEnd:'hidden' as const}};
 const surfaces=splitRoofSurfaces(partGeometry(p,false));const cladding=surfaces.find(s=>s.name==='End 1 cladding')!;assert.ok(cladding);cladding.geometry.computeBoundingBox();assert.equal(cladding.geometry.boundingBox!.min.y,p.floorHeight);
 const face=endFaces(p)[0],f=wallFrame(p,face),walls=surfaces.find(s=>s.name==='Walls')!;
 assert.equal(hit(walls.geometry,p,face,f.length/2,p.floorHeight+.2).length,0);
 assert.ok(hit(cladding.geometry,p,face,f.length/2,p.floorHeight+.2).length);
 const other=endFaces(p)[1];assert.equal(hit(walls.geometry,p,other,wallFrame(p,other).length/2,height(p)+.4).length,0);
 surfaces.forEach(s=>s.geometry.dispose());
});
test('platform settings persist and scale in metres while floor levels remain fixed',()=>{
 const p=part();p.roofDetails={...defaultRoofDetails(),platformStart:{...platformDefaults(p),supports:true}};
 const saved=validate(JSON.parse(JSON.stringify({...fresh(),parts:[p]}))).parts[0];assert.deepEqual(saved.roofDetails,p.roofDetails);
 const scaled=scalePart(p,2);assert.equal(scaled.roofDetails!.platformStart!.depth,p.roofDetails.platformStart!.depth*2);assert.equal(scaled.roofDetails!.platformStart!.floor,p.roofDetails.platformStart!.floor);
 const meshes=platformGeometry(p);assert.deepEqual(meshes.map(m=>m.name).sort(),['End 1 platform deck','End 1 platform railings','End 1 platform beams','End 1 platform supports'].sort());
 const face=endFaces(p)[0],f=wallFrame(p,face);for(const m of meshes){const pos=m.geometry.getAttribute('position');assert.ok(Array.from(pos.array).every(Number.isFinite));if(m.name.endsWith('deck'))for(let i=0;i<pos.count;i++)assert.ok(new T.Vector3().fromBufferAttribute(pos,i).sub(f.a).dot(f.inward)<1e-5);m.geometry.dispose();}
 assert.throws(()=>validate({...fresh(),parts:[{...p,roofDetails:{...p.roofDetails,platformStart:{...p.roofDetails!.platformStart!,depth:-1}}}]}),/platform/);
});

test('custom platform widths remain centred and scale with the component',()=>{
 const p=part();p.roofDetails={...defaultRoofDetails(),platformStart:{...platformDefaults(p),width:2}};
 const full={...p,roofDetails:{...p.roofDetails,platformStart:{...p.roofDetails!.platformStart!,width:undefined}}};
 const bounds=(part:typeof p)=>{const meshes=platformGeometry(part);const g=meshes.find(m=>m.name.endsWith('deck'))!.geometry;g.computeBoundingBox();const box=g.boundingBox!.clone();meshes.forEach(m=>m.geometry.dispose());return box;};
 const narrow=bounds(p),wide=bounds(full);
 assert.ok(narrow.getCenter(new T.Vector3()).distanceTo(wide.getCenter(new T.Vector3()))<1e-6);
 assert.ok(narrow.getSize(new T.Vector3()).length()<wide.getSize(new T.Vector3()).length());
 assert.equal(scalePart(p,2).roofDetails!.platformStart!.width,4);
 assert.throws(()=>validate({...fresh(),parts:[{...p,roofDetails:{...p.roofDetails,platformStart:{...p.roofDetails!.platformStart!,width:-1}}}]}),/platform width/);
});

test('detailed lean-to walls meet the roof on every side and preserve openings',()=>{
 for(const highEdge of ['left','right','front','back'] as const){
  const p=part();p.roof='lean-to';p.highEdge=highEdge;p.roofDetails=defaultRoofDetails();p.hollowWalls=true;p.openings=[{id:'window',name:'Window',kind:'window',face:0,x:1,y:.5,width:.5,height:1}];
  const roof=partGeometry(p,true),walls=partGeometry(p,false);
  const mesh=new T.Mesh(roof,new T.MeshBasicMaterial({side:T.DoubleSide}));
  for(let face=0;face<4;face++){
   const f=wallFrame(p,face),point=f.point(f.length/2,100);
   const intersections=new T.Raycaster(point,new T.Vector3(0,-1,0)).intersectObject(mesh);
   assert.ok(intersections.length);
   const top=intersections[0].point.y-p.roofDetails.thickness;
   if(top>height(p)+.1)assert.ok(hit(walls,p,face,f.length/2,top-.05).length,`${highEdge} face ${face} is closed`);
  }
  assert.equal(hit(walls,p,0,1.25,1).length,0);
  roof.dispose();walls.dispose();mesh.material.dispose();
 }
});

test('lean-to roof edges are independently assignable with and without detailing',()=>{
 for(const detailed of [false,true]){
  const p=part();p.roof='lean-to';if(detailed)p.roofDetails=defaultRoofDetails();
  const surfaces=splitRoofSurfaces(partGeometry(p,true));
  assert.ok(surfaces.some(s=>s.name==='Roof'));assert.ok(surfaces.some(s=>s.name==='Roof edges'));
  for(const s of surfaces)s.geometry.dispose();
 }
});
