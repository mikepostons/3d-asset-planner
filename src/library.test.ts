import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Library } from "../server/library";
import { demo } from "./model";
test("SQLite scenes persist across reopen and saves update rather than duplicate", () => {
  const dir = mkdtempSync(join(tmpdir(), "asset-library-")),
    path = join(dir, "test.sqlite");
  let db = new Library(path);
  try {
    const p = db.createProject("Works"),
      plan = demo();
    const saved = db.save(plan.id, { plan, projectId: p.id, version: 0 });
    assert.equal(saved.version, 1);
    db.close();
    db = new Library(path);
    assert.deepEqual(db.scene(plan.id)?.plan, plan);
    assert.equal(db.projects().length, 1);
    plan.name = "Harbour works";
    assert.equal(
      db.save(plan.id, { plan, projectId: null, version: 1 }).version,
      2,
    );
    assert.equal(db.scenes().length, 1);
    assert.equal(db.scene(plan.id)?.projectId, null);
    assert.throws(
      () => db.save(plan.id, { plan, version: 1 }),
      /saved elsewhere/,
    );
    assert.equal(db.scene(plan.id)?.version, 2);
    assert.throws(() =>
      db.save(plan.id, { plan, version: 2, projectId: "missing" }),
    );
    assert.equal(db.scene(plan.id)?.version, 2);
    assert.throws(() =>
      db.save(plan.id, { plan: { ...plan, parts: "broken" }, version: 2 }),
    );
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test('material library stores immutable reusable entries and validates image sources',()=>{
 const db=new Library(':memory:');try{
 const input={id:'draft',name:'Slate',tint:'#ffffff',roughness:.9,scale:2,rotation:45};
 const a=db.createMaterial(input),b=db.createMaterial({...input,name:'Slate copy'});assert.notEqual(a.id,b.id);assert.equal(db.materials().length,2);assert.equal(db.materials().find(m=>m.id===a.id).scale,2);
 assert.throws(()=>db.createMaterial({...input,image:'https://example.com/image.png'}));assert.throws(()=>db.createMaterial({...input,scale:0}));
 }finally{db.close();}
});
test('material revisions preserve existing scene references and report usage',()=>{
 const db=new Library(':memory:');try{const project=db.createProject('Mine');const original=db.createMaterial({id:'draft',name:'Stone',keywords:['granite'],projectIds:[project.id],tint:'#ffffff',roughness:1,scale:1,rotation:0});const plan=demo();plan.materialAssignments={[plan.parts[0].id+':Walls']:original.id};db.save(plan.id,{plan,version:0});const updated=db.createMaterial({...original,parentId:original.id,tint:'#888888'});assert.equal(updated.version,2);assert.equal(updated.familyId,original.familyId);assert.equal(db.materialUsage(original.id).length,1);assert.equal(db.materialUsage(updated.id).length,0);assert.equal(db.scene(plan.id)?.plan.materialAssignments[plan.parts[0].id+':Walls'],original.id);assert.throws(()=>db.createMaterial({...original,projectIds:['missing']}));}finally{db.close();}
});

test('material deletion retains assigned records, reports surfaces, and can be undone',()=>{
 const db=new Library(':memory:');try{
 const material=db.createMaterial({id:'draft',name:'Stone',tint:'#ffffff',roughness:1,scale:1,rotation:0});
 const plan=demo(),p=plan.parts[0];plan.materialAssignments={[`${p.id}:Walls`]:material.id,[`${p.id}:Roof`]:material.id};db.save(plan.id,{plan,version:0});
 const usage=db.materialUsage(material.id);assert.equal(usage[0].name,plan.name);assert.deepEqual(usage[0].surfaces.map(s=>s.surface),['Walls','Roof']);assert.equal(usage[0].surfaces[0].partName,p.name);
 const archived=db.archiveMaterial(material.id);assert.equal(archived.archived,true);assert.equal(db.materials().find(m=>m.id===material.id).archived,true);assert.deepEqual(db.scene(plan.id)?.plan.materialAssignments,plan.materialAssignments);assert.equal(db.scene(plan.id)?.version,1);
 assert.equal(db.archiveMaterial(material.id,false).archived,false);assert.throws(()=>db.archiveMaterial('absent'),/not found/);
 }finally{db.close();}
});
