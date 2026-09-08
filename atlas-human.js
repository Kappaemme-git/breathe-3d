import * as T from 'three';
import {createArmMotion,breathCycle} from './motion.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
export async function createHuman(model){
 const [manifest,buffer]=await Promise.all([fetch('./assets/bodyparts/upper-body.json').then(r=>r.json()),fetch('./assets/bodyparts/upper-body.bin').then(r=>r.arrayBuffer())]);
 const bones=[new T.Bone(),new T.Bone(),new T.Bone(),new T.Bone()];bones.forEach((b,i)=>b.name=['Corpo','Spalla_Atlante','Gomito_Atlante','Polso_Atlante'][i]);
 const restShoulder=new T.Vector3(1.032,3.65,-.144),restElbow=new T.Vector3(1.338,1.946,-.09),restWrist=new T.Vector3(1.584,.59,.048);
 bones[0].add(bones[1]);bones[1].position.copy(restShoulder);bones[1].add(bones[2]);bones[2].position.copy(restElbow).sub(restShoulder);bones[2].add(bones[3]);bones[3].position.copy(restWrist).sub(restElbow);model.add(bones[0]);model.updateMatrixWorld(true);const skeleton=new T.Skeleton(bones);skeleton.calculateInverses();
 const originalUpper=restElbow.clone().sub(restShoulder),originalFore=restWrist.clone().sub(restElbow),L1=originalUpper.length(),L2=originalFore.length();
 const skin=new T.MeshPhysicalMaterial({color:0xc29d82,roughness:.64,transparent:true,opacity:1,depthWrite:false,vertexColors:true,side:T.FrontSide});
 const materials={skeletal:new T.MeshStandardMaterial({color:0xd5c8a8,roughness:.72}),muscular:new T.MeshStandardMaterial({color:0xa85b50,roughness:.66}),arterial:new T.MeshStandardMaterial({color:0xb94f42,roughness:.55}),venous:new T.MeshStandardMaterial({color:0x557ea0,roughness:.58}),nervous:new T.MeshStandardMaterial({color:0xceac62,roughness:.72}),connective:new T.MeshStandardMaterial({color:0xbdc9bb,roughness:.65}),cardiac:new T.MeshStandardMaterial({color:0x994c4a,roughness:.58}),sensory:new T.MeshPhysicalMaterial({color:0xc7c4b3,roughness:.28}),respiratory:new T.MeshStandardMaterial({color:0xdbaf9c,roughness:.66,transparent:true,opacity:.92,depthWrite:false}),skin};
 const layers=new T.Group();layers.name='Strati anatomici BodyParts3D';model.add(layers);const respiratory=new T.Group();respiratory.name='Bronchi e trachea BodyParts3D';model.add(respiratory);
 const batches={};const partsById=new Map();let skinMesh,headSurface,handSurface;
 function rig(g){const p=g.attributes.position,si=[],sw=[];for(let i=0;i<p.count;i++){let x=p.getX(i),y=p.getY(i);let arm=y<2.5?T.MathUtils.smoothstep(x,.91,1.03):T.MathUtils.smoothstep(x,.84,1.14);if(y>3.3)arm*=1-T.MathUtils.smoothstep(y,3.55,3.9);const fore=1-T.MathUtils.smoothstep(y,1.72,2.16),hand=1-T.MathUtils.smoothstep(y,.48,.72);si.push(0,1,2,3);sw.push(1-arm,arm*(1-fore),arm*fore*(1-hand),arm*hand)}g.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));return g}
 for(const part of manifest.parts){let g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array(buffer,part.positions,part.vertexCount*3),3));g.setAttribute('normal',new T.BufferAttribute(new Float32Array(buffer,part.normals,part.vertexCount*3),3));g.setIndex(new T.BufferAttribute(new Uint32Array(buffer,part.indices,part.indexCount),1));g.normalizeNormals();partsById.set(part.id,{part,g});
 if(part.id==='FJ2810'){
 const p=g.attributes.position,colors=[];for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);const chest=(1-T.MathUtils.smoothstep(Math.abs(x),.65,1.0))*T.MathUtils.smoothstep(y,1.1,1.6)*(1-T.MathUtils.smoothstep(y,3.65,3.95))*T.MathUtils.smoothstep(z,-.16,.12);const throat=(1-T.MathUtils.smoothstep(Math.abs(x),.14,.26))*T.MathUtils.smoothstep(y,3.65,3.9)*(1-T.MathUtils.smoothstep(y,4.2,4.45))*T.MathUtils.smoothstep(z,0,.22);const noise=.98+.015*Math.sin(x*213+y*151)*Math.sin(z*171+y*181);colors.push(noise,noise,noise,1-Math.max(chest*.91,throat*.7))}g.setAttribute('color',new T.Float32BufferAttribute(colors,4));skinMesh=new T.SkinnedMesh(rig(g),skin);skinMesh.name='Superficie anatomica del corpo';model.add(skinMesh);skinMesh.bind(skeleton,new T.Matrix4());skinMesh.frustumCulled=false;skinMesh.renderOrder=5;const headG=g.clone();const all=headG.index.array,keep=[];for(let k=0;k<all.length;k+=3){if(p.getY(all[k])>4.14&&p.getY(all[k+1])>4.14&&p.getY(all[k+2])>4.14)keep.push(all[k],all[k+1],all[k+2])}headG.setIndex(keep);const headMat=skin.clone();headMat.transparent=false;headMat.vertexColors=false;headMat.depthWrite=true;headMat.side=T.DoubleSide;headSurface=new T.SkinnedMesh(headG,headMat);headSurface.name='Volto della superficie anatomica';model.add(headSurface);headSurface.bind(skeleton,new T.Matrix4());headSurface.frustumCulled=false;headSurface.visible=false;
 const handG=g.clone(),handIndices=[];for(let k=0;k<all.length;k+=3){if([all[k],all[k+1],all[k+2]].every(i=>Math.abs(p.getX(i))>1.18&&p.getY(i)<.88))handIndices.push(all[k],all[k+1],all[k+2])}handG.setIndex(handIndices);const handMat=headMat.clone();handMat.color.set(0xc29d82);handMat.roughness=.6;handMat.stencilWrite=true;handMat.stencilRef=1;handMat.stencilFunc=T.AlwaysStencilFunc;handMat.stencilZPass=T.ReplaceStencilOp;handSurface=new T.SkinnedMesh(handG,handMat);handSurface.name='Mani rivestite di pelle';model.add(handSurface);handSurface.bind(skeleton,new T.Matrix4());handSurface.frustumCulled=false;handSurface.visible=true;
 // Invisible skin shell masks X-ray overlays where the raised arm is in front.
 const maskG=g.clone(),maskIndices=[];for(let k=0;k<all.length;k+=3){if([all[k],all[k+1],all[k+2]].every(i=>p.getX(i)>1.08&&p.getY(i)<3.4))maskIndices.push(all[k],all[k+1],all[k+2])}maskG.setIndex(maskIndices);
 const maskMat=new T.MeshBasicMaterial({colorWrite:false,depthWrite:false,side:T.DoubleSide,stencilWrite:true,stencilRef:1,stencilFunc:T.AlwaysStencilFunc,stencilZPass:T.ReplaceStencilOp});
 const armMask=new T.SkinnedMesh(maskG,maskMat);armMask.name='Occlusione del braccio davanti alla vista anatomica';armMask.bind(skeleton,new T.Matrix4());armMask.frustumCulled=false;armMask.renderOrder=4;model.add(armMask);


 }else if(part.system==='integumentary'){
 let mat=new T.MeshStandardMaterial({color:part.name.includes('Lip')?0xa37264:0x3a3029,roughness:.85});let mesh=new T.Mesh(g,mat);mesh.name=part.name;model.add(mesh);
 }else{const key=part.system==='muscular'&&/pectoralis major|rectus abdominis|external oblique/i.test(part.name)?'chestWindow':part.system;if(!batches[key])batches[key]=[];batches[key].push(g)}
 }
 materials.chestWindow=new T.MeshStandardMaterial({color:0xa85b50,roughness:.7,transparent:true,opacity:.07,depthWrite:false});for(const [system,geos] of Object.entries(batches)){const g=mergeGeometries(geos);const m=new T.SkinnedMesh(rig(g),materials[system]||materials.connective);m.name='BodyParts3D_'+system;m.bind(skeleton,new T.Matrix4());m.frustumCulled=false;if(system==='respiratory'){respiratory.add(m);m.renderOrder=3}else if(system==='sensory'){model.add(m)}else{layers.add(m)} }
 layers.visible=true;skinMesh.visible=false;headSurface.visible=true;for(const side of [-1,1]){const iris=new T.Mesh(new T.CircleGeometry(.030,28),new T.MeshPhysicalMaterial({color:0x4a4536,roughness:.28}));iris.position.set(side*.18,4.825,.401);iris.name='Iride';model.add(iris);const pupil=new T.Mesh(new T.CircleGeometry(.014,20),new T.MeshBasicMaterial({color:0x14100d}));pupil.position.set(side*.18,4.825,.403);pupil.name='Pupilla';model.add(pupil);}

 // Source hands, fingers, lips and scalp remain connected to the original anatomical surface.
 const mouth=new T.Vector3(-.004,4.46,.55),cigarette=new T.Group();cigarette.name='Sigaretta_Atlante';model.add(cigarette);
 const paper=new T.Mesh(new T.CylinderGeometry(.023,.023,.41,18),new T.MeshStandardMaterial({color:0xece7dc,roughness:.86}));paper.rotation.x=Math.PI/2;paper.position.z=.205;cigarette.add(paper);const filter=new T.Mesh(new T.CylinderGeometry(.024,.024,.13,18),new T.MeshStandardMaterial({color:0xbe945f,roughness:.9}));filter.rotation.x=Math.PI/2;filter.position.z=.065;cigarette.add(filter);const ember=new T.Mesh(new T.SphereGeometry(.024,12,8),new T.MeshStandardMaterial({color:0x753b22,emissive:0xff4b12,emissiveIntensity:1}));ember.position.z=.415;cigarette.add(ember);
 const breathing={value:0};
 const skinMaterials=new Set([skin,headSurface.material,handSurface.material]);
 const breathingMaterials=new Set();model.traverse(o=>{if(o.isSkinnedMesh)breathingMaterials.add(o.material)});
 for(const mat of breathingMaterials){mat.onBeforeCompile=shader=>{
 shader.uniforms.breathing=breathing;
 shader.vertexShader='uniform float breathing; varying vec3 skinSurface;\n'+shader.vertexShader.replace('#include <skinning_vertex>',`#include <skinning_vertex>
 float chestWeight=smoothstep(1.45,2.2,transformed.y)*(1.0-smoothstep(3.5,3.95,transformed.y))*(1.0-smoothstep(.85,1.15,abs(transformed.x)));
 transformed.x*=1.0+breathing*0.013*chestWeight;
 transformed.z+=breathing*0.038*chestWeight*smoothstep(-.15,.2,transformed.z);
 transformed.y+=breathing*0.014*chestWeight;
 skinSurface=transformed;
 `);
 if(skinMaterials.has(mat)){
 shader.fragmentShader='varying vec3 skinSurface;\n'+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 float pores=sin(skinSurface.x*713.0+skinSurface.z*193.0)*sin(skinSurface.y*619.0+skinSurface.x*151.0);
 float warmth=sin(skinSurface.x*29.0+skinSurface.z*17.0)*sin(skinSurface.y*37.0);
 diffuseColor.rgb*=0.98+0.025*pores;
 diffuseColor.rgb+=vec3(0.013,-0.003,-0.005)*warmth;
 `).replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
 normal=normalize(normal+0.022*vec3(sin(skinSurface.x*713.0),sin(skinSurface.y*619.0),sin(skinSurface.z*673.0)));
 `);
 }
 };}
 const poseArm=createArmMotion(restShoulder,restElbow,restWrist,mouth);let shown=true;
 function update(time){breathing.value=breathCycle(time).expansion;const pose=poseArm(time),{t,lift,qUpper,qFore,qHand}=pose;
 bones[1].quaternion.copy(qUpper);bones[2].quaternion.copy(qUpper).invert().multiply(qFore);bones[3].quaternion.copy(qFore).invert().multiply(qHand);
 // The filter is 0.105 units behind the actual finger contact point.
 cigarette.quaternion.copy(pose.qCigarette);
 cigarette.position.copy(pose.grip).sub(new T.Vector3(0,0,.13).applyQuaternion(cigarette.quaternion));
 ember.material.emissiveIntensity=.5+2* Math.sin(Math.PI*T.MathUtils.clamp((t-2.5)/3,0,1));
 model.updateMatrixWorld(true);return {t,lift,mouth,tip:cigarette.localToWorld(new T.Vector3(0,0,.415))};}
 function setLayers(on){layers.visible=on;shown=!on;skinMesh.visible=!on;headSurface.visible=on;handSurface.visible=on;}
 update(0);return {skin,update,moving:[...bones.slice(1),cigarette],head:skinMesh,respiratory,setLayers,partsById,partCount:manifest.parts.length};
}
