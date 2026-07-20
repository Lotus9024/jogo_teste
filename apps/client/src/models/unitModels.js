import * as THREE from 'three';

export const M={
  stone:new THREE.MeshStandardMaterial({color:0x353c37,emissive:0x080a08,emissiveIntensity:.22,roughness:.91,metalness:.03}), stoneDark:new THREE.MeshStandardMaterial({color:0x202622,emissive:0x040504,emissiveIntensity:.18,roughness:.96}),
  iron:new THREE.MeshStandardMaterial({color:0x777b7a,roughness:.31,metalness:.86}), steel:new THREE.MeshStandardMaterial({color:0xa9adaa,roughness:.22,metalness:.92}),
  leather:new THREE.MeshStandardMaterial({color:0x4a2c20,roughness:.72}), darkLeather:new THREE.MeshStandardMaterial({color:0x211b19,roughness:.82}),
  skin:new THREE.MeshStandardMaterial({color:0xa97156,roughness:.72}), red:new THREE.MeshStandardMaterial({color:0x682b25,roughness:.76}),
  green:new THREE.MeshStandardMaterial({color:0x34443a,roughness:.82}), blue:new THREE.MeshStandardMaterial({color:0x263a4a,roughness:.78}),
  wood:new THREE.MeshStandardMaterial({color:0x5b3821,roughness:.7}), cloth:new THREE.MeshStandardMaterial({color:0x29282d,roughness:.92}),
  gold:new THREE.MeshStandardMaterial({color:0xb08a43,roughness:.32,metalness:.76}), void:new THREE.MeshStandardMaterial({color:0x030405,roughness:1}),
  magic:new THREE.MeshBasicMaterial({color:0x9473ff}), base:new THREE.MeshStandardMaterial({color:0x181d1b,roughness:.72,metalness:.25})
};
export function add(geo,mat,parent,pos=[0,0,0],rot=[0,0,0],scale=[1,1,1]){const o=new THREE.Mesh(geo,mat);o.position.set(...pos);o.rotation.set(...rot);o.scale.set(...scale);const materials=Array.isArray(mat)?mat:[mat],lit=materials.some(material=>material?.isMeshStandardMaterial||material?.isMeshPhysicalMaterial||material?.isMeshLambertMaterial||material?.isMeshPhongMaterial);o.castShadow=lit;o.receiveShadow=lit;parent.add(o);return o}
function capsule(r,l,mat,parent,pos,rot=[0,0,0]){return add(new THREE.CapsuleGeometry(r,l,12,20),mat,parent,pos,rot)}
export function unitBase(parent,color=0xb08a43){add(new THREE.CylinderGeometry(.54,.59,.15,48),M.base,parent,[0,.08,0]); const ringMat=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.18,metalness:.6,roughness:.34}); const ring=add(new THREE.TorusGeometry(.49,.027,12,48),ringMat,parent,[0,.17,0],[-Math.PI/2,0,0]);ring.name='selectionRing'}
function humanoidBase(name,role,color,stats){const root=new THREE.Group();root.name=name;root.userData={selectable:true,name,role,color,...stats};unitBase(root,color);const rig=new THREE.Group();rig.name='rig';rig.position.y=.18;root.add(rig);return{root,rig}}

export function makeWarrior(){
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
export function makeArcher(){
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

export function makeWoodBarrier(){
  const root=new THREE.Group();root.name='Barreira de madeira';root.userData={selectable:true,name:root.name,role:'CONSTRUÇÃO · BARREIRA'};unitBase(root,0x9a6a38);
  const rig=new THREE.Group();rig.name='rig';rig.position.y=.18;root.add(rig);
  const posts=new THREE.Group();posts.name='barrierPosts';rig.add(posts);
  [-.61,.61].forEach(x=>{
    add(new THREE.BoxGeometry(.16,1.35,.2),M.wood,posts,[x,.78,0]);
    add(new THREE.ConeGeometry(.13,.28,4),M.wood,posts,[x,1.58,0],[0,Math.PI/4,0]);
  });
  const builtParts=new THREE.Group();builtParts.name='barrierBuiltParts';rig.add(builtParts);
  [-.42,-.12,.18,.48].forEach((y,index)=>add(new THREE.BoxGeometry(1.38,.19,.18),index%2?M.leather:M.wood,builtParts,[0,.85+y,0],[0,0,index%2?.035:-.025]));
  const constructionParts=new THREE.Group();constructionParts.name='barrierConstructionParts';rig.add(constructionParts);
  add(new THREE.BoxGeometry(1.12,.13,.14),M.wood,constructionParts,[0,.43,.18],[0,0,.42]);
  add(new THREE.BoxGeometry(1.12,.13,.14),M.wood,constructionParts,[0,.43,-.18],[0,0,-.42]);
  const signalMaterial=new THREE.MeshStandardMaterial({color:0xc58a3d,emissive:0x8b4e16,emissiveIntensity:.7,roughness:.55,metalness:.12});
  add(new THREE.TorusGeometry(.32,.035,8,28),signalMaterial,constructionParts,[0,1.25,.02],[-Math.PI/2,0,0]);
  setWoodBarrierConstructionState(root,false);return root;
}

export function setWoodBarrierConstructionState(root,underConstruction){
  const builtParts=root.getObjectByName('barrierBuiltParts'),constructionParts=root.getObjectByName('barrierConstructionParts');
  if(builtParts)builtParts.visible=!underConstruction;if(constructionParts)constructionParts.visible=underConstruction;
  root.userData.underConstruction=underConstruction;
}

export function makeMage(){
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
