import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Stage} from './stage';
import {fresh,part} from './model';

test('scene material preview applies saved assignments without changing triangle positions',async()=>{
 const plan=fresh(),p=part();plan.parts=[p];plan.materialAssignments={[`${p.id}:Walls`]:'red'};
 const mesh=new T.Mesh(new T.BoxGeometry(2,3,2),new T.MeshStandardMaterial());mesh.name='Walls';mesh.userData.part=p.id;
 const solids=new T.Group();solids.add(mesh);
 const before=new T.Box3().setFromObject(solids);
 const fake:any={plan,solids,materialRequest:0,materialRecords:Promise.resolve([{id:'red',name:'Red',tint:'#c03020',roughness:.8,scale:1,rotation:0}])};
 await (Stage.prototype as any).previewMaterials.call(fake);
 assert.equal(mesh.material.color.getHexString(),'c03020');
 assert.ok(mesh.geometry.getAttribute('uv'));
 assert.deepEqual(new T.Box3().setFromObject(solids),before);
});
test('an obsolete material load cannot replace a rebuilt scene',async()=>{
 const plan=fresh(),p=part();plan.parts=[p];plan.materialAssignments={[`${p.id}:Walls`]:'red'};
 const mesh=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial({color:'#ffffff'}));mesh.name='Walls';mesh.userData.part=p.id;
 const solids=new T.Group();solids.add(mesh);
 let resolve!:(v:any)=>void;
 const fake:any={plan,solids,materialRequest:0,materialRecords:new Promise(r=>resolve=r)};
 const pending=(Stage.prototype as any).previewMaterials.call(fake);++fake.materialRequest;
 resolve([{id:'red',name:'Red',tint:'#c03020',roughness:1,scale:1,rotation:0}]);await pending;
 assert.equal(mesh.material.color.getHexString(),'ffffff');
});

test('texture visibility skips preview without modifying assignments and restores on enable',async()=>{
 const plan=fresh(),p=part();plan.parts=[p];plan.materialAssignments={[`${p.id}:Walls`]:'red'};
 const mesh=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial({color:'#ffffff'}));mesh.name='Walls';mesh.userData.part=p.id;
 const solids=new T.Group();solids.add(mesh);
 const fake:any={plan,solids,showTextures:false,materialRequest:0,materialRecords:Promise.resolve([{id:'red',name:'Red',tint:'#c03020',roughness:1,scale:1,rotation:0}])};
 await (Stage.prototype as any).previewMaterials.call(fake);
 assert.equal(mesh.material.color.getHexString(),'ffffff');assert.equal(plan.materialAssignments[`${p.id}:Walls`],'red');
 fake.showTextures=true;await (Stage.prototype as any).previewMaterials.call(fake);assert.equal(mesh.material.color.getHexString(),'c03020');
 mesh.geometry.dispose();mesh.material.dispose();
});

test('an opening remains pickable through its own projecting surround, but not another part',async()=>{
 const {wallFrame}=await import('./openings');const p=part();const o={id:'window',name:'Window',kind:'window' as const,face:3,x:1,y:1,width:1,height:1};p.openings=[o];
 const aids={children:[]},solids={children:[]};const f=wallFrame(p,3),origin=f.point(1.5,1.5,-2);const obstacle=new T.Mesh(new T.BoxGeometry(),new T.MeshBasicMaterial());obstacle.userData={part:p.id,openingId:o.id};
 const fake:any={plan:{...fresh(),parts:[p]},aids,solids,getRay(){},ray:{ray:{origin},intersectObjects(objects:unknown){return objects===solids.children?[{object:obstacle,distance:1}]:[];}},openingPoint(){return new T.Vector2(1.5,1.5);},renderer:{domElement:{getBoundingClientRect(){return{left:0,top:0,width:100,height:100};}}},camera:new T.PerspectiveCamera()};
 assert.equal((Stage.prototype as any).pickOpening.call(fake,{clientX:50,clientY:50}).o.id,o.id);
 obstacle.userData={part:'other-part'};assert.equal((Stage.prototype as any).pickOpening.call(fake,{clientX:50,clientY:50}),undefined);
 obstacle.geometry.dispose();obstacle.material.dispose();
});

test('first pointer press starts an opening drag and synchronises selection before the render update',()=>{
 const p=part(),o={id:'end-window',name:'Window',kind:'window' as const,face:1,x:1.5,y:4.5,width:.5,height:1};p.openings=[o];
 let captured=0,chosen='';
 const fake:any={tool:'select',selected:null,selectedOpenings:[],openingPoint:()=>new T.Vector2(1.75,5),chooseOpening:(_p:string,id:string)=>{chosen=id},controls:{enabled:true},renderer:{domElement:{setPointerCapture:(id:number)=>{captured=id}}}};
 Stage.prototype.startOpeningDrag.call(fake,{pointerId:9,shiftKey:false} as PointerEvent,{p,o,handle:'move'});
 assert.equal(chosen,o.id);assert.equal(fake.selected,p.id);assert.deepEqual(fake.selectedOpenings,[o.id]);assert.equal(fake.openingDrag.original.id,o.id);assert.equal(fake.openingDrag.originals.length,1);assert.equal(fake.controls.enabled,false);assert.equal(captured,9);
});

test('Move keeps the selected opening group and always translates rather than resizing',()=>{
 const p=part(),o={id:'a',name:'Window',kind:'window' as const,face:1,x:1,y:1,width:.5,height:1},other={...o,id:'b',x:3};p.openings=[o,other];
 const fake:any={tool:'move',selected:p.id,selectedOpenings:['a','b'],openingPoint:()=>new T.Vector2(1,1),chooseOpening:()=>assert.fail('Existing multi-selection must be preserved'),controls:{enabled:true},renderer:{domElement:{setPointerCapture(){}}}};
 Stage.prototype.startOpeningDrag.call(fake,{pointerId:1,shiftKey:false} as PointerEvent,{p,o,handle:'e'});
 assert.equal(fake.openingDrag.handle,'move');assert.deepEqual(fake.openingDrag.originals.map((v:any)=>v.id),['a','b']);
});

test('live terrain preview applies its material while retaining top-down UVs',async()=>{
 const plan={...fresh(),materialAssignments:{'terrain:scene':'grass'}},mesh=new T.Mesh(new T.PlaneGeometry(2,2),new T.MeshStandardMaterial());
 mesh.userData={terrainPatch:true,surfaceKey:'terrain:scene'};mesh.name='Scene terrain';const terrain=new T.Group();terrain.add(mesh);
 const before=Array.from(mesh.geometry.getAttribute('uv').array);
 const fake:any={plan,solids:new T.Group(),terrain,materialRequest:0,materialRecords:Promise.resolve([{id:'grass',name:'Grass',tint:'#204020',roughness:1,scale:1,rotation:0}])};
 await (Stage.prototype as any).previewMaterials.call(fake);
 assert.equal(mesh.material.color.getHexString(),'204020');assert.deepEqual(Array.from(mesh.geometry.getAttribute('uv').array),before);
 mesh.geometry.dispose();mesh.material.dispose();
});
