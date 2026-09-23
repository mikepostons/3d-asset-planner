import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
/** Local neutral studio reflections; no external environment asset required. */
export function reflectionEnvironment(renderer:T.WebGLRenderer,scene:T.Scene){
 const room=new RoomEnvironment(),generator=new T.PMREMGenerator(renderer);
 const target=generator.fromScene(room,.04);room.dispose();generator.dispose();
 scene.environment=target.texture;scene.environmentIntensity=.35;
 return ()=>{scene.environment=null;target.dispose();};
}
