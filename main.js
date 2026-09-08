import {smokingCycle,breathCycle} from './motion.js';
import {createLungs} from './anatomy.js';
import { createHuman } from './atlas-human.js';
import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { GLTFExporter } from './vendor/GLTFExporter.js';
const stage=document.querySelector('#stage');
const scene=new THREE.Scene();

const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,stencil:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.91;stage.prepend(renderer.domElement);
const camera=new THREE.PerspectiveCamera(34,1,.1,100);camera.position.set(4,3.4,10.9);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,3,0);controls.enableDamping=true;controls.minDistance=3;controls.maxDistance=19;controls.maxPolarAngle=Math.PI*.88;
scene.add(new THREE.HemisphereLight(0xe3d7c8,0x171a21,1.1));function light(color,intensity,x,y,z){const l=new THREE.DirectionalLight(color,intensity);l.position.set(x,y,z);scene.add(l)}light(0xffe4c9,2.65,-4,7,5);light(0xf1d7be,.5,4,3,2);light(0xbdcbb5,2.0,1,5,-4);
const model=new THREE.Group();model.name='Uomo e apparato respiratorio — modello didattico';scene.add(model);
const skin=new THREE.MeshPhysicalMaterial({color:0xa7c4c3,roughness:.45,metalness:.12,transparent:true,opacity:.21,depthWrite:false,side:THREE.DoubleSide});
const face=new THREE.MeshStandardMaterial({color:0x95afae,roughness:.55,metalness:.12});const dark=new THREE.MeshStandardMaterial({color:0x263538,roughness:.83});const bone=new THREE.MeshStandardMaterial({color:0xc6b2a3,transparent:true,opacity:.065,depthWrite:false});const airway=new THREE.MeshStandardMaterial({color:0xb88c7a,roughness:.6,transparent:true,opacity:.48});const obsoleteLungMat=new THREE.MeshPhysicalMaterial({color:0xd19a96,roughness:.68,transparent:true,opacity:.63,depthWrite:false,side:THREE.DoubleSide});
const sphere=new THREE.SphereGeometry(1,40,28);
function ell(name,x,y,z,sx,sy,sz,mat,parent=model){const m=new THREE.Mesh(sphere,mat);m.name=name;m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m}
function tube(name,pts,r,mat,parent=model){const curve=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)));const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,32,r,9,false),mat);mesh.name=name;parent.add(mesh);return curve}
function limb(a,b,r,mat){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b);const m=new THREE.Mesh(new THREE.CylinderGeometry(r*.85,r,va.distanceTo(vb),24),mat);m.position.copy(va).add(vb).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vb.sub(va).normalize());model.add(m);ell('Articolazione',...a,r,r,r,mat);ell('Articolazione',...b,r,r,r,mat)}
const human=await createHuman(model);
const cigStart=[-.004,4.46,.55],cigEnd=[-.058,4.46,.962];
const anatomy=createLungs(model);const lungMat=anatomy.lungMat;const lungGroup=anatomy.group,endpoints=anatomy.endpoints,alveoliMat=anatomy.alveoliMat,damageGroup=anatomy.damage;for(const o of lungGroup.children){if(o.name.includes('Albero bronchiale'))o.visible=false;}
const smokeCanvas=document.createElement('canvas');smokeCanvas.width=smokeCanvas.height=64;const ctx=smokeCanvas.getContext('2d');const gr=ctx.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,.92)');gr.addColorStop(.35,'rgba(255,255,255,.65)');gr.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gr;ctx.fillRect(0,0,64,64);const smokeTexture=new THREE.CanvasTexture(smokeCanvas);
const flowPaths=anatomy.routes.map(route=>new THREE.CatmullRomCurve3([new THREE.Vector3(...cigStart),new THREE.Vector3(0,4.17,.01),new THREE.Vector3(0,3.65,.01),...route]));
// Soft, individually faded puffs keep the stream readable without a solid tube.
const count=1200,positions=new Float32Array(count*3),opacities=new Float32Array(count),sizes=new Float32Array(count);
const smokeGeo=new THREE.BufferGeometry();smokeGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));smokeGeo.setAttribute('alpha',new THREE.BufferAttribute(opacities,1));smokeGeo.setAttribute('size',new THREE.BufferAttribute(sizes,1));
const smokeMat=new THREE.ShaderMaterial({uniforms:{pixelScale:{value:500},clock:{value:0}},vertexShader:`attribute float alpha;attribute float size;uniform float pixelScale;varying float fade;varying float seed;void main(){vec4 p=modelViewMatrix*vec4(position,1.0);fade=alpha;seed=position.y*7.0;gl_PointSize=clamp(size*pixelScale/-p.z,1.0,100.0);gl_Position=projectionMatrix*p;}`,fragmentShader:`uniform float clock;varying float fade;varying float seed;void main(){vec2 p=gl_PointCoord*2.0-1.0;float r=length(p);float wisps=.78+.22*sin(p.x*9.0+seed+clock)*sin(p.y*7.0-seed);float a=exp(-r*r*3.8)*smoothstep(1.0,.65,r)*fade*wisps;vec3 color=mix(vec3(.014,.016,.018),vec3(.32,.34,.36),smoothstep(.28,.9,r));gl_FragColor=vec4(color,a);}`,transparent:true,depthWrite:false,depthTest:false});
const particles=new THREE.Points(smokeGeo,smokeMat);particles.name='Fumo animato';particles.frustumCulled=false;particles.renderOrder=16;smokeMat.stencilWrite=true;smokeMat.stencilFunc=THREE.NotEqualStencilFunc;smokeMat.stencilRef=1;model.add(particles);
// Sample the airway curves once, rather than rebuilding thousands of vectors per frame.
const routeSamples=flowPaths.map(c=>c.getSpacedPoints(160));
const ambientPos=new Float32Array(120*3),ambientGeo=new THREE.BufferGeometry();ambientGeo.setAttribute('position',new THREE.BufferAttribute(ambientPos,3));
const ambientSmoke=new THREE.Points(ambientGeo,new THREE.PointsMaterial({color:0x6b7670,map:smokeTexture,size:.27,transparent:true,opacity:.075,depthWrite:false}));scene.add(ambientSmoke);
// Exhaled smoke catches the light; it is distinct from the dark X-ray flow.
const exhaleCount=440,exhalePositions=new Float32Array(exhaleCount*3),exhaleAlpha=new Float32Array(exhaleCount),exhaleSize=new Float32Array(exhaleCount);
const exhaleGeo=new THREE.BufferGeometry();exhaleGeo.setAttribute('position',new THREE.BufferAttribute(exhalePositions,3));exhaleGeo.setAttribute('alpha',new THREE.BufferAttribute(exhaleAlpha,1));exhaleGeo.setAttribute('size',new THREE.BufferAttribute(exhaleSize,1));
const exhaleMat=smokeMat.clone();exhaleMat.stencilWrite=false;exhaleMat.depthTest=true;
exhaleMat.fragmentShader=exhaleMat.fragmentShader.replace('vec3(.014,.016,.018),vec3(.32,.34,.36)','vec3(.29,.35,.32),vec3(.58,.64,.6)');
const exhaledSmoke=new THREE.Points(exhaleGeo,exhaleMat);exhaledSmoke.name='Espirazione visibile dalla bocca';exhaledSmoke.frustumCulled=false;scene.add(exhaledSmoke);
const floor=new THREE.Mesh(new THREE.CircleGeometry(2.8,80),new THREE.MeshBasicMaterial({color:0xa6b3a4,transparent:true,opacity:.12}));floor.rotation.x=-Math.PI/2;floor.position.y=.44;scene.add(floor);const ring=new THREE.Mesh(new THREE.TorusGeometry(2.02,.008,5,100),new THREE.MeshBasicMaterial({color:0x446260,transparent:true,opacity:.45}));ring.rotation.x=Math.PI/2;ring.position.y=.45;ring.visible=false;scene.add(ring);
let running=!matchMedia('(prefers-reduced-motion: reduce)').matches,time=0,last=performance.now(),damage=true;
document.addEventListener('visibilitychange',()=>{last=performance.now()});
let destination=null;function focus(pos,target){destination={pos:new THREE.Vector3(...pos),target:new THREE.Vector3(...target)}}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{const v=b.dataset.view;if(v==='mouth')focus([2.1,5.1,5],[0,4.5,.3]);else if(v==='lungs')focus([1.9,3.3,6.8],[0,2.85,0]);else focus([1,2.6,3.5],[.5,2.5,.2])});
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{damage=b.dataset.mode==='1';document.querySelectorAll('[data-mode]').forEach(x=>(x.classList.toggle('active',x===b),x.setAttribute('aria-pressed',x===b)));damageGroup.visible=damage;anatomy.airway.color.set(damage?0xb24f40:0xe0b2a1);anatomy.airway.opacity=damage?.96:.82;lungMat.color.set(damage?0x70453d:0xd19a96);alveoliMat.color.set(damage?0xbd725b:0xe5b2aa);document.querySelector('#effect-title').textContent=damage?'Small air sacs. Lasting harm.':'Built for every breath.';document.querySelector('#effect-text').textContent=damage?'Smoking can inflame airways and damage the delicate walls of the air sacs. Dark areas illustrate harm; they are not a clinical measurement.':'Alveoli are tiny air sacs where oxygen enters the blood and carbon dioxide leaves it.';document.querySelector('#key-text').textContent=damage?'Dark areas represent harm symbolically':'Reference tissue shown in pink'});
document.querySelector('#download').onclick=async e=>{const b=e.currentTarget;b.disabled=true;b.textContent='Exporting…';try{const exporter=new GLTFExporter();const tracks=[],times=[];const samples=new Map(human.moving.map(o=>[o,{position:[],quaternion:[],scale:[]}]));for(let f=0;f<=120;f++){const t=f*.1;times.push(t);human.update(t);for(const o of human.moving){const v=samples.get(o);o.position.toArray(v.position,v.position.length);o.quaternion.toArray(v.quaternion,v.quaternion.length);o.scale.toArray(v.scale,v.scale.length)}}for(const o of human.moving){const v=samples.get(o);tracks.push(new THREE.VectorKeyframeTrack(o.name+'.position',times,v.position),new THREE.QuaternionKeyframeTrack(o.name+'.quaternion',times,v.quaternion),new THREE.VectorKeyframeTrack(o.name+'.scale',times,v.scale))}human.update(time);const clip=new THREE.AnimationClip('Gesto della sigaretta',12,tracks);const bakedSmoke=new THREE.Group();bakedSmoke.name='Fumo nero animato';model.add(bakedSmoke);const smokeMeshes=[];const geo=new THREE.SphereGeometry(.048,6,4);const mat=new THREE.MeshStandardMaterial({color:0x1c1713,transparent:true,opacity:.38,roughness:1});for(let i=0;i<60;i++){const o=new THREE.Mesh(geo,mat);o.name='Fumo_'+i;bakedSmoke.add(o);smokeMeshes.push(o)}const smokeSamples=Array.from({length:60},()=>({pp:[],ss:[]}));for(let f=0;f<=120;f++){updateScene(f*.1);for(let i=0;i<60;i++){const k=i*Math.floor(count/60),x=positions[k*3],y=positions[k*3+1],z=positions[k*3+2];smokeSamples[i].pp.push(x,y < -20?0:y,z);const size=y < -20?.0001:1;smokeSamples[i].ss.push(size,size,size)}}for(let i=0;i<60;i++){tracks.push(new THREE.VectorKeyframeTrack('Fumo_'+i+'.position',times,smokeSamples[i].pp),new THREE.VectorKeyframeTrack('Fumo_'+i+'.scale',times,smokeSamples[i].ss))}const fullClip=new THREE.AnimationClip('Gesto e inalazione',12,tracks);const exportHalos=[];model.traverse(o=>{if(o.material===anatomy.glowMat||o.name==='Occlusione del braccio davanti alla vista anatomica'){exportHalos.push(o);o.visible=false}});particles.visible=false;let data;try{data=await exporter.parseAsync(model,{binary:true,onlyVisible:true,animations:[fullClip]})}finally{for(const o of exportHalos)o.visible=true;particles.visible=true;model.remove(bakedSmoke);geo.dispose();mat.dispose();updateScene(time)}const url=URL.createObjectURL(new Blob([data],{type:'model/gltf-binary'}));const a=document.createElement('a');a.href=url;a.download='respiro-3d-animato.glb';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)}catch(err){console.error(err);alert('Export failed. Please try again.')}finally{b.disabled=false;b.textContent='↓ Download 3D model'}};
function resize(){camera.aspect=stage.clientWidth/stage.clientHeight;camera.fov=camera.aspect<.62?40:34;camera.updateProjectionMatrix();renderer.setSize(stage.clientWidth,stage.clientHeight);smokeMat.uniforms.pixelScale.value=stage.clientHeight*renderer.getPixelRatio()*1.63;exhaleMat.uniforms.pixelScale.value=smokeMat.uniforms.pixelScale.value}new ResizeObserver(resize).observe(stage);resize();document.querySelector('#loading').remove();
const phaseLabel=document.querySelector('#phase'),statusLabel=document.querySelector('#lung-status'),puffLabel=document.querySelector('#puff-count'),buildupBar=document.querySelector('#buildup');
const alveoliPink=new THREE.Color(0xe5b2aa),alveoliDark=new THREE.Color(0x28201d);
function labelText(element,value){if(element.textContent!==value)element.textContent=value;}
function updateScene(time){
 const state=human.update(time),cycle=smokingCycle(time),{t,puff,load,reset}=cycle;
 labelText(phaseLabel,reset>0?'NEW CYCLE':t<2.5?'RAISING THE CIGARETTE':t<5.5?'INHALE · SMOKE ENTERS THE AIRWAYS':t<7.75?'HOLD · SMOKE SPREADS':t<11.4?'EXHALE · RELEASE THE BREATH':'REST');
 for(let i=0;i<count;i++){
  const birth=2.55+(i/count)*2.6,age=t-birth,progress=age/2.15,path=routeSamples[i%routeSamples.length];
  let x=0,y=-100,z=0,alpha=0,size=.14;
  if(age>=0&&age<5.6){
   const q=Math.min(1,progress),sample=q*160,j=Math.min(159,Math.floor(sample)),f=sample-j;
   const a=path[j],b=path[j+1];x=a.x+(b.x-a.x)*f;y=a.y+(b.y-a.y)*f;z=a.z+(b.z-a.z)*f;
   const inLung=THREE.MathUtils.smoothstep(q,.58,.9),spread=.035+inLung*.12;
   x+=Math.sin(i*2.39+age*2.1)*spread;y+=Math.cos(i*1.71+age*1.5)*spread*.8;z+=Math.sin(i*3.13-age*1.6)*spread;
   alpha=.08*THREE.MathUtils.smoothstep(age,0,.2)*(1-THREE.MathUtils.smoothstep(age,3.5,5.6));size=.16+inLung*.18;
  }
  positions[i*3]=x;positions[i*3+1]=y;positions[i*3+2]=z;opacities[i]=alpha;sizes[i]=size;
 }
 smokeGeo.attributes.position.needsUpdate=true;smokeGeo.attributes.alpha.needsUpdate=true;smokeGeo.attributes.size.needsUpdate=true;smokeMat.uniforms.clock.value=time;
 for(let i=0;i<120;i++){const f=(i/120+time*.15)%1;ambientPos[i*3]=state.tip.x+Math.sin(f*9-time*.9)*f*.17+Math.sin(i*2.3)*f*.07;ambientPos[i*3+1]=state.tip.y+f*1.05;ambientPos[i*3+2]=state.tip.z+Math.cos(f*5+time)*f*.12;}ambientGeo.attributes.position.needsUpdate=true;
 const breath=breathCycle(time),inhale=breath.expansion;
 for(let i=0;i<exhaleCount;i++){
  const emission=7.75+i/exhaleCount*2.0,age=t-emission;
  let x=0,y=-100,z=0,alpha=0,size=.1;
  if(age>0&&age<2.2){
   const travel=age*1.05,spread=.022+travel*.19;
   x=state.mouth.x-travel*.14+Math.sin(i*2.399+age*1.6)*spread;
   y=state.mouth.y+travel*travel*.12+Math.cos(i*3.17+age)*spread*.65;
   z=state.mouth.z+.035+travel;
   size=.11+age*.32;
   alpha=.11*THREE.MathUtils.smoothstep(age,0,.14)*(1-THREE.MathUtils.smoothstep(age,1.1,2.2))*Math.sin(Math.PI*(i+.5)/exhaleCount);
  }
  exhalePositions[i*3]=x;exhalePositions[i*3+1]=y;exhalePositions[i*3+2]=z;exhaleAlpha[i]=alpha;exhaleSize[i]=size;
 }
 exhaleGeo.attributes.position.needsUpdate=true;exhaleGeo.attributes.alpha.needsUpdate=true;exhaleGeo.attributes.size.needsUpdate=true;exhaleMat.uniforms.clock.value=time;
 const darkness=damage?load:0;anatomy.accumulation.value=darkness;
 anatomy.glowMat.uniforms.strength.value=inhale*.62;anatomy.glowMat.uniforms.tint.value.set(0xe88356);
 lungMat.color.set(0xd19a96);lungMat.emissive.set(0x863529);lungMat.emissiveIntensity=inhale*.14*(1-darkness);
 lungMat.opacity=.8+darkness*.17;lungMat.roughness=.54+darkness*.4;
 alveoliMat.color.copy(alveoliPink).lerp(alveoliDark,darkness);damageGroup.visible=damage;anatomy.damageMat.opacity=darkness*.75;anatomy.damageMat.emissiveIntensity=0;
 lungGroup.scale.set(1+inhale*.022,1+inhale*.004,1+inhale*.035);
 const status=statusLabel;labelText(status,`PUFF ${puff+1} / 4 · ${reset>0?'RESET':damage?'SMOKE BUILDUP':'REFERENCE'} · ILLUSTRATIVE TIMING`);status.classList.toggle('active',inhale>.2);
 labelText(puffLabel,`${puff+1} / 4`);buildupBar.style.width=`${darkness*100}%`;
}
let renderedTime=-1,renderedDamage=null;
function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.05);last=now;if(running)time+=dt;if(time!==renderedTime||damage!==renderedDamage){updateScene(time);renderedTime=time;renderedDamage=damage;}if(destination){const blend=1-Math.exp(-5*dt);camera.position.lerp(destination.pos,blend);controls.target.lerp(destination.target,blend);if(camera.position.distanceTo(destination.pos)<.01)destination=null}controls.update();renderer.render(scene,camera)}requestAnimationFrame(animate);
window.respiro={scene,model,renderer,camera};

document.querySelector('#present').onclick=e=>{const on=document.body.classList.toggle('presentation');e.currentTarget.setAttribute('aria-pressed',on);e.currentTarget.textContent=on?'↙ Full experience':'⛶ Focus mode';resize()};

document.querySelector('[data-mode="1"]').click();
