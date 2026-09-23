import * as T from 'three';
import type {Part} from './model';
import {height} from './model';
import {wallFrame,openingBodyGeometry} from './openings';
export type WallTops=Record<number,T.Vector2[]>;
export function endFaces(p:Part){
 const axis=p.ridge==='width'?'x':'z';
 return [0,1,2,3].sort((a,b)=>{const fa=wallFrame(p,a),fb=wallFrame(p,b);return fa.a[axis]+fa.b[axis]-fb.a[axis]-fb.b[axis];}).filter((_,i)=>i===0||i===3);
}
export function roofWallTops(p:Part,roof:T.BufferGeometry):WallTops {
 const tops:WallTops={};const mesh=new T.Mesh(roof,new T.MeshBasicMaterial({side:T.DoubleSide}));
 const pos=roof.getAttribute('position');const index=roof.index;
 for(const [end,face] of (p.roof==='lean-to'?[0,1,2,3]:endFaces(p)).entries()){
  const d=p.roofDetails!,mode=(end&&d.gableSeparate?d.gableEnd:d.gableStart)??'wall';if(p.roof==='gable'&&mode==='hidden')continue;
  const f=wallFrame(p,face),xs=[0,f.length];
  for(let i=0;i<(index?.count??pos.count);i+=3){
   const vs=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(pos,index?.getX(i+j)??i+j));
   for(let j=0;j<3;j++){const a=vs[j],b=vs[(j+1)%3],da=a.clone().sub(f.a).dot(f.inward),db=b.clone().sub(f.a).dot(f.inward);
    if(da*db>0||Math.abs(da-db)<1e-9)continue;
    const x=a.clone().lerp(b,da/(da-db)).sub(f.a).dot(f.u);if(x>1e-6&&x<f.length-1e-6)xs.push(x);
   }
  }
  const points=[...new Set(xs.map(x=>+x.toFixed(6)))].sort((a,b)=>a-b).map(x=>{
   const origin=f.point(x,10000);const hits=new T.Raycaster(origin,new T.Vector3(0,-1,0)).intersectObject(mesh);
   const baseline=T.MathUtils.lerp(f.topA,f.topB,x/f.length);
   return new T.Vector2(x,Math.max(baseline,hits.length?hits[0].point.y-d.thickness:baseline));
  });
  // Drop collinear sampling vertices: the exterior is a single contour through the ridge.
  const simple:T.Vector2[]=[];
  for(const q of points){while(simple.length>1){const a=simple[simple.length-2],b=simple[simple.length-1];if(Math.abs((b.x-a.x)*(q.y-b.y)-(b.y-a.y)*(q.x-b.x))>1e-5)break;simple.pop();}simple.push(q);}
  tops[face]=simple;
 }
 mesh.material.dispose();return tops;
}
function clip(poly:T.Vector3[],level:number,above:boolean){const out:T.Vector3[]=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=a.y-level,db=b.y-level;if(above?da>=0:da<=0)out.push(a);if(da*db<0)out.push(a.clone().lerp(b,da/(da-db)));}return out;}
export function profiledWallGeometry(p:Part,roof:T.BufferGeometry){
 const tops=roofWallTops(p,roof),source=openingBodyGeometry(p,tops);
 const buckets=new Map<string,number[]>([['Walls',[]]]),pos=source.getAttribute('position');
 const faces=p.roof==='gable'?endFaces(p):[],d=p.roofDetails!;
 for(let i=0;i<pos.count;i+=3){const vs=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(pos,i+j));let polygons=[{name:'Walls',points:vs}];
  for(const [end,face]of faces.entries()){
   const separate=end&&d.gableSeparate,mode=(separate?d.gableEnd:d.gableStart)??'wall';if(mode!=='material')continue;
   const f=wallFrame(p,face),normal=vs[1].clone().sub(vs[0]).cross(vs[2].clone().sub(vs[0])).normalize();
   // Split outer and inner end faces. The reveal geometry remains part of Walls.
   if(Math.abs(normal.dot(f.inward))<.99||!vs.every(v=>{const distance=v.clone().sub(f.a).dot(f.inward);return distance>-.001&&distance<=(p.wallThickness??.4)+.001;}))continue;
   const floor=separate?d.gableEndBaseFloor:d.gableStartBaseFloor;
   const level=floor===undefined?height(p):Math.min(height(p),Math.max(0,floor*p.floorHeight));
   polygons=[{name:'Walls',points:clip(vs,level,false)},{name:`End ${end+1} cladding`,points:clip(vs,level,true)}];break;
  }
  for(const poly of polygons){const values=buckets.get(poly.name)??[];for(let k=1;k<poly.points.length-1;k++){const [a,b,c]=[poly.points[0],poly.points[k],poly.points[k+1]];if(b.clone().sub(a).cross(c.clone().sub(a)).lengthSq()>1e-16)values.push(...a.toArray(),...b.toArray(),...c.toArray());}buckets.set(poly.name,values);}
 }
 const values:number[]=[],ranges:{name:string;start:number;count:number}[]=[];
 for(const [name,points]of buckets){if(!points.length)continue;ranges.push({name,start:values.length/3,count:points.length/3});values.push(...points);}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(values,3));geometry.computeVertexNormals();geometry.userData.roofSurfaces=ranges;source.dispose();return geometry;
}
