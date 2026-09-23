import { test } from 'node:test';
import assert from 'node:assert/strict';
import { heightToNormals } from './bump-map';
import { validateTextureMaterial } from './texture-material-model';
test('bump conversion yields flat normals at zero strength and slopes in OpenGL orientation', () => {
 const data = new Uint8ClampedArray(3*3*4);
 for(let y=0;y<3;y++)for(let x=0;x<3;x++)data[(y*3+x)*4]=(x+y)*50;
 const flat=heightToNormals(data,3,3,0);
 assert.deepEqual([...flat.slice(16,20)],[128,128,255,255]);
 const slope=heightToNormals(data,3,3,1);
 assert.ok(slope[16]<128);assert.ok(slope[17]>128);assert.ok(slope[18]<255);
 assert.equal(slope[19],255);
});
test('bump maps persist with validation',()=>{
 const record={id:'test',name:'Bump',tint:'#ffffff',roughness:1,scale:1,rotation:0,bumpImage:'data:image/png;base64,AA==',bumpStrength:1};
 assert.equal(validateTextureMaterial(record).bumpImage,record.bumpImage);
 assert.throws(()=>validateTextureMaterial({...record,bumpStrength:-1}));
 assert.throws(()=>validateTextureMaterial({...record,bumpImage:'file:///height.png'}));
});
