import {foundationFor} from "./foundations";
import {repairMeshes} from "./mesh-repair";
import {geometryKey} from "./geometry-key";
import type {Plan} from "./model";
import * as T from 'three';
/** Metre-scaled projection UVs for tiling materials; deliberately not a packed bake atlas. */
export function generateUVs(root:T.Object3D,metresPerTile=1){
 if(!Number.isFinite(metresPerTile)||metresPerTile<=0)throw Error('Texture scale must be positive.');
 let meshes=0;
 root.traverse(o=>{if(!(o instanceof T.Mesh))return;
 const old=o.geometry;const g=old.index?old.toNonIndexed():old.clone();const p=g.getAttribute('position');const uv:number[]=[];
 const triangles:Array<{v:T.Vector3[];n:T.Vector3;side:number}>=[];
 for(let i=0;i<p.count;i+=3){
  const v=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,i+j));
  const n=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).normalize();
  if(n.lengthSq()<1e-12)n.set(0,1,0);
  const centre=v[0].clone().add(v[1]).add(v[2]).multiplyScalar(1/3);
  const radial=n.x*centre.x+n.z*centre.z;
  const curved=o.userData.uvSurface==='cylinder' || (o.userData.uvSurface==='cylinder-band' && Math.abs(radial)>Math.hypot(centre.x,centre.z)*.5);
  const side=curved && Math.hypot(n.x,n.z)>1e-5 ? (radial>=0?1:-1):0;
  triangles.push({v,n,side});
 }
 const profiles=new Map<number,{radius:number;slope:number;minY:number}>();
 for(const side of [-1,1]){
  const vs=triangles.filter(t=>t.side===side).flatMap(t=>t.v);
  if(!vs.length)continue;
  const minY=Math.min(...vs.map(v=>v.y)),maxY=Math.max(...vs.map(v=>v.y));
  const radiusAt=(y:number)=>{const row=vs.filter(v=>Math.abs(v.y-y)<1e-5);return row.reduce((a,v)=>a+Math.hypot(v.x,v.z),0)/row.length;};
  const radius=radiusAt(minY),slope=maxY-minY>1e-6?(radiusAt(maxY)-radius)/(maxY-minY):0;
  profiles.set(side,{radius,slope,minY});
 }
 for(const {v,n,side} of triangles){
  if(side){
   const profile=profiles.get(side)!;
   const angles=v.map(p=>Math.atan2(p.z,p.x));
   if(Math.max(...angles)-Math.min(...angles)>Math.PI)for(let i=0;i<3;i++)if(angles[i]<0)angles[i]+=Math.PI*2;
   const k=Math.abs(profile.slope)/Math.sqrt(1+profile.slope*profile.slope);
   v.forEach((p,i)=>{
    if(k<1e-6)uv.push(side*angles[i]*profile.radius/metresPerTile,(p.y-profile.minY)/metresPerTile);
    else {const length=Math.hypot(p.x,p.z)/k,angle=angles[i]*k;uv.push(side*length*Math.sin(angle)/metresPerTile,Math.sign(profile.slope)*(length*Math.cos(angle)-profile.radius/k)/metresPerTile);}
   });
  }else{
   // Orthonormal face projection preserves metre scale on sloping roofs too.
   const reference=Math.abs(n.y)>.999?new T.Vector3(1,0,0):new T.Vector3(0,1,0).cross(n).normalize();
   const vertical=n.clone().cross(reference).normalize();
   for(const p of v)uv.push(p.dot(reference)/metresPerTile,p.dot(vertical)/metresPerTile);
  }
 }
 g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));o.geometry=g;old.dispose();meshes++;
 });return meshes;
}
export function cleanerDiagnostics(root:T.Object3D){let meshes=0,triangles=0,missingUVs=0,degenerate=0;root.traverse(o=>{if(!(o instanceof T.Mesh))return;meshes++;const g=o.geometry,p=g.getAttribute('position');triangles+=(g.index?.count??p.count)/3;if(!g.getAttribute('uv'))missingUVs++;for(let i=0;i<(g.index?.count??p.count);i+=3){const v=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,g.index?.getX(i+j)??i+j));if(v[1].sub(v[0]).cross(v[2].sub(v[0])).lengthSq()<1e-16)degenerate++;}});return{meshes,triangles,missingUVs,degenerate};}

export function preparationKey(plan:Plan){
 return geometryKey({mappingVersion:6,parts:plan.parts,foundations:plan.parts.map(p=>({id:p.id,settings:foundationFor(plan,p)}))});
}
function preparationMatches(plan:Plan,sourceKey:string|undefined,current=preparationKey(plan)){
 if(!sourceKey)return false;
 if(sourceKey===current)return true;
 // Older preparations stored raw foundation switches, including inactive settings.
 try {
  const old=JSON.parse(sourceKey);
  if(old.mappingVersion!==6 || !Array.isArray(old.parts) || old.foundations!==undefined)return false;
  return preparationKey({...plan,parts:old.parts,foundation:old.foundation,structureFoundations:old.structureFoundations})===current;
 }catch{return false;}
}
export function preparationStatus(plan:Plan,ids:string[]){const current=preparationKey(plan);return ids.every(id=>preparationMatches(plan,plan.preparedUVs?.[id]?.sourceKey,current));}
export function applyPreparedUVs(root:T.Object3D,plan:Plan){const current=preparationKey(plan);let count=0;root.traverse(node=>{const id=node.userData.partId;const saved=plan.preparedUVs?.[id];if(saved&&preparationMatches(plan,saved.sourceKey,current)){if(saved.repair)repairMeshes(node);count+=generateUVs(node,saved.metresPerTile);if(saved.repair)repairMeshes(node);}});return count;}
