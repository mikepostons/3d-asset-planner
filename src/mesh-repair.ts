import * as T from 'three';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
/** Conservative per-mesh repair. Never crosses material, normal or UV boundaries. */
export function repairMeshes(root:T.Object3D){
 let removed=0;
 root.traverse(o=>{if(!(o instanceof T.Mesh))return;
 const old:T.BufferGeometry=o.geometry, source=old.index?old.toNonIndexed():old.clone(),p=source.getAttribute('position');
 const kept:number[]=[],materials:number[]=[],seen=new Set<string>();
 const names=Object.keys(source.attributes);
 for(let i=0;i<p.count;i+=3){
  const v=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,i+j));
  if(v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).lengthSq()<1e-16){removed++;continue;}
  const mat=source.groups.find(g=>i>=g.start&&i<g.start+g.count)?.materialIndex??0;
  const keys=[0,1,2].map(j=>names.map(name=>{const a=source.getAttribute(name);return Array.from({length:a.itemSize},(_,k)=>a.array[(i+j)*a.itemSize+k]).join(',');}).join('|'));
  // Cyclic order detects same-facing duplicates, preserving intentional backfaces.
  const key=mat+':'+[keys.join('/'),[keys[1],keys[2],keys[0]].join('/'),[keys[2],keys[0],keys[1]].join('/')].sort()[0];
  if(seen.has(key)){removed++;continue;}seen.add(key);kept.push(i,i+1,i+2);materials.push(mat);
 }
 const g=new T.BufferGeometry();
 for(const name of names){const a=source.getAttribute(name);const values=kept.flatMap(i=>Array.from({length:a.itemSize},(_,k)=>a.array[i*a.itemSize+k]));const ArrayType=a.array.constructor as typeof Float32Array;g.setAttribute(name,new T.BufferAttribute(new ArrayType(values),a.itemSize,a.normalized));}
 materials.forEach((mat,i)=>{const last=g.groups[g.groups.length-1];if(last&&last.materialIndex===mat)last.count+=3;else g.addGroup(i*3,3,mat);});
 // Attribute-aware welding preserves UV seams and sharp normal splits.
 o.geometry=mergeVertices(g,1e-7);g.dispose();source.dispose();old.dispose();
 });return removed;
}
export function inspectionLines(geometry:T.BufferGeometry,problems=false){
 if(!problems)return new T.WireframeGeometry(geometry);
 const p=geometry.getAttribute('position'),index=geometry.index,count=index?.count??p.count,edges=new Map<string,{a:T.Vector3;b:T.Vector3;count:number}>(),lines:number[]=[];
 const key=(v:T.Vector3)=>v.toArray().map(n=>Math.round(n*1e6)).join(',');
 for(let i=0;i<count;i+=3){const vs=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,index?.getX(i+j)??i+j));
 const bad=vs[1].clone().sub(vs[0]).cross(vs[2].clone().sub(vs[0])).lengthSq()<1e-16;
 for(let j=0;j<3;j++){const a=vs[j],b=vs[(j+1)%3],k=[key(a),key(b)].sort().join('/');const e=edges.get(k);if(e)e.count++;else edges.set(k,{a,b,count:1});if(bad)lines.push(...a.toArray(),...b.toArray());}
 }
 for(const e of edges.values())if(e.count!==2)lines.push(...e.a.toArray(),...e.b.toArray());
 return new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(lines,3));
}
