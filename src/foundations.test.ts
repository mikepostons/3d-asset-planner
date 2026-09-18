import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fresh,part,sceneStructures,validate} from './model';
import {foundationFor,foundationGeometry,foundationDefaults} from './foundations';
import {preparationKey} from './model-cleaner';
test('foundations are opt-in, ground-only and overridable per connected structure',()=>{
 const d=fresh(),p=part();d.parts=[p];assert.equal(foundationFor(d,p),null);
 d.foundation={...foundationDefaults,enabled:true,depth:2};assert.equal(foundationFor(d,p)?.depth,2);
 const elevated={...p,id:'roof',baseY:4};d.parts.push(elevated);assert.equal(foundationFor(d,elevated),null);
 d.structureFoundations={[sceneStructures(d)[0].id]:{...d.foundation,enabled:false}};assert.equal(foundationFor(d,p),null);
 assert.deepEqual(validate(JSON.parse(JSON.stringify(d))).foundation,d.foundation);
 assert.throws(()=>validate({...d,foundation:{...d.foundation,depth:-1}}));
});
test('foundation extends below original base with margin and retains finite UVs',()=>{
 const p=part(),g=foundationGeometry(p,{enabled:true,depth:1.5,margin:.25});g.computeBoundingBox();
 assert.ok(Math.abs(g.boundingBox!.min.y+1.5)<1e-5);assert.ok(Math.abs(g.boundingBox!.max.y)<1e-5);
 assert.ok(Math.abs(g.boundingBox!.max.x-(p.width/2+.25))<1e-5);
 assert.ok(Array.from(g.getAttribute('uv').array).every(Number.isFinite));g.dispose();
});
test('hollow circular foundations preserve the central opening',()=>{
 const p={...part(),shape:'circle' as const,width:4,innerDiameter:2};
 const g=foundationGeometry(p,{enabled:true,depth:1,margin:0});const a=g.getAttribute('position');
 for(let i=0;i<a.count;i++)assert.ok(Math.hypot(a.getX(i),a.getZ(i))>.99);
 g.dispose();
});
test('foundation geometry changes invalidate prepared UV signature',()=>{
 const d=fresh();d.parts=[part()];const old=preparationKey(d);d.foundation={enabled:true,depth:1,margin:0};assert.notEqual(preparationKey(d),old);
});
