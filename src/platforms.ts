import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {Part} from './model';
import {endFaces} from './end-walls';
import {wallFrame} from './openings';
export type Platform={enabled:boolean;width?:number;floor:number;depth:number;thickness:number;railings:boolean;railHeight:number;supports:boolean;postSize:number};
export function platformDefaults(p:Part):Platform{return{enabled:true,floor:Math.max(1,p.floors-1),depth:1.5,thickness:.18,railings:true,railHeight:1,supports:false,postSize:.15};}
export function validatePlatform(value:Platform){
 if(!value||typeof value!=='object')throw Error('Invalid platform.');
 if(value.width!==undefined&&(!Number.isFinite(value.width)||value.width<.1||value.width>100))throw Error('Invalid platform width.');
 for(const k of ['enabled','railings','supports'] as const)if(typeof value[k]!=='boolean')throw Error('Invalid platform option.');
 for(const k of ['floor','depth','thickness','railHeight','postSize'] as const){const v=value[k];if(!Number.isFinite(v)||Math.abs(v)>100||v<(k==='floor'?0:.01))throw Error('Invalid platform dimension.');}
}
export function scalePlatform(value:Platform,factor:number){for(const k of ['depth','thickness','railHeight','postSize'] as const)value[k]*=factor;if(value.width!==undefined)value.width*=factor;}
export function platformGeometry(p:Part){
 const output:{name:string;geometry:T.BufferGeometry;end:number}[]=[];
 if(p.roof!=='gable'||p.shape==='circle'||p.roofEnabled===false||!p.roofDetails)return output;
 for(const [end,face]of endFaces(p).entries()){
  const config=end?p.roofDetails.platformEnd:p.roofDetails.platformStart;if(!config?.enabled)continue;
  const f=wallFrame(p,face),y=config.floor*p.floorHeight,width=Math.min(config.width??f.length,f.length),start=(f.length-width)/2,depth=config.depth;
  const buckets=new Map<string,T.BufferGeometry[]>();
  const point=(u:number,v:number,h:number)=>f.point(start+u,h,-v);
  const add=(role:string,g:T.BufferGeometry)=>{g.deleteAttribute('uv');const list=buckets.get(role)??[];list.push(g);buckets.set(role,list);};
  const beam=(role:string,a:T.Vector3,b:T.Vector3,w:number,h=w)=>{const direction=b.clone().sub(a);if(direction.length()<1e-6)return;const g=new T.BoxGeometry(w,direction.length(),h).toNonIndexed();g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize()));g.translate(...a.clone().add(b).multiplyScalar(.5).toArray());add(role,g);};
  const deck=new T.BoxGeometry(width,config.thickness,depth).toNonIndexed();deck.rotateY(-Math.atan2(f.u.z,f.u.x));deck.translate(...point(width/2,depth/2,y-config.thickness/2).toArray());add('deck',deck);
  const edges=[[0,0,0,depth],[0,depth,width,depth],[width,depth,width,0]];
  const posts=new Set<string>();
  if(config.railings)for(const [ax,az,bx,bz]of edges){
   const n=Math.max(1,Math.ceil(Math.hypot(bx-ax,bz-az)/1.2));
   beam('railings',point(ax,az,y+config.railHeight),point(bx,bz,y+config.railHeight),.08);
   beam('railings',point(ax,az,y+.15),point(bx,bz,y+.15),.07);
   for(let i=0;i<=n;i++){const t=i/n,key=`${T.MathUtils.lerp(ax,bx,t)},${T.MathUtils.lerp(az,bz,t)}`;if(posts.has(key))continue;posts.add(key);beam('railings',point(T.MathUtils.lerp(ax,bx,t),T.MathUtils.lerp(az,bz,t),y),point(T.MathUtils.lerp(ax,bx,t),T.MathUtils.lerp(az,bz,t),y+config.railHeight),.08);}
   for(let i=0;i<n;i++){const a=i/n,b=(i+1)/n;for(const reverse of [false,true])beam('railings',point(T.MathUtils.lerp(ax,bx,a),T.MathUtils.lerp(az,bz,a),y+(reverse?config.railHeight:.15)),point(T.MathUtils.lerp(ax,bx,b),T.MathUtils.lerp(az,bz,b),y+(reverse?.15:config.railHeight)),.045);}
  }
  beam('beams',point(0,depth-.1,y-config.thickness-.1),point(width,depth-.1,y-config.thickness-.1),.18,.22);
  for(const u of [config.postSize/2,width-config.postSize/2]){
   beam('beams',point(u,0,y-config.thickness-.1),point(u,depth,y-config.thickness-.1),.15,.2);
   if(config.supports&&y>config.thickness)beam('supports',point(u,depth-config.postSize/2,0),point(u,depth-config.postSize/2,y-config.thickness),config.postSize);
  }
  for(const [role,geometries]of buckets){output.push({name:`End ${end+1} platform ${role}`,geometry:mergeGeometries(geometries),end});geometries.forEach(g=>g.dispose());}
 }
 return output;
}
