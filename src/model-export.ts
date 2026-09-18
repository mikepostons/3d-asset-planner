import * as T from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import type {Plan} from './model';
export function prepareModelExport(solids:T.Group, terrain:T.Group|undefined, plan:Plan, centre:boolean) {
  const root=new T.Group();root.name=plan.name || 'Asset';
  const materials=new Map<string,T.MeshStandardMaterial>();
  const report={units:'metres',meshes:0,triangles:0,materials:0,missingUVs:0,degenerateTriangles:0,origin:[0,0,0],warnings:[] as string[]};
  const copy=(source:T.Object3D,parent:T.Object3D)=>{
    if(source instanceof T.Line || source instanceof T.Sprite) return;
    let target:T.Object3D;
    if(source instanceof T.Mesh){
      const geometry=source.geometry.clone();
      const pos=geometry.getAttribute('position');
      if(!pos || !pos.count){geometry.dispose();return;}
      if(!Array.from(pos.array).every(Number.isFinite)){geometry.dispose();throw Error('Export stopped: non-finite mesh coordinates.');}
      if(!geometry.getAttribute('normal'))geometry.computeVertexNormals();
      const part=plan.parts.find(p=>p.id===source.userData.part);
      const description=source.userData.materialDescription || (source.name==='Roof'?part?.roofMaterial?.description:part?.bodyMaterial?.description ?? part?.materials) || '';
      const original=Array.isArray(source.material)?source.material[0]:source.material;
      const colour=original.color?.getHex()??0xaaaaaa;
      const name=source.name || 'Surface';
      const key=JSON.stringify([name,description,colour]);
      let material=materials.get(key);
      if(!material){material=new T.MeshStandardMaterial({color:colour,roughness:original.roughness??1,side:T.DoubleSide});material.name=description || name;materials.set(key,material);}
      target=new T.Mesh(geometry,material);report.meshes++;
      const count=geometry.index?.count??pos.count;report.triangles+=count/3;
      if(!geometry.getAttribute('uv'))report.missingUVs++;
      const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
      for(let i=0;i<count;i+=3){a.fromBufferAttribute(pos,geometry.index?.getX(i)??i);b.fromBufferAttribute(pos,geometry.index?.getX(i+1)??i+1);c.fromBufferAttribute(pos,geometry.index?.getX(i+2)??i+2);if(b.sub(a).cross(c.sub(a)).lengthSq()<1e-16)report.degenerateTriangles++;}
    }else target=new T.Group();
    target.name=source.name;target.position.copy(source.position);target.quaternion.copy(source.quaternion);target.scale.copy(source.scale);
    target.userData=JSON.parse(JSON.stringify(source.userData));parent.add(target);
    for(const child of source.children)copy(child,target);
  };
  for(const group of solids.children)copy(group,root);
  if(terrain){const group=new T.Group();group.name='Terrain';root.add(group);for(const mesh of terrain.children)copy(mesh,group);}
  // Identity parent nodes keep every mesh independently editable in Blender.
  const folder=(parent:T.Object3D,name:string)=>{let g=parent.children.find(c=>c instanceof T.Group && c.name===name);if(!g){g=new T.Group();g.name=name;parent.add(g);}return g;};
  for(const node of [...root.children]) {
    const part=plan.parts.find(p=>p.id===node.userData.partId);
    if(!part)continue;
    for(const child of [...node.children]){
      const data=child.userData;let parent:T.Object3D=node;
      if(data.clusterId){const index=part.stoneClusters?.clusters.findIndex(c=>c.id===data.clusterId)??-1;parent=folder(folder(node,"Stone clusters"),`Cluster ${index+1}`);}
      else if(data.openingId){const o=part.openings?.find(o=>o.id===data.openingId);parent=folder(folder(node,"Openings"),`${o?.name || "Opening"} ${(part.openings?.findIndex(o=>o.id===data.openingId)??0)+1}`);if(data.architecturalDetail)parent=folder(parent,"Surrounds");}
      else if(child.name==="Quoin")parent=folder(node,"Quoins");
      else if(data.stoneDressing)parent=folder(node,"Stone end bands");
      else if(data.gableEnd!==undefined)parent=folder(node,"Gable ends");
      else if(child.name==="Roof")parent=folder(node,"Roof assembly");
      if(parent!==node)parent.add(child);
    }
    if(part.groupId){const group=plan.groups?.find(g=>g.id===part.groupId);folder(root,group?.name || "Group").add(node);}
  }
  if(!report.meshes)throw Error('There is no mesh geometry to export.');
  root.updateMatrixWorld(true);
  if(centre){const box=new T.Box3().setFromObject(root),origin=box.getCenter(new T.Vector3());origin.y=Math.min(...plan.parts.map(p=>p.baseY??0));report.origin=origin.toArray();for(const child of root.children)child.position.sub(origin);root.updateMatrixWorld(true);}
  report.materials=materials.size;
  if(report.missingUVs)report.warnings.push(`${report.missingUVs} meshes have no UV mapping. This is an untextured structural export.`);
  if(report.degenerateTriangles)report.warnings.push(`${report.degenerateTriangles} degenerate triangles require review.`);
  report.warnings.push('Overlapping components are preserved; no Boolean cleanup, LODs or colliders have been generated.');
  return {root,report};
}
export async function encodeGLB(root:T.Object3D){return await new GLTFExporter().parseAsync(root,{binary:true,onlyVisible:true}) as ArrayBuffer;}
export function disposeExport(root:T.Object3D){const materials=new Set<T.Material>();root.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});materials.forEach(m=>m.dispose());}
