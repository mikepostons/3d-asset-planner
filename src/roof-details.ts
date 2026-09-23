import {type Platform,validatePlatform,scalePlatform} from "./platforms";
import { ConvexGeometry } from "three/addons/geometries/ConvexGeometry.js";
import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { height, footprint, ridgeEnds, type Part } from "./model";
export type FasciaSettings = {lengthOffset?:number; height:number; depth:number; inset:number; drop:number};
export type RoofDetails = {
  platformStart?:Platform; platformEnd?:Platform;
  gableStartBaseFloor?:number; gableEndBaseFloor?:number;
  sideFascia?: FasciaSettings; endFascia?: FasciaSettings;
  ridgeBeam?: boolean; beamWidth?: number; beamHeight?: number; beamStart?: number; beamEnd?: number; beamDrop?: number;
  fasciaInset?: number;
  gableStart?: "hidden" | "wall" | "material"; gableEnd?: "hidden" | "wall" | "material";
  gableSeparate?: boolean; gableStartMaterial?: string; gableEndMaterial?: string;
  thickness: number; sides: number; start: number; end: number;
  fascia: boolean; fasciaHeight: number; fasciaDepth: number;
  ridgeCap: boolean; capWidth: number; capHeight: number;
};
export const defaultRoofDetails = (): RoofDetails => ({thickness:.15,sides:.2,start:.2,end:.2,fascia:false,fasciaHeight:.2,fasciaDepth:.04,ridgeCap:false,capWidth:.2,capHeight:.1});
export function validateRoofDetails(p: Part) {
  const d = p.roofDetails;
  if (!d) return;
  for (const [key,value] of Object.entries(d)) {
    if (value === undefined && !(key in defaultRoofDetails())) continue;
    if(key === "platformStart" || key === "platformEnd"){validatePlatform(value as Platform);continue;}
    if (key === "sideFascia" || key === "endFascia") {
      if (value && typeof value === "object" && "lengthOffset" in value && value.lengthOffset !== undefined && (typeof value.lengthOffset !== "number" || !Number.isFinite(value.lengthOffset) || Math.abs(value.lengthOffset)>10)) throw Error("Invalid fascia length offset.");
      if (!value || typeof value !== "object" || ["height","depth","inset","drop"].some(k=>typeof (value as any)[k]!=="number" || !Number.isFinite((value as any)[k]) || (value as any)[k]<(k==="height"||k==="depth"?.01:0) || (value as any)[k]>10)) throw Error("Invalid fascia settings."); continue;
    }
    if (key === "gableStart" || key === "gableEnd") { if (!["hidden","wall","material"].includes(value as string)) throw Error("Invalid gable mode."); continue; }
    if (key === "gableStartMaterial" || key === "gableEndMaterial") { if (typeof value !== "string") throw Error("Invalid gable material."); continue; }
    if (key === "gableSeparate") { if (typeof value !== "boolean") throw Error("Invalid gable settings."); continue; }
    if (key === "fascia" || key === "ridgeCap" || key === "ridgeBeam") {
      if (typeof value !== "boolean") throw Error("Invalid roof details.");
    } else if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 10) throw Error("Invalid roof dimensions.");
  }
  for (const key of Object.keys(defaultRoofDetails())) if (!(key in d)) throw Error("Incomplete roof details.");
  if ((d.beamWidth !== undefined && d.beamWidth < .01) || (d.beamHeight !== undefined && d.beamHeight < .01)) throw Error("Beam dimensions must be positive.");
  if (d.thickness < .01 || d.fasciaHeight < .01 || d.fasciaDepth < .01 || d.capWidth < .01 || d.capHeight < .01) throw Error("Roof detail dimensions must be positive.");
}
export function scaleRoofDetails(p: Part, factor: number) {
  if (p.roofDetails) for (const key of Object.keys(p.roofDetails) as (keyof RoofDetails)[]) {
    if(key === "platformStart" || key === "platformEnd"){const platform=p.roofDetails[key];if(platform)scalePlatform(platform,factor);}
    if (["thickness","sides","start","end","fasciaHeight","fasciaDepth","capWidth","capHeight","fasciaInset","beamWidth","beamHeight","beamStart","beamEnd","beamDrop"].includes(key)) (p.roofDetails as unknown as Record<string,number>)[key] *= factor;
    if (key === "sideFascia" || key === "endFascia") { const v=p.roofDetails[key]; if(v) { for(const k of ["height","depth","inset","drop"] as const) v[k]*=factor; if(v.lengthOffset!==undefined) v.lengthOffset*=factor; } }
  }
}
/** Build a closed roof skin from the upper surfaces of the existing roof shape. */
export function detailedRoof(p: Part, base: (p:Part, roof:boolean)=>T.BufferGeometry) {
  const d = p.roofDetails!;
  const alongX = p.roof === "lean-to" ? ["left","right"].includes(p.highEdge) : p.ridge === "width";
  const dx = alongX ? d.start+d.end : 2*d.sides;
  const dz = alongX ? 2*d.sides : d.start+d.end;
  const shift = (d.end-d.start)/2;
  const q = {...p, width:p.width+dx, depth:p.depth+dz};
  const source = base(q,true);
  const mesh = new T.Mesh(source,new T.MeshBasicMaterial({side:T.DoubleSide}));
  const a = source.getAttribute("position");
  const indices = source.index;
  const vertices:number[]=[];
  const topFaces: T.Vector3[][] = [];
  const edgeMap = new Map<string,{a:T.Vector3;b:T.Vector3;count:number}>();
  const point = (i:number) => new T.Vector3().fromBufferAttribute(a,indices ? indices.getX(i):i);
  const tri = (a:T.Vector3,b:T.Vector3,c:T.Vector3) => vertices.push(...a.toArray(),...b.toArray(),...c.toArray());
  const key = (v:T.Vector3) => v.toArray().map(n=>n.toFixed(5)).join(",");
  for(let i=0;i<(indices?.count ?? a.count);i+=3) {
    let v = [point(i),point(i+1),point(i+2)];
    const normal = v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0]));
    if(Math.abs(normal.y)<1e-8) continue;
    const centre=v[0].clone().add(v[1]).add(v[2]).multiplyScalar(1/3);
    const hits = new T.Raycaster(new T.Vector3(centre.x,centre.y+1000,centre.z),new T.Vector3(0,-1,0)).intersectObject(mesh);
    if(!hits.length || Math.abs(hits[0].point.y-centre.y)>1e-4) continue;
    if(normal.y<0) v=[v[0],v[2],v[1]];
    v.forEach(t=>{ t[alongX ? "x":"z"]+=shift; });
    const top=v.map(t=>t.clone().add(new T.Vector3(0,d.thickness,0)));
    topFaces.push(top);
    tri(...top as [T.Vector3,T.Vector3,T.Vector3]);tri(v[2],v[1],v[0]);
    for(let j=0;j<3;j++) {
      const a=v[j],b=v[(j+1)%3],k=[key(a),key(b)].sort().join("|");
      const edge=edgeMap.get(k); if(edge) edge.count++; else edgeMap.set(k,{a,b,count:1});
    }
  }
  const edgeStart=vertices.length/3;
  const extras:T.BufferGeometry[]=[];
  const extraNames:string[]=[];
  for(const edge of edgeMap.values()) if(edge.count===1) {
    const {a,b}=edge,up=new T.Vector3(0,d.thickness,0),at=a.clone().add(up),bt=b.clone().add(up);
    tri(a,b,bt);tri(a,bt,at);
    const isSide = alongX ? Math.abs(b.x-a.x)>Math.abs(b.z-a.z) : Math.abs(b.z-a.z)>Math.abs(b.x-a.x);
    const f=(isSide?d.sideFascia:d.endFascia) ?? {height:d.fasciaHeight,depth:d.fasciaDepth,inset:d.fasciaInset??0,drop:0};
    const inward = new T.Vector3(b.z-a.z,0,-(b.x-a.x)).normalize();
    if(d.fascia) {
      // Vertical boards: their top edge is on/below the roof underside, even on rakes.
      const points:T.Vector3[]=[];
      const direction=b.clone().sub(a).normalize();
      const lengthOffset=isSide?(f.lengthOffset??0):0;
      // A shortening that consumes the entire board removes it rather than inverting it.
      if(a.distanceTo(b)+2*lengthOffset<=.001) continue;
      const ends=[a.clone().addScaledVector(direction,-lengthOffset),b.clone().addScaledVector(direction,lengthOffset)];
      for(const v of ends) for(const offset of [f.inset,f.inset+f.depth]) for(const drop of [f.drop,f.drop+f.height]) points.push(v.clone().addScaledVector(inward,offset).add(new T.Vector3(0,-drop,0)));
      const board=new ConvexGeometry(points);board.deleteAttribute("uv");extras.push(board);extraNames.push(isSide ? "Side fascia" : "End fascia");
    }
  }
  const capStart=vertices.length/3;
  if(d.ridgeCap && p.roof==="gable") {
    const ends=ridgeEnds(q).map(([x,y,z])=>new T.Vector3(x*q.width,height(q)+y,z*q.depth));
    ends.forEach(v=>v[alongX?"x":"z"]+=shift);
    const axis=ends[1].clone().sub(ends[0]);axis.y=0;axis.normalize();
    const across=new T.Vector3(-axis.z,0,axis.x);
    const clip=(poly:T.Vector3[], normal:T.Vector3, limit:number)=>{
      const out:T.Vector3[]=[];
      for(let i=0;i<poly.length;i++){
        const a=poly[i],b=poly[(i+1)%poly.length],da=a.clone().sub(ends[0]).dot(normal)-limit,db=b.clone().sub(ends[0]).dot(normal)-limit;
        if(da<=1e-8)out.push(a);
        if((da<0)!==(db<0))out.push(a.clone().lerp(b,da/(da-db)));
      } return out;
    };
    // Two roof-aligned wings form a folded cap, with no floating rectangular beam.
    for(const face of topFaces){
      let poly=clip(face,across,d.capWidth/2);
      poly=clip(poly,across.clone().negate(),d.capWidth/2);
      poly=clip(poly,axis,ends[1].clone().sub(ends[0]).dot(axis));
      poly=clip(poly,axis.clone().negate(),0);
      if(poly.length<3)continue;
      const top=poly.map(v=>v.clone().add(new T.Vector3(0,d.capHeight,0)));
      for(let i=1;i<poly.length-1;i++){tri(top[0],top[i],top[i+1]);tri(poly[0],poly[i+1],poly[i]);}
      for(let i=0;i<poly.length;i++){const j=(i+1)%poly.length;tri(poly[i],poly[j],top[j]);tri(poly[i],top[j],top[i]);}
    }
  }

  const capEnd=vertices.length/3;
  if(d.ridgeBeam && p.roof==="gable") {
    const ends=ridgeEnds(q).map(([x,y,z])=>new T.Vector3(x*q.width,height(q)+y,z*q.depth));
    ends.forEach(v=>v[alongX?"x":"z"]+=shift);
    const direction=ends[1].clone().sub(ends[0]).normalize();
    ends[0].addScaledVector(direction,-(d.beamStart??0));ends[1].addScaledVector(direction,d.beamEnd??0);
    const across=new T.Vector3(-direction.z,0,direction.x).normalize();
    const width=d.beamWidth??.2, bh=d.beamHeight??.25;
    const points:T.Vector3[]=[];
    for(const v of ends) for(const side of [-.5,.5]) for(const down of [0,bh]) points.push(v.clone().addScaledVector(across,width*side).add(new T.Vector3(0,-(d.beamDrop??.15)-down,0)));
    const g=new ConvexGeometry(points);g.deleteAttribute("uv");extras.push(g);extraNames.push("Ridge beam");
  }
  const skin=new T.BufferGeometry();skin.setAttribute("position",new T.Float32BufferAttribute(vertices,3));skin.computeVertexNormals();
  const result=mergeGeometries([skin,...extras]);
  const ranges=[{name:"Roof",start:0,count:edgeStart},{name:"Roof edges",start:edgeStart,count:capStart-edgeStart}];
  if(capEnd>capStart)ranges.push({name:"Ridge cap",start:capStart,count:capEnd-capStart});
  let cursor=capEnd;extras.forEach((g,i)=>{const count=g.getAttribute("position").count;ranges.push({name:extraNames[i],start:cursor,count});cursor+=count;});
  result.userData.roofSurfaces=ranges;
  source.dispose();mesh.material.dispose();skin.dispose();extras.forEach(g=>g.dispose());
  return result;
}

export function gableInfill(p: Part, roof: T.BufferGeometry) {
  const d=p.roofDetails;
  if(!d || p.roofEnabled===false || p.roof!=="gable" || p.shape==="circle") return [];
  const mesh=new T.Mesh(roof,new T.MeshBasicMaterial({side:T.DoubleSide}));
  const fp=footprint(p).map(([x,z])=>new T.Vector3(x*p.width,0,z*p.depth));
  const alongX=p.ridge==="width";
  const edges=fp.map((a,i)=>({a,b:fp[(i+1)%fp.length],i,j:(i+1)%fp.length})).sort((a,b)=>(a.a[alongX?"x":"z"]+a.b[alongX?"x":"z"])-(b.a[alongX?"x":"z"]+b.b[alongX?"x":"z"]));
  const result:{geometry:T.BufferGeometry;mode:string;material:string;end:number}[]=[];
  for(const end of [0,1]){
    const mode=(end && d.gableSeparate ? d.gableEnd : d.gableStart) ?? "wall";
    if(mode==="hidden")continue;
    const e=end?edges[edges.length-1]:edges[0];
    const inward=new T.Vector3(e.b.z-e.a.z,0,-(e.b.x-e.a.x));
    if(inward.dot(e.a.clone().add(e.b))>0)inward.negate();
    inward.normalize().multiplyScalar(p.wallThickness ?? .3);
    const points:T.Vector3[]=[];
    for(let i=0;i<=32;i++){
      const t=i/32,v=e.a.clone().lerp(e.b,t),base=T.MathUtils.lerp(p.cornerHeights?.[e.i]??height(p),p.cornerHeights?.[e.j]??height(p),t);
      const hits=new T.Raycaster(new T.Vector3(v.x,base+1000,v.z),new T.Vector3(0,-1,0)).intersectObject(mesh);
      if(!hits.length)continue;
      const top=hits[0].point.y-d.thickness;
      if(top<=base+1e-5)continue;
      for(const y of [base,top]) {const q=new T.Vector3(v.x,y,v.z);points.push(q,q.clone().add(inward));}
    }
    if(points.length>=6)result.push({geometry:new ConvexGeometry(points),mode,material:(end&&d.gableSeparate?d.gableEndMaterial:d.gableStartMaterial)??"Gable cladding",end});
  }
  mesh.material.dispose();return result;
}

/** Separate material surfaces without altering roof geometry or its editing controls. */
export function splitRoofSurfaces(source:T.BufferGeometry) {
 const ranges=source.userData.roofSurfaces as {name:string;start:number;count:number}[]|undefined;
 if(!ranges)return [{name:"Roof",geometry:source}];
 const grouped=new Map<string,number[]>();
 for(const range of ranges){const values=grouped.get(range.name)??[];for(let i=range.start;i<range.start+range.count;i++)values.push(i);grouped.set(range.name,values);}
 const result=[...grouped].map(([name,indices])=>{
  const geometry=new T.BufferGeometry();
  for(const [key,attribute] of Object.entries(source.attributes)) {
   const values=indices.flatMap(i=>Array.from({length:attribute.itemSize},(_,j)=>attribute.array[i*attribute.itemSize+j]));
   geometry.setAttribute(key,new T.Float32BufferAttribute(values,attribute.itemSize));
  }
  return {name,geometry};
 });
 source.dispose();return result;
}
