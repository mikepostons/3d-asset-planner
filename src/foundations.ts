import * as T from 'three';
import {type Plan, type Part, type MaterialDescription, sceneStructures, footprint, baseY} from './model';
export type FoundationSettings={enabled:boolean;depth:number;margin:number;material?:MaterialDescription};
export const foundationDefaults:FoundationSettings={enabled:false,depth:1,margin:0};
export function foundationFor(plan:Plan,p:Part){
 const structure=sceneStructures(plan).find(s=>s.parts.some(q=>q.id===p.id));
 const settings=plan.structureFoundations?.[structure?.id??p.id]??plan.foundation??foundationDefaults;
 // Only components whose base actually reaches the scene ground support foundations.
 return settings.enabled && baseY(p)<=0.001 ? settings : null;
}
export function foundationGeometry(p:Part,s:FoundationSettings){
 const shape=new T.Shape();
 if(p.shape==='circle'){
  shape.absarc(0,0,p.width/2+s.margin,0,Math.PI*2,false);
  const inner=(p.innerDiameter??0)/2-s.margin;
  if(inner>0){const hole=new T.Path();hole.absarc(0,0,inner,0,Math.PI*2,true);shape.holes.push(hole);}
 }else{
  const points=footprint(p).map(([x,z])=>new T.Vector2(x*p.width,z*p.depth));
  // Offset each corner by intersecting its neighbouring outward-offset edges.
  const area=points.reduce((a,v,i)=>a+v.cross(points[(i+1)%points.length]),0);
  const shifted=points.map((v,i)=>{
   const a=v.clone().sub(points[(i+points.length-1)%points.length]).normalize(), b=points[(i+1)%points.length].clone().sub(v).normalize();
   const normal=(e:T.Vector2)=>new T.Vector2(e.y,-e.x).multiplyScalar(area>=0?1:-1);
   const n=normal(a),m=normal(b),sum=n.clone().add(m),den=sum.dot(n);
   return v.clone().addScaledVector(sum,Math.abs(den)>1e-6?s.margin/den:0);
  });
  shape.setFromPoints(shifted);
 }
 const g=new T.ExtrudeGeometry(shape,{depth:s.depth,bevelEnabled:false,curveSegments:24});
 g.rotateX(Math.PI/2);return g;
}
export function validateFoundation(s:FoundationSettings){
 if(!s || typeof s.enabled!=='boolean'||!Number.isFinite(s.depth)||s.depth<=0||s.depth>20||!Number.isFinite(s.margin)||s.margin<0||s.margin>5|| (s.material && (typeof s.material.name!=='string'||typeof s.material.description!=='string')))throw Error('Invalid foundation settings.');
}
