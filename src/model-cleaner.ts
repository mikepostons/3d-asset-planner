import {geometryKey} from "./geometry-key";
import type {Plan} from "./model";
import * as T from 'three';
/** Metre-scaled projection UVs for tiling materials; deliberately not a packed bake atlas. */
export function generateUVs(root:T.Object3D,metresPerTile=1){
 if(!Number.isFinite(metresPerTile)||metresPerTile<=0)throw Error('Texture scale must be positive.');
 let meshes=0;
 root.traverse(o=>{if(!(o instanceof T.Mesh))return;
 const old=o.geometry;const g=old.index?old.toNonIndexed():old.clone();const p=g.getAttribute('position');const uv:number[]=[];
 const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
 for(let i=0;i<p.count;i+=3){a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);c.fromBufferAttribute(p,i+2);const n=b.clone().sub(a).cross(c.clone().sub(a));const ax=Math.abs(n.x),ay=Math.abs(n.y),az=Math.abs(n.z);
 for(const v of [a,b,c]) {const pair=ay>=ax&&ay>=az?[v.x,v.z]:ax>=az?[v.z,v.y]:[v.x,v.y];uv.push(pair[0]/metresPerTile,pair[1]/metresPerTile);}}
 g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));o.geometry=g;old.dispose();meshes++;
 });return meshes;
}
export function cleanerDiagnostics(root:T.Object3D){let meshes=0,triangles=0,missingUVs=0,degenerate=0;root.traverse(o=>{if(!(o instanceof T.Mesh))return;meshes++;const g=o.geometry,p=g.getAttribute('position');triangles+=(g.index?.count??p.count)/3;if(!g.getAttribute('uv'))missingUVs++;for(let i=0;i<(g.index?.count??p.count);i+=3){const v=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,g.index?.getX(i+j)??i+j));if(v[1].sub(v[0]).cross(v[2].sub(v[0])).lengthSq()<1e-16)degenerate++;}});return{meshes,triangles,missingUVs,degenerate};}

export function preparationKey(plan:Plan){return geometryKey({parts:plan.parts,foundation:plan.foundation,structureFoundations:plan.structureFoundations});}
export function preparationStatus(plan:Plan,ids:string[]){const key=preparationKey(plan);return ids.every(id=>plan.preparedUVs?.[id]?.sourceKey===key);}
export function applyPreparedUVs(root:T.Object3D,plan:Plan){const key=preparationKey(plan);let count=0;root.traverse(node=>{const id=node.userData.partId;const saved=plan.preparedUVs?.[id];if(saved?.sourceKey===key)count+=generateUVs(node,saved.metresPerTile);});return count;}
