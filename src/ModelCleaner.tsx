import React,{useEffect,useRef,useState} from 'react';
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {generateUVs,cleanerDiagnostics} from './model-cleaner';
import {ToolIcon} from "./ToolIcon";
import {disposeExport} from './model-export';
export function ModelCleaner({root,onClose,onSave,initialScale=1,prepared=false}:{root:T.Group;onClose:()=>void;onSave:(scale:number)=>Promise<boolean>;initialScale?:number;prepared?:boolean}){
 const host=useRef<HTMLDivElement>(null),[stats,setStats]=useState(()=>cleanerDiagnostics(root)),[scale,setScale]=useState(initialScale),[generated,setGenerated]=useState<number|null>(prepared?initialScale:null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const checker=useRef<T.MeshStandardMaterial | undefined>(undefined);const originals=useRef(new Map<T.Mesh,T.Material|T.Material[]>());
 useEffect(()=>{
 const el=host.current!,scene=new T.Scene();scene.background=new T.Color('#202d33');scene.add(root,new T.HemisphereLight(0xffffff,0x607080,3));
 const light=new T.DirectionalLight(0xffffff,3);light.position.set(10,20,8);scene.add(light);
 const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));el.appendChild(renderer.domElement);
 const camera=new T.PerspectiveCamera(40,1,.01,10000),box=new T.Box3().setFromObject(root),centre=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()).length();camera.position.copy(centre).add(new T.Vector3(size,size*.7,size));
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.copy(centre);controls.update();
 const observer=new ResizeObserver(()=>{renderer.setSize(el.clientWidth,el.clientHeight);camera.aspect=el.clientWidth/el.clientHeight;camera.updateProjectionMatrix();});observer.observe(el);
 const data=new Uint8Array([210,220,220,255,55,75,80,255,55,75,80,255,210,220,220,255]);const texture=new T.DataTexture(data,2,2);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.magFilter=T.NearestFilter;texture.needsUpdate=true;checker.current=new T.MeshStandardMaterial({map:texture,side:T.DoubleSide});
 root.traverse(o=>{if(o instanceof T.Mesh)originals.current.set(o,o.material);});
 renderer.setAnimationLoop(()=>renderer.render(scene,camera));
 return()=>{renderer.setAnimationLoop(null);observer.disconnect();controls.dispose();renderer.dispose();renderer.domElement.remove();originals.current.forEach((m,o)=>o.material=m);originals.current.clear();texture.dispose();checker.current?.dispose();disposeExport(root);};
 },[root]);
 const toggle=(enabled:boolean)=>originals.current.forEach((material,mesh)=>mesh.material=enabled?checker.current!:material);
 const save=async()=>{if(generated===null)return;setBusy(true);try{if(await onSave(generated))onClose();else setMessage('Save failed. Please retry.');}catch(e){setMessage(String(e));}finally{setBusy(false);}};
 return <div className="modal-backdrop"><section className="modal cleaner-modal" role="dialog" aria-modal="true" aria-label="Model Cleaner"><button className="cleaner-close" aria-label="Close Cleaner" disabled={busy} onClick={onClose}>×</button><div className="cleaner-columns"><aside className="cleaner-controls"><div className="cleaner-title"><ToolIcon name="cleaner" /><h2>Model Cleaner</h2></div><p>Prepare UVs, then save them with your scene for export.</p><div className="cleaner-stats"><span>{stats.meshes} meshes</span><span>{stats.triangles.toLocaleString()} triangles</span><span>{stats.missingUVs} without UVs</span><span>{stats.degenerate} degenerate triangles</span></div><label className="field">Metres per texture tile<input type="number" min="0.01" step="0.1" value={scale} onChange={e=>setScale(Number(e.target.value))}/></label><button disabled={busy} onClick={()=>{try{generateUVs(root,scale);setGenerated(scale);setStats(cleanerDiagnostics(root));setMessage('UVs generated. Inspect the checker, then save.');}catch(e){setMessage(String(e));}}}>Generate projection UVs</button><label className="settings-check"><input type="checkbox" onChange={e=>toggle(e.target.checked)}/> Checkerboard preview</label><p className="micro">Projection UVs for tiling textures. Curved surfaces can show seams; this is not a packed baking layout. Geometry repair and merging are not included yet.</p>{message&&<p role="status">{message}</p>}<button className="primary cleaner-save" disabled={busy||generated===null||generated!==scale} onClick={save}><ToolIcon name="save" />{busy?'Saving…':'Save preparation'}</button></aside><div className="cleaner-viewer" ref={host}/></div></section></div>;
}
