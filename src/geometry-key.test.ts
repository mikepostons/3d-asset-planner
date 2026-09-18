import {test} from 'node:test';
import assert from 'node:assert/strict';
import {geometryKey} from './geometry-key';
import {fresh,part} from './model';
test('material metadata edits reuse geometry while model changes invalidate it',()=>{
 const d={...fresh(),parts:[part()]};const before=geometryKey(d);
 d.parts[0].materials='Granite';d.parts[0].bodyMaterial={name:'Stone',description:'Rough granite'};
 d.parts[0].roofMaterial={name:'Slate',description:'Weathered'};
 assert.equal(geometryKey(d),before);
 d.parts[0].width+=1;assert.notEqual(geometryKey(d),before);
 assert.notEqual(geometryKey({d,xray:false}),geometryKey({d,xray:true}));
 assert.notEqual(geometryKey({d,selected:'one'}),geometryKey({d,selected:'two'}));
});
