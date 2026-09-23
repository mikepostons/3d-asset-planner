import {useState,useEffect} from "react";
import type {Part} from './model';
import {height} from './model';
import {endFaces} from './end-walls';
import {wallFrame} from './openings';
import {defaultRoofDetails,type RoofDetails} from './roof-details';
import {platformDefaults,type Platform} from './platforms';
function NumberField({label,value,min=0,max=100,step=.1,onChange}:{label:string;value:number;min?:number;max?:number;step?:number;onChange:(v:number)=>void}){
 const [draft,setDraft]=useState(String(+value.toFixed(4)));useEffect(()=>setDraft(String(+value.toFixed(4))),[value]);
 return <label className="field">{label}<input type="number" min={min} max={max} step={step} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}} onBlur={()=>{const n=Number(draft);if(draft.trim()&&Number.isFinite(n)&&n>=min&&n<=max)onChange(n);else setDraft(String(+value.toFixed(4)));}}/></label>;
}
export function EndWallControls({part:p,onChange}:{part:Part;onChange:(d:RoofDetails)=>void}){
 const d=p.roofDetails??defaultRoofDetails();const patch=(change:Partial<RoofDetails>)=>onChange({...d,...change});
 return <>
 <details className="part-section"><summary>End walls & gables</summary>
 {!p.roofDetails ? <><p className="micro">Enable roof detailing to customise end walls and gables.</p><button onClick={()=>onChange(defaultRoofDetails())}>Enable end-wall settings</button></> : <>
 <p className="micro">Continuous walls rise to the roof. Separate cladding can start at the eaves or a floor level. Level 0 is the component base; level 1 is one floor above it.</p>
 <label className="settings-check"><input type="checkbox" checked={d.gableSeparate??false} onChange={e=>patch({gableSeparate:e.target.checked,gableEnd:d.gableEnd??d.gableStart??'wall',gableEndMaterial:d.gableEndMaterial??d.gableStartMaterial,gableEndBaseFloor:d.gableEndBaseFloor??d.gableStartBaseFloor})}/>Set each end separately</label>
 {(d.gableSeparate?[0,1]:[0]).map(end=>{
 const key=end?'gableEnd':'gableStart',materialKey=end?'gableEndMaterial':'gableStartMaterial',floorKey=end?'gableEndBaseFloor':'gableStartBaseFloor';
 return <div className="part-section" key={end}><label className="field">{d.gableSeparate?`End ${end+1}`:'Both ends'}<select value={d[key]??'wall'} onChange={e=>patch({[key]:e.target.value as 'wall'|'material'|'hidden'})}><option value="wall">Continuous wall to roof</option><option value="material">Separate cladding</option><option value="hidden">No gable above eaves</option></select></label>
 {d[key]==='material'&&<><label className="field">Cladding starts at<select value={d[floorKey]===undefined?'eaves':'floor'} onChange={e=>patch({[floorKey]:e.target.value==='eaves'?undefined:Math.max(0,p.floors-1)})}><option value="eaves">Eaves (gable only)</option><option value="floor">Floor level</option></select></label>{d[floorKey]!==undefined&&<NumberField label="Cladding base floor level" value={d[floorKey]!} max={Math.min(10,height(p)/p.floorHeight)} onChange={n=>patch({[floorKey]:n})}/>}<label className="field">Cladding material description<input value={d[materialKey]??'Timber cladding'} onChange={e=>patch({[materialKey]:e.target.value})}/></label><p className="micro">Assign its texture to “End {end+1} cladding” in Material Designer. Existing openings remain cut through the cladding.</p></>}
 </div>;
 })}</>}</details>
 <details className="part-section"><summary>Platforms</summary>
 {!p.roofDetails ? <><p className="micro">Enable roof detailing to add end platforms.</p><button onClick={()=>onChange(defaultRoofDetails())}>Enable platform settings</button></> : <>
 <p className="micro">Full width follows the end wall. Custom widths are centred on the wall. Projection controls how far it extends. Height follows the component floor height. No stairs or access doorway are created automatically.</p>
 {[0,1].map(end=>{const key=end?'platformEnd':'platformStart',v=d[key]??platformDefaults(p),set=(change:Partial<Platform>)=>patch({[key]:{...v,...change}});return <details className="part-section" key={end}><summary>End {end+1} platform</summary><label className="settings-check"><input type="checkbox" checked={d[key]?.enabled??false} onChange={e=>set({enabled:e.target.checked})}/>Add platform</label>{d[key]?.enabled&&<>
 <label className="settings-check"><input type="checkbox" checked={v.width===undefined} onChange={e=>set({width:e.target.checked?undefined:wallFrame(p,endFaces(p)[end]).length})}/>Full wall width</label>
 {v.width!==undefined&&<NumberField label="Platform width (m)" value={Math.min(v.width,wallFrame(p,endFaces(p)[end]).length)} min={.1} max={wallFrame(p,endFaces(p)[end]).length} onChange={n=>set({width:n})}/>}
 <div className="pair"><NumberField label="Platform floor level" value={v.floor} onChange={n=>set({floor:n})}/><NumberField label="Projection (m)" value={v.depth} min={.1} onChange={n=>set({depth:n})}/><NumberField label="Deck thickness (m)" value={v.thickness} min={.01} step={.01} onChange={n=>set({thickness:n})}/></div>
 <label className="settings-check"><input type="checkbox" checked={v.railings} onChange={e=>set({railings:e.target.checked})}/>Timber railings with X braces</label>{v.railings&&<><NumberField label="Railing height (m)" value={v.railHeight} min={.1} onChange={n=>set({railHeight:n})}/></>}
 <label className="settings-check"><input type="checkbox" checked={v.supports} onChange={e=>set({supports:e.target.checked})}/>Posts down to component base</label>{v.supports&&<NumberField label="Support post width (m)" value={v.postSize} min={.01} step={.01} onChange={n=>set({postSize:n})}/>}
 </>}</details>;})}</>}</details>
 </>;
}
