import * as THREE from 'three';
import { M, add } from '../models/unitModels.js';

export function createWorld(scene) {
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
  
    add(new THREE.CylinderGeometry(.04,.045,2.3,10),M.iron,keep,[0,3.35,.12]);
    add(new THREE.SphereGeometry(.075,12,8),M.gold,keep,[0,4.52,.12]);
    add(new THREE.PlaneGeometry(.72,.9,4,4),bannerMat,keep,[.4,4.02,.13],[0,enemy?Math.PI:0,0]);
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
  alliedKeep.position.set(0,.06,half-tile);enemyKeep.position.set(0,.06,-half+tile);board.add(alliedKeep,enemyKeep);
  
  // A physical deck sits beside the board. Every layer has real thickness and a
  // slightly different angle, so it reads as a handled stack from the game camera.
  const deck3D=new THREE.Group();deck3D.name='Baralho 3D do Corvo';deck3D.position.set(-half-1.4,-.34,-half+.95);deck3D.rotation.y=-.11;
  const deckSideMat=new THREE.MeshStandardMaterial({color:0x6d6049,roughness:.82,metalness:.05});
  const deckBackMat=new THREE.MeshStandardMaterial({color:0x172326,emissive:0x071012,emissiveIntensity:.4,roughness:.58,metalness:.18});
  const deckEdgeMat=new THREE.MeshStandardMaterial({color:0xa98545,emissive:0x231606,emissiveIntensity:.25,roughness:.36,metalness:.72});
  add(new THREE.BoxGeometry(1.62,.18,2.18),M.stoneDark,deck3D,[0,-.08,0]);
  add(new THREE.BoxGeometry(1.42,.08,1.98),M.iron,deck3D,[0,.05,0]);
  const deckCards=[];
  for(let i=0;i<18;i++){
    const card=new THREE.Group();card.position.set(Math.sin(i*2.17)*.045,.12+i*.038,Math.cos(i*1.73)*.04);card.rotation.y=Math.sin(i*1.31)*.055;
    add(new THREE.BoxGeometry(1.18,.045,1.72,5,1,7),[deckSideMat,deckSideMat,deckBackMat,deckSideMat,deckSideMat,deckSideMat],card);
    if(i===17){
      add(new THREE.BoxGeometry(1.02,.018,.025),deckEdgeMat,card,[0,.034,-.72]);add(new THREE.BoxGeometry(1.02,.018,.025),deckEdgeMat,card,[0,.034,.72]);
      add(new THREE.BoxGeometry(.025,.018,1.42),deckEdgeMat,card,[-.5,.034,0]);add(new THREE.BoxGeometry(.025,.018,1.42),deckEdgeMat,card,[.5,.034,0]);
      add(new THREE.CylinderGeometry(.2,.2,.022,4),deckEdgeMat,card,[0,.05,0],[0,Math.PI/4,0]);
      add(new THREE.CylinderGeometry(.055,.055,.027,12),M.magic,card,[0,.068,0]);
    }
    deckCards.push(card);deck3D.add(card);
  }
  const topDeckCard=deckCards.at(-1);scene.add(deck3D);
  
  // A ruined, misty valley frames the game board while keeping every tile clear.
  const environment=new THREE.Group(),wisps=[];
  const earth=new THREE.MeshStandardMaterial({color:0x444846,emissive:0x080909,emissiveIntensity:.1,roughness:1}),ashStone=new THREE.MeshStandardMaterial({color:0x353c36,roughness:.98}),deadWood=new THREE.MeshStandardMaterial({color:0x463126,emissive:0x080504,emissiveIntensity:.28,roughness:1});
  add(new THREE.CircleGeometry(19,72),earth,environment,[0,-.58,0],[-Math.PI/2,0,0],[1,.78,1]);
  add(new THREE.RingGeometry(8.8,11.8,72),new THREE.MeshStandardMaterial({color:0x3a3e3c,roughness:1}),environment,[0,-.55,0],[-Math.PI/2,0,0],[1,.82,1]);
  
  function deadTree(x,z,scale=1,twist=0){
    const tree=new THREE.Group();tree.position.set(x,-.52,z);tree.rotation.y=twist;tree.scale.setScalar(scale);
    add(new THREE.CylinderGeometry(.09,.18,1.65,9),deadWood,tree,[0,.82,0],[0,0,.08]);
    [[-.42,1.2,.35],[.4,1.05,-.45],[-.3,.72,-.62]].forEach(([bx,by,rz],i)=>{add(new THREE.CylinderGeometry(.035,.075,.85-i*.12,7),deadWood,tree,[bx*.48,by,0],[0,0,rz]);add(new THREE.ConeGeometry(.025,.28,6),deadWood,tree,[bx,by+.28,0],[0,0,rz]);});
    environment.add(tree);
  }
  [[-11.2,-1.2,.85,-.5],[-10.1,4.6,1.05,.7],[10.5,-5.2,1,.1],[11.1,.2,1.2,-.35],[9.9,5.7,.88,.8],[-5.8,-9.5,.78,.4],[6.4,9.3,.92,-.2]].forEach(p=>deadTree(...p));
  
  function brokenPillar(x,z,height=1.35,lean=0){
    const ruin=new THREE.Group();ruin.position.set(x,-.53,z);ruin.rotation.z=lean;
    add(new THREE.CylinderGeometry(.25,.32,.18,10),ashStone,ruin,[0,.09,0]);add(new THREE.CylinderGeometry(.2,.23,height,10),ashStone,ruin,[0,.18+height/2,0]);
    add(new THREE.CylinderGeometry(.3,.23,.15,10),ashStone,ruin,[0,height+.2,0],[.12,.08,0]);environment.add(ruin);
  }
  [[-9.25,-3.4,1.5,.08],[-9.6,2.8,.9,-.13],[9.35,-2.6,1.2,.12],[9.7,3.7,1.65,-.06],[-4.2,9.2,.75,.16],[4.7,-9.15,1.05,-.12]].forEach(p=>brokenPillar(...p));
  
  const rockSpots=[[-11,7,.55],[-7.6,9.3,.75],[-3.1,-9.4,.42],[2.2,9.6,.5],[8.7,-8.8,.72],[11.8,-6,.48],[11.5,6.8,.65],[-12.2,2.8,.45],[12,-1.6,.52]];
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

  return { board, N, tile, half, alliedKeep, enemyKeep, deck3D, topDeckCard, wisps };
}
