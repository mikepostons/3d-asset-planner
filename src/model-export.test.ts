import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {prepareModelExport,encodeGLB,disposeExport} from './model-export';
import {fresh,part} from './model';
test('model export isolates meshes, preserves transforms and generates valid binary glTF',async()=>{
 const p=part();p.x=12;p.baseY=2;
 const plan={...fresh(),parts:[p]};const solids=new T.Group(),group=new T.Group();group.name=p.name;group.position.set(12,2,0);solids.add(group);
 const material=new T.MeshStandardMaterial({transparent:true,opacity:.22});
 const mesh=new T.Mesh(new T.BoxGeometry(2,2,2),material);mesh.position.y=1;mesh.name='Walls';mesh.userData.part=p.id;group.add(mesh);
 group.add(new T.LineSegments(new T.EdgesGeometry(mesh.geometry),new T.LineBasicMaterial()));
 const result=prepareModelExport(solids,undefined,plan,true);
 assert.equal(result.report.meshes,1);assert.equal(result.report.triangles,12);assert.deepEqual(result.report.origin,[12,2,0]);assert.equal(group.position.x,12);
 result.root.traverse(o=>{assert.ok(!(o instanceof T.Line));if(o instanceof T.Mesh){assert.equal(o.material.opacity,1);assert.notEqual(o.geometry,mesh.geometry);}});
 // GLTFExporter's browser FileReader API, provided here for its Node test.
 const previous=globalThis.FileReader;
 class Reader {result:unknown;onloadend?:()=>void;readAsArrayBuffer(blob:Blob){blob.arrayBuffer().then(v=>{this.result=v;this.onloadend?.();});}}
 globalThis.FileReader=Reader as unknown as typeof FileReader;
 try {const data=await encodeGLB(result.root);const view=new DataView(data);assert.equal(view.getUint32(0,true),0x46546c67);assert.equal(view.getUint32(4,true),2);assert.equal(view.getUint32(8,true),data.byteLength);
 const json=JSON.parse(new TextDecoder().decode(new Uint8Array(data,20,view.getUint32(12,true))));assert.equal(json.meshes.length,1);assert.ok(json.nodes.some((n:{name:string})=>n.name===p.name));
 }finally{globalThis.FileReader=previous;disposeExport(result.root);}
});
