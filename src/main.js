import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';

const app=document.querySelector('#game'); app.focus({preventScroll:true});
const scene=new THREE.Scene(); scene.background=new THREE.Color(0x040606); scene.fog=new THREE.FogExp2(0x040606,.028);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.7)); renderer.setSize(innerWidth,innerHeight); renderer.shadowMap.enabled=false; renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.22; app.prepend(renderer.domElement);

const camera=new THREE.OrthographicCamera(-6,6,6,-6,.1,80); camera.position.set(0,16,5.2); camera.lookAt(0,0,0);
const controls=new OrbitControls(camera,renderer.domElement); controls.enableDamping=true; controls.dampingFactor=.07; controls.enablePan=false; controls.minZoom=.75; controls.maxZoom=1.65; controls.minPolarAngle=.12; controls.maxPolarAngle=.52; controls.target.set(0,.2,0); controls.mouseButtons.LEFT=THREE.MOUSE.ROTATE; controls.update();

scene.add(new THREE.HemisphereLight(0xa9a79d,0x111513,1.65));
const sun=new THREE.DirectionalLight(0xe2c69c,3.7); sun.position.set(-6,13,7); sun.castShadow=false;scene.add(sun);
const cool=new THREE.DirectionalLight(0x596b78,1.35);cool.position.set(7,7,-8);scene.add(cool);

const M={
  stone:new THREE.MeshStandardMaterial({color:0x353c37,emissive:0x080a08,emissiveIntensity:.22,roughness:.91,metalness:.03}), stoneDark:new THREE.MeshStandardMaterial({color:0x202622,emissive:0x040504,emissiveIntensity:.18,roughness:.96}),
  iron:new THREE.MeshStandardMaterial({color:0x777b7a,roughness:.31,metalness:.86}), steel:new THREE.MeshStandardMaterial({color:0xa9adaa,roughness:.22,metalness:.92}),
  leather:new THREE.MeshStandardMaterial({color:0x4a2c20,roughness:.72}), darkLeather:new THREE.MeshStandardMaterial({color:0x211b19,roughness:.82}),
  skin:new THREE.MeshStandardMaterial({color:0xa97156,roughness:.72}), red:new THREE.MeshStandardMaterial({color:0x682b25,roughness:.76}),
  green:new THREE.MeshStandardMaterial({color:0x34443a,roughness:.82}), blue:new THREE.MeshStandardMaterial({color:0x263a4a,roughness:.78}),
  wood:new THREE.MeshStandardMaterial({color:0x5b3821,roughness:.7}), cloth:new THREE.MeshStandardMaterial({color:0x29282d,roughness:.92}),
  gold:new THREE.MeshStandardMaterial({color:0xb08a43,roughness:.32,metalness:.76}), void:new THREE.MeshStandardMaterial({color:0x030405,roughness:1}),
  magic:new THREE.MeshBasicMaterial({color:0x9473ff}), base:new THREE.MeshStandardMaterial({color:0x181d1b,roughness:.72,metalness:.25})
};
function add(geo,mat,parent,pos=[0,0,0],rot=[0,0,0],scale=[1,1,1]){const o=new THREE.Mesh(geo,mat);o.position.set(...pos);o.rotation.set(...rot);o.scale.set(...scale);o.castShadow=false;o.receiveShadow=false;parent.add(o);return o}
function capsule(r,l,mat,parent,pos,rot=[0,0,0]){return add(new THREE.CapsuleGeometry(r,l,12,20),mat,parent,pos,rot)}
function unitBase(parent,color=0xb08a43){add(new THREE.CylinderGeometry(.54,.59,.15,48),M.base,parent,[0,.08,0]); const ringMat=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.18,metalness:.6,roughness:.34}); const ring=add(new THREE.TorusGeometry(.49,.027,12,48),ringMat,parent,[0,.17,0],[-Math.PI/2,0,0]);ring.name='selectionRing'}
function humanoidBase(name,role,color,stats){const root=new THREE.Group();root.name=name;root.userData={selectable:true,name,role,color,...stats};unitBase(root,color);const rig=new THREE.Group();rig.name='rig';rig.position.y=.18;root.add(rig);return{root,rig}}

function makeWarrior(){
  const {root,rig}=humanoidBase('Sir Aldren','GUERREIRO',0xb55746,{hp:85,maxHp:85,damage:14,move:3,cost:'3',ability:'Muralha de Ferro',abilityUsed:false,description:'Ergue o escudo e reduz pela metade o próximo dano recebido.'});
  capsule(.27,.72,M.red,rig,[0,1.18,0]); add(new THREE.CylinderGeometry(.31,.37,.52,24),M.iron,rig,[0,1.44,0]);
  add(new THREE.TorusGeometry(.30,.045,10,32),M.gold,rig,[0,1.17,0],[Math.PI/2,0,0]);
  add(new THREE.SphereGeometry(.29,24,16),M.skin,rig,[0,2.0,.01]); add(new THREE.SphereGeometry(.34,24,16,0,Math.PI*2,0,Math.PI*.62),M.steel,rig,[0,2.11,0]);
  add(new THREE.BoxGeometry(.42,.09,.08,3,1,1),M.steel,rig,[0,2.07,.30]); add(new THREE.ConeGeometry(.08,.42,10),M.red,rig,[0,2.50,-.03]);
  [-1,1].forEach(s=>{add(new THREE.SphereGeometry(.24,20,14),M.iron,rig,[s*.39,1.62,0],[0,0,0],[1,.75,1]);capsule(.105,.52,M.skin,rig,[s*.47,1.24,.03],[0,0,s*.15]);capsule(.13,.34,M.iron,rig,[s*.5,.98,.05],[0,0,s*.08]);capsule(.13,.53,M.darkLeather,rig,[s*.18,.48,0]);});
  // shield, sword and cape
  const shield=add(new THREE.CylinderGeometry(.45,.45,.10,32),M.iron,rig,[-.63,1.25,.05],[Math.PI/2,0,.16],[.78,1,1]);add(new THREE.ConeGeometry(.13,.7,12),M.gold,shield,[0,.05,0]);
  add(new THREE.BoxGeometry(.07,1.22,.035),M.steel,rig,[.67,1.2,.12],[0,0,-.12]);add(new THREE.BoxGeometry(.38,.07,.07),M.gold,rig,[.67,1.67,.12],[0,0,-.12]);
  const cape=add(new THREE.ConeGeometry(.46,1.45,20,4,true),M.red,rig,[0,1.15,-.28],[0,0,0],[1,1,.45]); cape.material.side=THREE.DoubleSide;
  root.rotation.y=-.28;return root;
}

function bowGeometry(){const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,-.65,0),new THREE.Vector3(.22,-.32,0),new THREE.Vector3(.28,0,0),new THREE.Vector3(.22,.32,0),new THREE.Vector3(0,.65,0)]);return new THREE.TubeGeometry(curve,32,.027,10,false)}
function makeArcher(){
  const {root,rig}=humanoidBase('Lyra Folha-Cinza','ARQUEIRA',0x66866b,{hp:62,maxHp:62,damage:16,move:4,cost:'4',ability:'Chuva de Flechas',abilityUsed:false,description:'Dispara sobre até três casas adjacentes à distância.'});
  capsule(.23,.72,M.green,rig,[0,1.14,0]);add(new THREE.ConeGeometry(.38,.85,24,4),M.green,rig,[0,.72,0]);
  add(new THREE.TorusGeometry(.26,.035,10,28),M.leather,rig,[0,1.10,0],[Math.PI/2,0,0]);
  add(new THREE.SphereGeometry(.255,24,16),M.skin,rig,[0,1.94,.02]);add(new THREE.SphereGeometry(.31,24,16,0,Math.PI*2,0,Math.PI*.58),M.green,rig,[0,2.05,-.02]);add(new THREE.ConeGeometry(.22,.62,20,3),M.green,rig,[0,2.26,-.13],[-.42,0,0]);
  [-1,1].forEach(s=>{capsule(.095,.56,M.leather,rig,[s*.36,1.28,.08],[0,0,s*.3]);capsule(.11,.5,M.darkLeather,rig,[s*.16,.47,0]);});
  add(bowGeometry(),M.wood,rig,[.58,1.28,.12],[0,.2,-.12]);add(new THREE.BoxGeometry(.012,1.28,.012),M.steel,rig,[.58,1.28,.12],[0,.2,-.12]);
  // quiver and arrows
  add(new THREE.CylinderGeometry(.13,.17,.83,20),M.leather,rig,[-.28,1.3,-.24],[-.18,0,-.25]);
  for(let i=0;i<5;i++){add(new THREE.CylinderGeometry(.012,.012,.62,8),M.wood,rig,[-.37+i*.052,1.79,-.27],[-.18,0,-.25]);add(new THREE.ConeGeometry(.04,.12,8),M.steel,rig,[-.48+i*.052,2.06,-.35],[-.18,0,-.25]);}
  root.rotation.y=.26;return root;
}

function makeMage(){
  const {root,rig}=humanoidBase('Vael do Véu','MAGO',0x7869bd,{hp:55,maxHp:55,damage:18,move:3,cost:'5',ability:'Ruptura Arcana',abilityUsed:true,description:'Rompe as defesas mágicas e causa dano em uma área de duas casas.'});
  add(new THREE.ConeGeometry(.54,1.55,28,5),M.blue,rig,[0,.88,0]);capsule(.25,.55,M.cloth,rig,[0,1.46,0]);
  add(new THREE.TorusGeometry(.34,.07,12,32),M.iron,rig,[0,1.67,0],[Math.PI/2,0,0]);
  add(new THREE.SphereGeometry(.36,24,16),M.cloth,rig,[0,2.07,-.02],[0,0,0],[1,1.1,.94]);add(new THREE.SphereGeometry(.24,20,14),M.void,rig,[0,2.03,.29],[0,0,0],[.78,1,.38]);
  add(new THREE.IcosahedronGeometry(.035,0),M.magic,rig,[-.08,2.06,.39]);add(new THREE.IcosahedronGeometry(.035,0),M.magic,rig,[.08,2.06,.39]);
  [-1,1].forEach(s=>{add(new THREE.ConeGeometry(.25,.55,16,3),M.iron,rig,[s*.34,1.58,0],[0,0,s*-.55]);capsule(.09,.57,M.cloth,rig,[s*.41,1.18,.06],[0,0,s*.14]);});
  // staff, metal crown and floating crystal
  add(new THREE.CylinderGeometry(.025,.038,2.22,16),M.wood,rig,[.62,1.13,.08],[0,0,-.04]);add(new THREE.TorusGeometry(.17,.025,10,32),M.gold,rig,[.66,2.19,.08],[Math.PI/2,0,0]);
  const crystal=add(new THREE.OctahedronGeometry(.15,0),M.magic,rig,[.66,2.23,.08]);crystal.userData.magic=true;
  root.rotation.y=-.12;return root;
}

// 15x15 raised stone board with alternating slabs.
const board=new THREE.Group();const N=15,tile=1.08,half=(N-1)*tile/2;
add(new THREE.BoxGeometry(N*tile+1.0,.45,N*tile+1.0),M.stoneDark,board,[0,-.32,0]);
for(let z=0;z<N;z++)for(let x=0;x<N;x++){
  const mat=(x+z)%2===0?M.stone:M.stoneDark;const slab=add(new THREE.BoxGeometry(tile-.025,.18,tile-.025),mat,board,[x*tile-half,-.04,z*tile-half]);slab.position.y+=((x*17+z*11)%5)*.004;slab.rotation.y=((x*7+z*3)%3-1)*.003;
}
// Iron braziers anchor the four corners of the ruined board.
for(const x of [-1,1])for(const z of [-1,1]){
  const bx=x*(half+.39),bz=z*(half+.39);add(new THREE.CylinderGeometry(.12,.16,.24,12),M.iron,board,[bx,.12,bz]);
  add(new THREE.ConeGeometry(.08,.22,10),new THREE.MeshBasicMaterial({color:0xc06932}),board,[bx,.34,bz]);
  const ember=new THREE.PointLight(0x9c3f1d,2.2,2.4,2);ember.position.set(bx,.55,bz);scene.add(ember);
}

// Compact keeps mark each king's side without hiding the board from the
// top-down camera. They are presentation pieces only in this visual build.
function makeKeep(accent,enemy=false){
  const keep=new THREE.Group();
  const themeStone=new THREE.MeshStandardMaterial({color:enemy?0x3b2323:0x2b3438,roughness:.84,metalness:.08});
  const themeDark=new THREE.MeshStandardMaterial({color:enemy?0x1e0d0f:0x121a1e,roughness:.92,metalness:.12});
  const roofMat=new THREE.MeshStandardMaterial({color:enemy?0x57191b:0x263a46,roughness:.46,metalness:.48});
  const bannerMat=new THREE.MeshStandardMaterial({color:accent,roughness:.72,side:THREE.DoubleSide});
  const glowMat=new THREE.MeshBasicMaterial({color:enemy?0xd34b38:0x6fa9c7});

  // The square foundation is 3 tiles wide (3 × 1.08), leaving a tiny seam
  // around the footprint so the occupied cells remain readable.
  add(new THREE.BoxGeometry(tile*3-.07,.2,tile*3-.07),M.base,keep,[0,.03,0]);
  add(new THREE.BoxGeometry(tile*3-.18,.12,tile*3-.18),themeDark,keep,[0,.18,0]);
  add(new THREE.BoxGeometry(2.86,.78,.26),themeStone,keep,[0,.64,-1.38]);
  add(new THREE.BoxGeometry(2.86,.78,.26),themeStone,keep,[0,.64,1.38]);
  add(new THREE.BoxGeometry(.26,.78,2.86),themeStone,keep,[-1.38,.64,0]);
  add(new THREE.BoxGeometry(.26,.78,2.86),themeStone,keep,[1.38,.64,0]);

  // Gate, murder-hole and an illuminated crest on the front wall.
  add(new THREE.BoxGeometry(.68,.62,.08),M.void,keep,[0,.48,1.53]);
  add(new THREE.TorusGeometry(.34,.08,10,24,Math.PI),themeDark,keep,[0,.79,1.55],[0,0,Math.PI]);
  add(new THREE.OctahedronGeometry(.1,0),glowMat,keep,[0,1.04,1.55]);

  for(const p of [-1.12,-.56,0,.56,1.12]){
    add(new THREE.BoxGeometry(.26,.22,.3),themeDark,keep,[p,1.12,-1.4]);add(new THREE.BoxGeometry(.26,.22,.3),themeDark,keep,[p,1.12,1.4]);
    if(Math.abs(p)>.2){add(new THREE.BoxGeometry(.3,.22,.26),themeDark,keep,[-1.4,1.12,p]);add(new THREE.BoxGeometry(.3,.22,.26),themeDark,keep,[1.4,1.12,p]);}
  }

  // Central keep and four corner towers create a true castle silhouette.
  add(new THREE.BoxGeometry(1.18,1.5,1.18,3,4,3),themeStone,keep,[0,1.02,0]);
  for(const x of [-.46,0,.46])for(const z of [-.46,.46])add(new THREE.BoxGeometry(.22,.25,.22),themeDark,keep,[x,1.9,z]);
  for(const x of [-1.23,1.23])for(const z of [-1.23,1.23]){
    if(enemy){
      add(new THREE.BoxGeometry(.62,1.58,.62,2,4,2),themeStone,keep,[x,1.02,z]);
      add(new THREE.ConeGeometry(.5,.88,4),roofMat,keep,[x,2.24,z],[0,Math.PI/4,0]);
      for(const s of [-1,1])add(new THREE.ConeGeometry(.07,.55,6),glowMat,keep,[x+s*.2,2.52,z],[0,0,s*.2]);
    }else{
      add(new THREE.CylinderGeometry(.39,.45,1.48,10),themeStone,keep,[x,.98,z]);
      add(new THREE.ConeGeometry(.52,.72,10),roofMat,keep,[x,2.08,z]);
      add(new THREE.OctahedronGeometry(.09,0),glowMat,keep,[x,2.48,z]);
    }
  }

  add(new THREE.CylinderGeometry(.035,.035,1.3,10),M.iron,keep,[0,2.48,.12]);
  add(new THREE.PlaneGeometry(.58,.76,3,3),bannerMat,keep,[.31,2.68,.13],[0,enemy?Math.PI:0,0]);
  if(enemy){
    add(new THREE.ConeGeometry(.34,1.42,5),roofMat,keep,[0,2.52,0],[0,Math.PI/5,0]);
    for(const s of [-1,1])add(new THREE.TorusGeometry(.28,.045,7,24,Math.PI*1.25),M.iron,keep,[s*.72,1.32,.64],[Math.PI/2,s*.3,0]);
  }else{
    add(new THREE.ConeGeometry(.42,1.05,8),roofMat,keep,[0,2.42,0]);
    for(const s of [-1,1])add(new THREE.BoxGeometry(.78,.1,.22),roofMat,keep,[s*.47,2.05,.03],[0,s*.22,s*.28]);
    add(new THREE.OctahedronGeometry(.17,0),glowMat,keep,[0,3.02,0]);
  }
  keep.name=enemy?'Castelo Carmesim':'Fortaleza do Corvo';
  keep.userData={hoverable:true,name:keep.name,role:'BASE 3×3 · NÍVEL 1',hp:enemy?16:18,maxHp:20,damage:0,move:0,cost:'—',ability:enemy?'Pacto de Sangue':'Vigia do Corvo',abilityUsed:false,description:enemy?'As torres carmesins fortalecem tropas feridas próximas.':'As sentinelas do corvo revelam invasores nas casas vizinhas.'};
  keep.rotation.y=enemy?Math.PI:0;
  return keep;
}
const alliedKeep=makeKeep(0x3d5974),enemyKeep=makeKeep(0x7b2825,true);
alliedKeep.position.set(0,.06,half-tile*2);enemyKeep.position.set(0,.06,-half+tile*2);board.add(alliedKeep,enemyKeep);

// A ruined, misty valley frames the game board while keeping every tile clear.
const environment=new THREE.Group(),wisps=[];
const earth=new THREE.MeshStandardMaterial({color:0x0c110e,emissive:0x010201,emissiveIntensity:.25,roughness:1}),ashStone=new THREE.MeshStandardMaterial({color:0x353c36,roughness:.98}),deadWood=new THREE.MeshStandardMaterial({color:0x463126,emissive:0x080504,emissiveIntensity:.28,roughness:1});
add(new THREE.CircleGeometry(19,72),earth,environment,[0,-.58,0],[-Math.PI/2,0,0],[1,.78,1]);
add(new THREE.RingGeometry(8.8,11.8,72),new THREE.MeshStandardMaterial({color:0x171d19,roughness:1}),environment,[0,-.55,0],[-Math.PI/2,0,0],[1,.82,1]);

function deadTree(x,z,scale=1,twist=0){
  const tree=new THREE.Group();tree.position.set(x,-.52,z);tree.rotation.y=twist;tree.scale.setScalar(scale);
  add(new THREE.CylinderGeometry(.09,.18,1.65,9),deadWood,tree,[0,.82,0],[0,0,.08]);
  [[-.42,1.2,.35],[.4,1.05,-.45],[-.3,.72,-.62]].forEach(([bx,by,rz],i)=>{add(new THREE.CylinderGeometry(.035,.075,.85-i*.12,7),deadWood,tree,[bx*.48,by,0],[0,0,rz]);add(new THREE.ConeGeometry(.025,.28,6),deadWood,tree,[bx,by+.28,0],[0,0,rz]);});
  environment.add(tree);
}
[[-10.3,-6.3,1.15,.2],[-11.2,-1.2,.85,-.5],[-10.1,4.6,1.05,.7],[10.5,-5.2,1,.1],[11.1,.2,1.2,-.35],[9.9,5.7,.88,.8],[-5.8,-9.5,.78,.4],[6.4,9.3,.92,-.2]].forEach(p=>deadTree(...p));

function brokenPillar(x,z,height=1.35,lean=0){
  const ruin=new THREE.Group();ruin.position.set(x,-.53,z);ruin.rotation.z=lean;
  add(new THREE.CylinderGeometry(.25,.32,.18,10),ashStone,ruin,[0,.09,0]);add(new THREE.CylinderGeometry(.2,.23,height,10),ashStone,ruin,[0,.18+height/2,0]);
  add(new THREE.CylinderGeometry(.3,.23,.15,10),ashStone,ruin,[0,height+.2,0],[.12,.08,0]);environment.add(ruin);
}
[[-9.25,-3.4,1.5,.08],[-9.6,2.8,.9,-.13],[9.35,-2.6,1.2,.12],[9.7,3.7,1.65,-.06],[-4.2,9.2,.75,.16],[4.7,-9.15,1.05,-.12]].forEach(p=>brokenPillar(...p));

const rockSpots=[[-12,-7,.75],[-11,7,.55],[-8.9,-8.6,.6],[-7.6,9.3,.75],[-3.1,-9.4,.42],[2.2,9.6,.5],[8.7,-8.8,.72],[11.8,-6,.48],[11.5,6.8,.65],[-12.2,2.8,.45],[12,-1.6,.52]];
rockSpots.forEach(([x,z,s],i)=>{const rock=add(new THREE.DodecahedronGeometry(s,0),ashStone,environment,[x,-.42+s*.35,z],[i*.17,i*.31,i*.11],[1,.55,.8]);rock.rotation.y=i*.74;});

function graveStone(x,z,rotation=0){
  const grave=new THREE.Group();grave.position.set(x,-.5,z);grave.rotation.y=rotation;
  add(new THREE.BoxGeometry(.48,.55,.16,2,2,1),ashStone,grave,[0,.3,0],[0,0,.04]);add(new THREE.SphereGeometry(.24,12,7,0,Math.PI*2,0,Math.PI/2),ashStone,grave,[0,.58,0]);
  add(new THREE.BoxGeometry(.24,.035,.018),M.iron,grave,[0,.37,.09]);add(new THREE.BoxGeometry(.035,.25,.018),M.iron,grave,[0,.37,.09]);environment.add(grave);
}
[[-8.8,-5.7,.2],[-8.9,1.1,-.1],[-8.7,6.3,.15],[8.7,-6.2,-.2],[8.9,.9,.12],[8.75,5.4,-.08]].forEach(p=>graveStone(...p));

// Two ruined watchfires create warm landmarks in the otherwise cold valley.
for(const [x,z] of [[-9.2,0],[9.2,0]]){
  add(new THREE.CylinderGeometry(.22,.29,.3,12),M.iron,environment,[x,-.35,z]);add(new THREE.ConeGeometry(.14,.38,9),new THREE.MeshBasicMaterial({color:0xb65a2b}),environment,[x,.02,z]);
  const fire=new THREE.PointLight(0xb5532c,3.1,4.2,2);fire.position.set(x,.35,z);scene.add(fire);
}
for(let i=0;i<6;i++){
  const mistMat=new THREE.MeshBasicMaterial({color:0x718379,transparent:true,opacity:.012+i*.003,depthWrite:false,side:THREE.DoubleSide});
  const mist=add(new THREE.CircleGeometry(1.6+i*.18,32),mistMat,environment,[(i%2?1:-1)*(8.7+(i%3)), -.43, -7.2+i*2.8],[-Math.PI/2,0,0],[1.8,.7,1]);mist.userData={mist:true,index:i,baseX:mist.position.x};wisps.push(mist);
}
scene.add(environment);
scene.add(board);

// Each miniature is snapped to the exact center of a tile. Scale 0.64 keeps
// even the outermost weapon silhouette inside the 1.08 × 1.08 footprint.
const units=[makeMage(),makeWarrior(),makeArcher()]; units[0].position.set(-2.16,.06,0);units[1].position.set(0,.06,0);units[2].position.set(2.16,.06,0);units.forEach(u=>{u.scale.setScalar(.64);u.userData.hoverable=true;scene.add(u)});
const hoverables=[...units,alliedKeep,enemyKeep];

// Selection and unit status HUD.
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let selected=null,dragged=null,dragMoved=false,justDragged=false;
const boardPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
const dragPoint=new THREE.Vector3();
const tileMarker=add(new THREE.PlaneGeometry(tile*.9,tile*.9),new THREE.MeshBasicMaterial({color:0xcaa45d,transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide}),scene,[0,.075,0],[-Math.PI/2,0,0]);
tileMarker.visible=false;
function unitAtPointer(e){
  const rect=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-rect.left)/rect.width)*2-1;pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;ray.setFromCamera(pointer,camera);
  const hits=ray.intersectObjects(units,true);if(!hits.length)return null;let u=hits[0].object;while(u.parent&&!u.userData.selectable)u=u.parent;return u.userData.selectable?u:null;
}
function hoverableAtPointer(e){
  const rect=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-rect.left)/rect.width)*2-1;pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;ray.setFromCamera(pointer,camera);
  const hits=ray.intersectObjects(hoverables,true);if(!hits.length)return null;let o=hits[0].object;while(o.parent&&!o.userData.hoverable)o=o.parent;return o.userData.hoverable?o:null;
}
function snapToTile(value){return THREE.MathUtils.clamp(Math.round((value+half)/tile)*tile-half,-half,half)}
function selectUnit(u){if(selected)selected.getObjectByName('selectionRing').material.emissiveIntensity=.18;selected=u;selected.getObjectByName('selectionRing').material.emissiveIntensity=1.3}
function pick(e){if(justDragged){justDragged=false;return}const u=unitAtPointer(e);if(u)selectUnit(u)}
function startDrag(e){
  if(e.button!==0)return;const u=unitAtPointer(e);if(!u)return;
  e.preventDefault();e.stopPropagation();dragged=u;dragMoved=false;controls.enabled=false;selectUnit(u);renderer.domElement.setPointerCapture(e.pointerId);
  dragged.position.y=.18;tileMarker.position.set(dragged.position.x,.075,dragged.position.z);tileMarker.visible=true;app.dataset.dragging=dragged.userData.name;
}
function moveDrag(e){
  if(!dragged)return;e.preventDefault();dragMoved=true;
  const rect=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-rect.left)/rect.width)*2-1;pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;ray.setFromCamera(pointer,camera);
  if(ray.ray.intersectPlane(boardPlane,dragPoint)){const x=snapToTile(dragPoint.x),z=snapToTile(dragPoint.z);dragged.position.x=x;dragged.position.z=z;tileMarker.position.set(x,.075,z)}
}
function finishDrag(e){
  if(!dragged)return;e.preventDefault();e.stopPropagation();dragged.position.y=.06;controls.enabled=true;tileMarker.visible=false;
  app.dataset.lastMoved=`${dragged.userData.name}:${dragged.position.x.toFixed(2)},${dragged.position.z.toFixed(2)}`;delete app.dataset.dragging;justDragged=dragMoved;dragged=null;
  if(renderer.domElement.hasPointerCapture(e.pointerId))renderer.domElement.releasePointerCapture(e.pointerId);
}
const hoverCard=document.querySelector('#hover-card');
function showHover(e){
  if(dragged){hoverCard.classList.remove('visible');return}const o=hoverableAtPointer(e);if(!o){hoverCard.classList.remove('visible');hoverCard.setAttribute('aria-hidden','true');return}
  const d=o.userData;document.querySelector('#hover-role').textContent=d.role;document.querySelector('#hover-name').textContent=d.name;
  document.querySelector('#hover-hp').textContent=`${d.hp}/${d.maxHp}`;document.querySelector('#hover-hp-fill').style.width=`${d.hp/d.maxHp*100}%`;
  document.querySelector('#hover-damage').textContent=d.damage;document.querySelector('#hover-move').textContent=d.move;document.querySelector('#hover-cost').textContent=d.cost;
  document.querySelector('#hover-ability').textContent=d.ability;document.querySelector('#hover-description').textContent=d.description;
  const used=document.querySelector('#hover-used');used.textContent=d.abilityUsed?'JÁ USADA':'DISPONÍVEL';used.classList.toggle('used',d.abilityUsed);
  hoverCard.style.left=`${Math.min(e.clientX,innerWidth-255)}px`;hoverCard.style.top=`${Math.min(e.clientY,innerHeight-205)}px`;hoverCard.classList.add('visible');hoverCard.setAttribute('aria-hidden','false');
}
renderer.domElement.addEventListener('click',pick);
renderer.domElement.addEventListener('pointerdown',startDrag,true);
renderer.domElement.addEventListener('pointermove',moveDrag,true);
renderer.domElement.addEventListener('pointermove',showHover);
renderer.domElement.addEventListener('pointerup',finishDrag,true);
renderer.domElement.addEventListener('pointercancel',finishDrag,true);
renderer.domElement.addEventListener('pointerleave',()=>hoverCard.classList.remove('visible'));

let activePlayer=1,round=1;
function roman(n){return ['I','II','III','IV','V','VI','VII','VIII','IX','X'][Math.min(n,10)-1]||n}
function endTurn(){activePlayer=activePlayer===1?2:1;if(activePlayer===1)round++;document.querySelector('#player-one').classList.toggle('active',activePlayer===1);document.querySelector('#player-two').classList.toggle('active',activePlayer===2);document.querySelector('#round-number').textContent=roman(round);document.querySelector('#turn-label').textContent=activePlayer===1?'TURNO DE REI ALDRIC':'TURNO DE REI VAROS';}
document.querySelector('#end-turn').addEventListener('click',endTurn);addEventListener('keydown',e=>{if(e.key==='Enter')endTurn()});

// Fictional card hand. All gameplay fields live in data so new cards can be
// added without changing the HUD markup.
const cards=[
  {name:'Vael do Véu',description:'Um conjurador exilado que transforma as sombras do campo em poder arcano.',hp:55,damage:18,move:3,cost:5,ability:'Ruptura Arcana',abilityText:'Causa 12 de dano em uma área de duas casas e ignora proteção mágica.',rarity:'ÉPICA',rarityClass:'epic',info:'HUMANO · ARCANO',glyph:'✦'},
  {name:'Sir Aldren',description:'Cavaleiro juramentado ao Reino do Corvo e último guardião da muralha norte.',hp:85,damage:14,move:3,cost:3,ability:'Muralha de Ferro',abilityText:'Reduz pela metade o próximo dano recebido por tropas adjacentes.',rarity:'RARA',rarityClass:'rare',info:'HUMANO · GUARDIÃO',glyph:'⚔'},
  {name:'Lyra Folha-Cinza',description:'Batedora das florestas mortas, capaz de atingir inimigos antes de ser vista.',hp:62,damage:16,move:4,cost:4,ability:'Chuva de Flechas',abilityText:'Atinge até três casas adjacentes ao alvo com 8 de dano.',rarity:'INCOMUM',rarityClass:'uncommon',info:'HUMANA · ATIRADORA',glyph:'➶'},
  {name:'Vharok, o Cinzento',description:'Um dragão ancestral despertado pelas guerras entre os reinos mortais.',hp:120,damage:28,move:5,cost:10,ability:'Inferno Antigo',abilityText:'Incendeia uma linha de quatro casas; o fogo permanece por um turno.',rarity:'LENDÁRIA',rarityClass:'legendary',info:'DRAGÃO · VOADOR',glyph:'♞'},
  {name:'Saqueador Grik',description:'Pequeno, veloz e traiçoeiro. Grik luta apenas pelo que consegue roubar.',hp:32,damage:9,move:5,cost:2,ability:'Pilhagem',abilityText:'Ao eliminar uma unidade, devolve 1 ponto de custo ao seu rei.',rarity:'COMUM',rarityClass:'common',info:'GOBLIN · SAQUEADOR',glyph:'♟'},
  {name:'Guardião de Ossos',description:'Uma sentinela reanimada que ainda protege as criptas de um reino esquecido.',hp:78,damage:17,move:2,cost:6,ability:'Juramento da Cripta',abilityText:'Retorna com 25 de vida uma vez após ser eliminado.',rarity:'ÉPICA',rarityClass:'epic',info:'MORTO-VIVO · GUARDIÃO',glyph:'☠'}
];
const deckPreview=document.querySelector('#deck-preview'),deckPile=document.querySelector('.deck-pile');
function previewDeckCard(index){
  const c=cards[index];deckPreview.className=`deck-preview rarity-${c.rarityClass}`;deckPreview.innerHTML=`
    <div class="preview-top"><b class="preview-cost">${c.cost}</b><strong>${c.name}</strong><i class="preview-gem"></i></div>
    <div class="preview-art"><span>${c.glyph}</span></div><p class="preview-description">${c.description}</p>
    <div class="preview-stats"><span><small>VIDA</small><b>${c.hp}</b></span><span><small>DANO</small><b>${c.damage}</b></span><span><small>MOVIMENTO</small><b>${c.move}</b></span></div>
    <div class="preview-ability"><small>HABILIDADE ESPECIAL</small><strong>${c.ability}</strong><p>${c.abilityText}</p></div>
    <div class="preview-info"><span>${c.info}</span><b>${c.rarity}</b></div>`;
  deckPreview.classList.add('visible');deckPreview.setAttribute('aria-hidden','false');
}
function hideDeckPreview(){deckPreview.classList.remove('visible');deckPreview.setAttribute('aria-hidden','true')}
deckPile.querySelectorAll('[data-deck-card]').forEach(card=>{card.addEventListener('pointerenter',()=>previewDeckCard(Number(card.dataset.deckCard)));card.addEventListener('focus',()=>previewDeckCard(Number(card.dataset.deckCard)))});
deckPile.addEventListener('pointerleave',hideDeckPreview);deckPile.addEventListener('focusout',e=>{if(!deckPile.contains(e.relatedTarget))hideDeckPreview()});
document.addEventListener('pointermove',e=>{if(!deckPile.contains(e.target))hideDeckPreview()});
const hand=document.querySelector('#card-hand');
hand.innerHTML=cards.map((c,i)=>`<button class="game-card rarity-${c.rarityClass}" data-card="${i}" aria-label="Carta ${c.name}, ${c.rarity}">
  <span class="card-top"><b class="card-cost">${c.cost}</b><strong class="card-name">${c.name}</strong><i class="card-rarity-gem"></i></span>
  <span class="card-art"><span>${c.glyph}</span></span>
  <p class="card-description">${c.description}</p>
  <span class="card-stats"><span><small>VIDA</small><b>${c.hp}</b></span><span><small>DANO</small><b>${c.damage}</b></span><span><small>MOV.</small><b>${c.move}</b></span></span>
  <span class="card-ability"><small>HABILIDADE</small><strong>${c.ability}</strong><p>${c.abilityText}</p></span>
  <span class="card-info"><span>${c.info}</span><b>${c.rarity}</b></span>
</button>`).join('');
hand.addEventListener('click',e=>{const card=e.target.closest('.game-card');if(!card)return;const wasSelected=card.classList.contains('selected');hand.querySelectorAll('.game-card').forEach(el=>el.classList.remove('selected'));if(!wasSelected)card.classList.add('selected');});

let drawingCard=false,handShift=0;
function drawCardPreview(){
  if(drawingCard)return;drawingCard=true;const deck=document.querySelector('.deck-pile').getBoundingClientRect(),target=hand.getBoundingClientRect();
  const ghost=document.createElement('div');ghost.className='draw-card-ghost';ghost.textContent='♜';ghost.style.left=`${deck.left}px`;ghost.style.top=`${deck.top}px`;document.body.appendChild(ghost);
  const dx=target.left+target.width/2-deck.left-36,dy=Math.min(innerHeight-125,target.top+40)-deck.top-53;
  const motion=ghost.animate([{transform:'translate(0,0) rotate(-8deg) scale(.72)',opacity:.35},{offset:.48,transform:`translate(${dx*.52}px,${dy*.35}px) rotate(7deg) scale(1.15)`,opacity:1},{transform:`translate(${dx}px,${dy}px) rotate(0) scale(.9)`,opacity:.15}],{duration:980,easing:'cubic-bezier(.2,.75,.2,1)'});
  motion.onfinish=()=>{const source=hand.querySelector('.game-card');if(source){const clone=source.cloneNode(true);clone.classList.remove('selected');hand.appendChild(clone)}ghost.remove();const count=hand.children.length;document.querySelector('#hand-count').textContent=`${count} CARTAS`;const deckCount=document.querySelector('#deck-count');deckCount.textContent=Math.max(0,Number(deckCount.textContent)-1);hand.classList.add('reflow');setTimeout(()=>hand.classList.remove('reflow'),600);drawingCard=false;};
}
document.querySelector('#draw-card').addEventListener('click',drawCardPreview);
function moveTray(direction){handShift=THREE.MathUtils.clamp(handShift+direction*120,-360,360);hand.style.setProperty('--hand-shift',`${handShift}px`)}
document.querySelector('#tray-prev').addEventListener('click',()=>moveTray(1));document.querySelector('#tray-next').addEventListener('click',()=>moveTray(-1));

const clock=new THREE.Clock();
function animate(){requestAnimationFrame(animate);const t=clock.getElapsedTime();controls.update();units.forEach((u,i)=>{const rig=u.getObjectByName('rig');rig.position.y=.18+Math.sin(t*1.35+i*1.7)*.012;rig.rotation.z=Math.sin(t*.8+i)*.006;u.traverse(o=>{if(o.userData.magic){o.rotation.y=t*1.5;o.position.y=2.23+Math.sin(t*2.5)*.045;}})});wisps.forEach((w,i)=>{w.position.x=w.userData.baseX+Math.sin(t*.12+i)*.55;w.material.opacity=.012+i*.003+Math.sin(t*.35+i)*.004;});renderer.render(scene,camera)}
function resize(){const aspect=innerWidth/innerHeight,view=innerWidth<700?11.2:10.2;camera.left=-view*aspect;camera.right=view*aspect;camera.top=view;camera.bottom=-view;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.7))}addEventListener('resize',resize);resize();animate();setTimeout(()=>document.querySelector('.loading').classList.add('done'),500);
