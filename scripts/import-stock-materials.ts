// Imports a verified extraction manifest prepared as JSON records. Keeps source images outside SQLite.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Library } from '../server/library';
const prepared = process.argv[2];
if (!prepared) throw Error('Provide prepared import directory');
const stock = resolve('../../MATERIALS/STOCK');
const manifest = JSON.parse(readFileSync(join(prepared, 'manifest.json'), 'utf8'));
const db = new Library('data/scenes.sqlite');
try {
 for (const entry of manifest) {
  const record = JSON.parse(readFileSync(join(prepared, entry.archive.replace(/\.zip$/, '.json')), 'utf8'));
  const existing = db.materials().find(m => m.name === record.name && m.keywords?.includes('stock'));
  if (existing) throw Error(`Already exists: ${record.name}; refusing duplicate import`);
 }
 db.db.exec('BEGIN IMMEDIATE');
 try {
  for (const entry of manifest) {
   const record = JSON.parse(readFileSync(join(prepared, entry.archive.replace(/\.zip$/, '.json')), 'utf8'));
   const saved = db.createMaterial(record);
   const persisted = JSON.parse(db.db.prepare('SELECT record FROM materials WHERE id=?').get(saved.id)!.record as string);
   for (const field of Object.keys(entry.maps)) if(persisted[field] !== record[field]) throw Error(`Map mismatch: ${entry.name}/${field}`);
   entry.materialId = saved.id;
   console.log(`Imported ${entry.name} (${Object.keys(entry.maps).length} maps)`);
  }
  db.db.exec('COMMIT');
 } catch(e) {db.db.exec('ROLLBACK');throw e;}
 const path=join(stock,'import-manifest.json');
 const previous=existsSync(path)?JSON.parse(readFileSync(path,'utf8')):[];
 writeFileSync(path,JSON.stringify([...previous,...manifest],null,2));
} finally {db.db.close();}
