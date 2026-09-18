import {test} from 'node:test';
import assert from 'node:assert/strict';
import {part,fresh,validate,scalePart} from './model';
import {partGeometry} from './geometry';
import {gableInfill,defaultRoofDetails} from './roof-details';
test('roof skins support all straight roof types, asymmetric overhangs and trim',()=>{
 for(const roof of ['gable','lean-to','flat'] as const) for(const ridge of ['width','depth'] as const){
  const p=part();p.roof=roof;p.ridge=ridge;
  p.roofDetails={...defaultRoofDetails(),start:.3,end:.7,fascia:true,ridgeCap:true};
  const g=partGeometry(p,true);const a=g.getAttribute('position');
  assert.ok(a.count>0);assert.ok(Array.from(a.array).every(Number.isFinite));
  g.computeBoundingBox();assert.ok(g.boundingBox!.max.x-g.boundingBox!.min.x>p.width);
  assert.ok(g.boundingBox!.max.z-g.boundingBox!.min.z>p.depth);g.dispose();
  assert.deepEqual(validate(JSON.parse(JSON.stringify({...fresh(),parts:[p]}))).parts[0].roofDetails,p.roofDetails);
  assert.equal(scalePart(p,2).roofDetails!.thickness,.3);
  p.roofEnabled=false;assert.equal(partGeometry(p,true).getAttribute('position'),undefined);
 }
});
test('roof details reject invalid dimensions',()=>{
 const p=part();p.roofDetails=defaultRoofDetails();p.roofDetails.thickness=-1;
 assert.throws(()=>validate({...fresh(),parts:[p]}),/roof/i);
});

test('gable ends default to walls and allow separate hidden or material infill',()=>{
 const p=part();p.roof='gable';p.roofDetails=defaultRoofDetails();
 for(const ridge of ['width','depth'] as const){
  p.ridge=ridge;const roof=partGeometry(p,true);
  let ends=gableInfill(p,roof);assert.equal(ends.length,2);assert.ok(ends.every(e=>e.mode==='wall'));ends.forEach(e=>e.geometry.dispose());
  p.roofDetails.gableSeparate=true;p.roofDetails.gableStart='hidden';p.roofDetails.gableEnd='material';p.roofDetails.gableEndMaterial='Timber boards';
  ends=gableInfill(p,roof);assert.equal(ends.length,1);assert.equal(ends[0].material,'Timber boards');ends.forEach(e=>e.geometry.dispose());roof.dispose();
  const scaled=scalePart(p,2);assert.equal(scaled.roofDetails!.gableEndMaterial,'Timber boards');
  assert.doesNotThrow(()=>validate({...fresh(),parts:[p]}));
  p.roofDetails=defaultRoofDetails();
 }
});

test('fascia starts below roof underside and beam extensions follow either ridge axis',()=>{
 for(const ridge of ['width','depth'] as const){
  const p=part();p.roof='gable';p.ridge=ridge;
  p.roofDetails={...defaultRoofDetails(),fascia:true,sideFascia:{height:.4,depth:.05,inset:.1,drop:.2},endFascia:{height:.3,depth:.04,inset:.15,drop:.1}};
  const g=partGeometry(p,true);g.computeBoundingBox();
  assert.ok(g.boundingBox!.min.y < (p.wallHeight??p.floors*p.floorHeight)-.5);g.dispose();
  p.roofDetails.ridgeBeam=true;p.roofDetails.beamStart=2;p.roofDetails.beamEnd=1;
  const beam=partGeometry(p,true);beam.computeBoundingBox();const axis=ridge==='width'?'x':'z';const span=ridge==='width'?p.width:p.depth;
  assert.ok(beam.boundingBox!.min[axis] < -span/2-1.9);
  assert.ok(beam.boundingBox!.max[axis] > span/2+.9);beam.dispose();
  const scaled=scalePart(p,2);assert.equal(scaled.roofDetails!.sideFascia!.drop,.4);assert.equal(scaled.roofDetails!.beamStart,4);
  assert.doesNotThrow(()=>validate(JSON.parse(JSON.stringify({...fresh(),parts:[p]}))));
 }
});

test('side fascia length offsets extend both ends, scale and validate',()=>{
 const p=part();p.roof='gable';p.ridge='width';
 p.roofDetails={...defaultRoofDetails(),fascia:true,sideFascia:{height:.3,depth:.05,inset:0,drop:0,lengthOffset:.75}};
 const g=partGeometry(p,true);g.computeBoundingBox();
 assert.ok(g.boundingBox!.max.x>p.width/2+.9);assert.ok(g.boundingBox!.min.x< -p.width/2-.9);g.dispose();
 assert.equal(scalePart(p,2).roofDetails!.sideFascia!.lengthOffset,1.5);
 p.roofDetails.sideFascia!.lengthOffset=-10;
 const short=partGeometry(p,true);assert.ok(Array.from(short.getAttribute('position').array).every(Number.isFinite));short.dispose();
 assert.doesNotThrow(()=>validate({...fresh(),parts:[p]}));
 p.roofDetails.sideFascia!.lengthOffset=NaN;assert.throws(()=>validate({...fresh(),parts:[p]}),/fascia/);
});
