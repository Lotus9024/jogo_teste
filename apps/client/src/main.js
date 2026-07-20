import * as THREE from 'three';
import { CARD_BY_ID } from '@tronos/shared/cards';
import { GAME_CONFIG } from '@tronos/shared/game-config';
import { createGameScene } from './core/createGameScene.js';
import { M, add, makeArcher, makeMage, makeWarrior, unitBase } from './models/unitModels.js';
import { GameSocketClient, SERVER_EVENTS } from './network/gameSocket.js';
import { mountGameShell } from './ui/gameShell.js';
import { cardMarkup, cards, hideDeckPreview as hideCardPreview, showDeckPreview } from './ui/cardView.js';
import { createWorld } from './world/createWorld.js';
import './style.css';

mountGameShell();
const app = document.querySelector('#game');
app.focus({ preventScroll: true });
const { scene, renderer, camera, controls, updateDynamicLighting } = createGameScene(app);
const { board, tile, half, alliedKeep, enemyKeep, deck3D, topDeckCard, wisps, fireLights } = createWorld(scene);

// Each miniature is snapped to the exact center of a tile. Scale 0.64 keeps
// even the outermost weapon silhouette inside the 1.08 × 1.08 footprint.
const units=[makeMage(),makeWarrior(),makeArcher()]; units[0].position.set(-2.16,.06,0);units[1].position.set(0,.06,0);units[2].position.set(2.16,.06,0);units.forEach((u,cardIndex)=>{u.scale.setScalar(.64);u.userData.hoverable=true;u.userData.cardIndex=cardIndex;scene.add(u)});
const hoverables=[...units];

// Selection and unit status HUD.
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let selected=null,dragged=null,dragMoved=false,justDragged=false,onlineState=null,selfSeat=null,onlineSocket=null,devMode=false;
const boardPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
const dragPoint=new THREE.Vector3();
const tileMarker=add(new THREE.PlaneGeometry(tile*.9,tile*.9),new THREE.MeshBasicMaterial({color:0xcaa45d,transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide}),scene,[0,.075,0],[-Math.PI/2,0,0]);
tileMarker.visible=false;
const movementGeometry=new THREE.PlaneGeometry(tile*.82,tile*.82),movementMaterial=new THREE.MeshBasicMaterial({color:0x60b8e8,transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide}),attackMaterial=new THREE.MeshBasicMaterial({color:0xff3b2e,transparent:true,opacity:.7,depthWrite:false,side:THREE.DoubleSide}),movementMarkers=[];
function clearMovementGrid(){movementMarkers.splice(0).forEach(marker=>scene.remove(marker));app.dataset.movementTiles='0';app.dataset.attackTiles='0'}
function addMovementMarker(x,z,material){const marker=new THREE.Mesh(movementGeometry,material);marker.rotation.x=-Math.PI/2;marker.position.set(x*tile-half,.076,z*tile-half);scene.add(marker);movementMarkers.push(marker)}
function showMovementGrid(unit){
  clearMovementGrid();const onlineAllowed=onlineState&&unit.userData.ownerSeat===selfSeat&&onlineState.state.activeSeat===selfSeat&&!unit.userData.actionUsed;if(!devMode&&!onlineAllowed)return;
  const originX=Math.round((unit.position.x+half)/tile),originZ=Math.round((unit.position.z+half)/tile),range=unit.userData.move;
  for(let dx=-range;dx<=range;dx++)for(let dz=-range;dz<=range;dz++){
    const x=originX+dx,z=originZ+dz,distance=Math.abs(dx)+Math.abs(dz),inCastle=x>=6&&x<=8&&(z<=2||z>=12),occupied=units.some(other=>other!==unit&&Math.round((other.position.x+half)/tile)===x&&Math.round((other.position.z+half)/tile)===z);
    if(!distance||distance>range||x<0||x>=15||z<0||z>=15||inCastle||occupied)continue;
    addMovementMarker(x,z,movementMaterial);
  }
  const attackRange=unit.userData.attackRange??(['ARQUEIRA','MAGO'].includes(unit.userData.role)?3:1),attackTargets=units.filter(target=>target!==unit&&(devMode||target.userData.ownerSeat!==selfSeat)&&Math.abs(target.position.x-unit.position.x)/tile+Math.abs(target.position.z-unit.position.z)/tile<=attackRange);
  attackTargets.forEach(target=>addMovementMarker(Math.round((target.position.x+half)/tile),Math.round((target.position.z+half)/tile),attackMaterial));
  app.dataset.movementTiles=String(movementMarkers.length-attackTargets.length);app.dataset.attackTiles=String(attackTargets.length);
}
function unitAtPointer(e){
  const rect=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-rect.left)/rect.width)*2-1;pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;ray.setFromCamera(pointer,camera);
  const hits=ray.intersectObjects(units,true);if(!hits.length)return null;let u=hits[0].object;while(u.parent&&!u.userData.selectable)u=u.parent;return u.userData.selectable?u:null;
}
function hoverableAtPointer(e){
  const rect=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-rect.left)/rect.width)*2-1;pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;ray.setFromCamera(pointer,camera);
  const hits=ray.intersectObjects(hoverables,true);if(!hits.length)return null;let o=hits[0].object;while(o.parent&&!o.userData.hoverable)o=o.parent;return o.userData.hoverable?o:null;
}
function snapToTile(value){return THREE.MathUtils.clamp(Math.round((value+half)/tile)*tile-half,-half,half)}
function selectUnit(u){if(selected)selected.getObjectByName('selectionRing').material.emissiveIntensity=.18;selected=u;selected.getObjectByName('selectionRing').material.emissiveIntensity=1.3;showMovementGrid(u)}
function pick(e){if(justDragged){justDragged=false;return}const u=unitAtPointer(e);if(u)selectUnit(u)}
function startDrag(e){
  if(e.button!==0)return;const u=unitAtPointer(e);if(!u)return;
  if(onlineState&&(u.userData.ownerSeat!==selfSeat||onlineState.state.activeSeat!==selfSeat||u.userData.actionUsed))return;
  e.preventDefault();e.stopPropagation();dragged=u;dragMoved=false;controls.enabled=false;selectUnit(u);renderer.domElement.setPointerCapture(e.pointerId);
  dragged.userData.dragOrigin=dragged.position.clone();
  dragged.position.y=.18;tileMarker.position.set(dragged.position.x,.075,dragged.position.z);tileMarker.visible=true;app.dataset.dragging=dragged.userData.name;
}
function moveDrag(e){
  if(!dragged)return;e.preventDefault();dragMoved=true;
  const rect=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-rect.left)/rect.width)*2-1;pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;ray.setFromCamera(pointer,camera);
  if(ray.ray.intersectPlane(boardPlane,dragPoint)){const x=snapToTile(dragPoint.x),z=snapToTile(dragPoint.z);dragged.position.x=x;dragged.position.z=z;tileMarker.position.set(x,.075,z)}
}
function finishDrag(e){
  if(!dragged)return;e.preventDefault();e.stopPropagation();dragged.position.y=.06;controls.enabled=true;tileMarker.visible=false;
  if(dragMoved){
    const destination={x:Math.round((dragged.position.x+half)/tile),z:Math.round((dragged.position.z+half)/tile)},origin={x:Math.round((dragged.userData.dragOrigin.x+half)/tile),z:Math.round((dragged.userData.dragOrigin.z+half)/tile)};dragged.visible=false;const target=unitAtPointer(e),opponentKeep=selfSeat===1?enemyKeep:alliedKeep,baseTarget=onlineState&&ray.intersectObject(opponentKeep,true).length>0;dragged.visible=true;
    if(onlineState){dragged.position.copy(dragged.userData.dragOrigin);if(target&&target.userData.ownerSeat!==selfSeat)sendOnlineAction({type:'attack',unitId:dragged.userData.serverUnitId,targetUnitId:target.userData.serverUnitId});else if(baseTarget)sendOnlineAction({type:'attack',unitId:dragged.userData.serverUnitId,targetBaseSeat:selfSeat===1?2:1});else sendOnlineAction({type:'move',unitId:dragged.userData.serverUnitId,...destination});}
    else if(devMode){
      const moveDistance=Math.abs(destination.x-origin.x)+Math.abs(destination.z-origin.z),attackRange=dragged.userData.attackRange??(['ARQUEIRA','MAGO'].includes(dragged.userData.role)?3:1);
      if(target&&target!==dragged){const targetDistance=Math.abs(target.position.x-dragged.userData.dragOrigin.x)/tile+Math.abs(target.position.z-dragged.userData.dragOrigin.z)/tile;dragged.position.copy(dragged.userData.dragOrigin);if(targetDistance<=attackRange){target.userData.hp-=dragged.userData.damage;app.dataset.lastAttack=`${dragged.userData.name}->${target.userData.name}:${Math.max(0,target.userData.hp)}`;if(target.userData.hp<=0){units.splice(units.indexOf(target),1);hoverables.splice(hoverables.indexOf(target),1);scene.remove(target)}}else showGameError('Alvo fora de alcance.');}
      else if(moveDistance>dragged.userData.move){dragged.position.copy(dragged.userData.dragOrigin);showGameError('Movimento fora de alcance.');}
    }
  }
  app.dataset.lastMoved=`${dragged.userData.name}:${dragged.position.x.toFixed(2)},${dragged.position.z.toFixed(2)}`;delete app.dataset.dragging;justDragged=dragMoved;dragged=null;
  if(dragMoved)clearMovementGrid();
  if(renderer.domElement.hasPointerCapture(e.pointerId))renderer.domElement.releasePointerCapture(e.pointerId);
}
const hoverCard=document.querySelector('#hover-card');
function showHover(e){
  if(dragged){hoverCard.classList.remove('visible');return}const o=hoverableAtPointer(e);if(!o){hoverCard.classList.remove('visible');hoverCard.setAttribute('aria-hidden','true');return}
  hoverCard.innerHTML=cardMarkup(cards[o.userData.cardIndex],o.userData.cardIndex);const preview=hoverCard.firstElementChild;preview.classList.remove('selected');preview.tabIndex=-1;
  hoverCard.style.left=`${Math.min(e.clientX+18,innerWidth-262)}px`;hoverCard.style.top=`${Math.min(e.clientY+18,innerHeight-422)}px`;hoverCard.classList.add('visible');hoverCard.setAttribute('aria-hidden','false');
}
renderer.domElement.addEventListener('click',pick);
renderer.domElement.addEventListener('pointerdown',startDrag,true);
renderer.domElement.addEventListener('pointermove',moveDrag,true);
renderer.domElement.addEventListener('pointermove',showHover);
renderer.domElement.addEventListener('pointerup',finishDrag,true);
renderer.domElement.addEventListener('pointercancel',finishDrag,true);
renderer.domElement.addEventListener('pointerleave',()=>hoverCard.classList.remove('visible'));

let activePlayer=1,round=1;
function endTurn(){if(onlineState)return sendOnlineAction({type:'end_turn'});activePlayer=activePlayer===1?2:1;if(activePlayer===1)round++;}
document.querySelector('#end-turn').addEventListener('click',endTurn);addEventListener('keydown',e=>{if(e.key==='Enter')endTurn()});

const deckPreview=document.querySelector('#deck-preview');
function previewDeckCard(index){
  showDeckPreview(deckPreview,cards[index]);
}
function hideDeckPreview(){hideCardPreview(deckPreview)}
const hand=document.querySelector('#card-hand');
hand.innerHTML=cards.map(cardMarkup).join('');
document.querySelector('#hand-count').textContent=`${hand.children.length} CARTAS`;
const bottomCommand=document.querySelector('.bottom-command');
let cardDrag=null,suppressCardClick=false;
function syncBottomCommand(){bottomCommand.classList.toggle('hidden-by-card',Boolean(cardDrag||hand.querySelector('.game-card:hover')||hand.querySelector('.game-card.selected')))}
hand.addEventListener('pointerover',e=>{if(e.target.closest('.game-card'))syncBottomCommand()});
hand.addEventListener('pointerout',e=>{if(e.target.closest('.game-card'))requestAnimationFrame(syncBottomCommand)});
hand.addEventListener('click',e=>{const card=e.target.closest('.game-card');if(!card||suppressCardClick)return;const wasSelected=card.classList.contains('selected');hand.querySelectorAll('.game-card').forEach(el=>el.classList.remove('selected'));if(!wasSelected)card.classList.add('selected');syncBottomCommand()});

function cardTileAtPointer(e){
  const rect=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-rect.left)/rect.width)*2-1;pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;ray.setFromCamera(pointer,camera);
  if(!ray.ray.intersectPlane(boardPlane,dragPoint)||Math.abs(dragPoint.x)>half+tile/2||Math.abs(dragPoint.z)>half+tile/2)return null;
  const x=snapToTile(dragPoint.x),z=snapToTile(dragPoint.z),occupied=units.some(u=>Math.abs(u.position.x-x)<.1&&Math.abs(u.position.z-z)<.1),gridZ=Math.round((z+half)/tile);
  const deployment=!onlineState||(selfSeat===1?gridZ>=8&&gridZ<=11:gridZ>=3&&gridZ<=6);
  return{x,z,valid:!occupied&&deployment};
}
function makeSummonedUnit(cardIndex){
  const c=cards[cardIndex],factories=[makeWarrior,makeMage,makeArcher];let unit;
  if(factories[cardIndex])unit=factories[cardIndex]();
  else{
    const colors={common:0x858a85,uncommon:0x628c67,rare:0x5186a8,epic:0x8d5ab0,legendary:0xc68a34},color=colors[c.rarityClass];unit=new THREE.Group();unitBase(unit,color);
    const rig=new THREE.Group();rig.name='rig';rig.position.y=.18;unit.add(rig);const tokenMat=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.12,roughness:.55,metalness:.35});
    add(new THREE.CylinderGeometry(.32,.44,.95,18),M.darkLeather,rig,[0,.68,0]);add(new THREE.OctahedronGeometry(.38,1),tokenMat,rig,[0,1.5,0]);add(new THREE.TorusGeometry(.35,.045,10,32),M.gold,rig,[0,1.5,0],[Math.PI/2,0,0]);
  }
  unit.name=c.name;unit.userData={...unit.userData,selectable:true,hoverable:true,cardIndex,name:c.name,role:c.info,hp:c.hp,maxHp:c.hp,damage:c.damage,move:c.move,attackRange:c.attackRange,cost:c.cost,ability:c.ability,abilityUsed:false,description:c.abilityText};unit.scale.setScalar(.64);return unit;
}
function summonCard(cardIndex,x,z){const unit=makeSummonedUnit(cardIndex);unit.position.set(x,.06,z);units.push(unit);hoverables.push(unit);scene.add(unit);selectUnit(unit)}
hand.addEventListener('pointerdown',e=>{
  const card=e.target.closest('.game-card');if(!card||e.button!==0||onlineState&&onlineState.state.activeSeat!==selfSeat)return;e.preventDefault();card.setPointerCapture(e.pointerId);controls.enabled=false;
  cardDrag={card,index:Number(card.dataset.card),instanceId:card.dataset.instance,startX:e.clientX,startY:e.clientY,moved:false,ghost:null,tile:null};syncBottomCommand();
});
addEventListener('pointermove',e=>{
  if(!cardDrag)return;const distance=Math.hypot(e.clientX-cardDrag.startX,e.clientY-cardDrag.startY);if(!cardDrag.moved&&distance<7)return;
  if(!cardDrag.moved){cardDrag.moved=true;cardDrag.card.classList.add('summoning');cardDrag.ghost=cardDrag.card.cloneNode(true);cardDrag.ghost.classList.remove('selected');cardDrag.ghost.classList.add('summon-card-ghost');document.body.appendChild(cardDrag.ghost)}
  cardDrag.ghost.style.left=`${e.clientX}px`;cardDrag.ghost.style.top=`${e.clientY}px`;cardDrag.tile=cardTileAtPointer(e);tileMarker.visible=Boolean(cardDrag.tile);if(cardDrag.tile){tileMarker.position.set(cardDrag.tile.x,.075,cardDrag.tile.z);tileMarker.material.color.setHex(cardDrag.tile.valid?0x6cad78:0xa54239)}
});
addEventListener('pointerup',e=>{
  if(!cardDrag)return;const drag=cardDrag;cardDrag=null;controls.enabled=true;tileMarker.visible=false;drag.ghost?.remove();drag.card.classList.remove('summoning');
  if(drag.moved){suppressCardClick=true;if(drag.tile?.valid){if(onlineState)sendOnlineAction({type:'summon',cardInstanceId:drag.instanceId,x:Math.round((drag.tile.x+half)/tile),z:Math.round((drag.tile.z+half)/tile)});else{summonCard(drag.index,drag.tile.x,drag.tile.z);drag.card.remove();document.querySelector('#hand-count').textContent=`${hand.querySelectorAll('.game-card').length} CARTAS`}}setTimeout(()=>{suppressCardClick=false;syncBottomCommand()},0)}else syncBottomCommand();
});

let drawingCard=false,handShift=0,deckRemaining=28,deckHover=false,deckPreviewIndex=0;
const deckScreenPoint=new THREE.Vector3();
function deckScreenPosition(y=.8){deck3D.getWorldPosition(deckScreenPoint);deckScreenPoint.y+=y;deckScreenPoint.project(camera);return{x:(deckScreenPoint.x*.5+.5)*innerWidth,y:(-deckScreenPoint.y*.5+.5)*innerHeight}}
function drawCardPreview(){
  if(onlineState){previewDeckCard(deckPreviewIndex);return}
  if(drawingCard||deckRemaining<=0)return;drawingCard=true;const deck=deckScreenPosition(),target=hand.getBoundingClientRect();
  const ghost=document.createElement('div');ghost.className='draw-card-ghost';ghost.textContent='♜';ghost.style.left=`${deck.x-36}px`;ghost.style.top=`${deck.y-53}px`;document.body.appendChild(ghost);
  const dx=target.left+target.width/2-deck.x,dy=Math.min(innerHeight-125,target.top+40)-deck.y;
  const motion=ghost.animate([{transform:'translate(0,0) rotate(-8deg) scale(.72)',opacity:.35},{offset:.48,transform:`translate(${dx*.52}px,${dy*.35}px) rotate(7deg) scale(1.15)`,opacity:1},{transform:`translate(${dx}px,${dy}px) rotate(0) scale(.9)`,opacity:.15}],{duration:980,easing:'cubic-bezier(.2,.75,.2,1)'});
  motion.onfinish=()=>{const source=hand.querySelector('.game-card');if(source){const clone=source.cloneNode(true);clone.classList.remove('selected');hand.appendChild(clone)}ghost.remove();const count=hand.children.length;document.querySelector('#hand-count').textContent=`${count} CARTAS`;deckRemaining--;document.querySelector('#deck-count').textContent=deckRemaining;deckPreviewIndex=(deckPreviewIndex+1)%cards.length;hand.classList.add('reflow');setTimeout(()=>hand.classList.remove('reflow'),600);drawingCard=false;};
}
document.querySelector('#draw-card').addEventListener('click',drawCardPreview);
function deckAtPointer(e){const rect=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-rect.left)/rect.width)*2-1;pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;ray.setFromCamera(pointer,camera);return ray.intersectObject(deck3D,true).length>0}
function hoverDeck(e){const over=deckAtPointer(e);if(over!==deckHover){deckHover=over;renderer.domElement.style.cursor=over?'pointer':'';if(over)previewDeckCard(deckPreviewIndex);else hideDeckPreview()}}
let deckPressed=false;
renderer.domElement.addEventListener('pointermove',hoverDeck);
renderer.domElement.addEventListener('pointerdown',e=>{if(e.button!==0||!deckAtPointer(e))return;e.preventDefault();e.stopPropagation();deckPressed=true;controls.enabled=false},true);
renderer.domElement.addEventListener('pointerup',e=>{if(!deckPressed)return;e.preventDefault();e.stopPropagation();deckPressed=false;controls.enabled=true;if(deckAtPointer(e))drawCardPreview()},true);
renderer.domElement.addEventListener('pointerleave',()=>{deckHover=false;deckPressed=false;controls.enabled=true;renderer.domElement.style.cursor='';hideDeckPreview()});
function moveTray(direction){handShift=THREE.MathUtils.clamp(handShift+direction*120,-360,360);hand.style.setProperty('--hand-shift',`${handShift}px`)}
document.querySelector('#tray-prev').addEventListener('click',()=>moveTray(1));document.querySelector('#tray-next').addEventListener('click',()=>moveTray(-1));

function sendOnlineAction(action){if(onlineState&&onlineSocket)onlineSocket.sendAction(action,onlineState.state.version)}
function setResource(selector,value,max){const element=document.querySelector(selector);element.textContent=String(value);if(max!==''){const limit=document.createElement('em');limit.textContent=`/${max}`;element.appendChild(limit)}}
function renderOnlineHand(instances){
  hand.replaceChildren();
  for(const instance of instances){const c=CARD_BY_ID[instance.cardId],index=cards.findIndex(card=>card.id===instance.cardId);if(!c||index<0||!/^[-0-9a-f]{36}$/i.test(instance.instanceId))continue;const holder=document.createElement('div');holder.innerHTML=cardMarkup(cards[index],index);const node=holder.firstElementChild;node.dataset.instance=instance.instanceId;hand.appendChild(node)}
  document.querySelector('#hand-count').textContent=`${hand.children.length} CARTAS`;
}
function onlineUnit(data){
  const index=cards.findIndex(card=>card.id===data.cardId),unit=makeSummonedUnit(index),card=cards[index];
  unit.userData={...unit.userData,serverUnitId:data.id,ownerSeat:data.ownerSeat,cardId:data.cardId,cardIndex:index,hp:data.hp,maxHp:card.hp,actionUsed:data.actionUsed,abilityUsed:data.abilityUsed};
  const color=data.ownerSeat===1?0x4d91bd:0xb94e45,ring=unit.getObjectByName('selectionRing');ring.material.color.setHex(color);ring.material.emissive.setHex(color);
  unit.position.set(data.x*tile-half,.06,data.z*tile-half);return unit;
}
function reconcileOnlineUnits(serverUnits){
  clearMovementGrid();units.splice(0).forEach(unit=>scene.remove(unit));hoverables.splice(0);selected=null;
  serverUnits.forEach(data=>{const unit=onlineUnit(data);units.push(unit);hoverables.push(unit);scene.add(unit)});
  app.dataset.onlineUnits=String(serverUnits.length);
}
function setOnlinePerspective(){camera.position.set(0,16,selfSeat===1?5.2:-5.2);camera.lookAt(0,0,0);controls.target.set(0,.2,0);controls.update();app.dataset.seat=String(selfSeat);app.dataset.perspectiveResets=String(Number(app.dataset.perspectiveResets??0)+1)}
function animateServerDraw(){const deck=deckScreenPosition(),target=hand.getBoundingClientRect(),ghost=document.createElement('div');ghost.className='draw-card-ghost';ghost.textContent='♜';ghost.style.left=`${deck.x-36}px`;ghost.style.top=`${deck.y-53}px`;document.body.appendChild(ghost);const dx=target.left+target.width/2-deck.x,dy=Math.min(innerHeight-125,target.top+40)-deck.y;ghost.animate([{transform:'translate(0,0) scale(.72)',opacity:.35},{transform:`translate(${dx}px,${dy}px) scale(.9)`,opacity:.1}],{duration:800,easing:'cubic-bezier(.2,.75,.2,1)'}).onfinish=()=>ghost.remove()}
function applyOnlineState(payload){
  const previous=onlineState,shouldSetPerspective=!previous||previous.self.seat!==payload.self.seat||previous.state.phase==='waiting';onlineState=payload;selfSeat=payload.self.seat;
  document.querySelector('#waiting-code').textContent=payload.code;document.querySelector('#waiting-room').hidden=false;document.querySelector('#match-code').textContent=`SALA ${payload.code}`;document.querySelector('#match-state').hidden=false;
  if(payload.state.phase==='waiting'){document.querySelector('#waiting-status').textContent='Aguardando o rei rival...';return}
  document.querySelector('#online-lobby').classList.add('closed');if(shouldSetPerspective)setOnlinePerspective();
  if(previous&&payload.self.hand.length>previous.self.hand.length)animateServerDraw();renderOnlineHand(payload.self.hand);reconcileOnlineUnits(payload.state.units);
  const me=payload.state.players.find(player=>player.seat===selfSeat),enemy=payload.state.players.find(player=>player.seat!==selfSeat);if(!me||!enemy)return;
  setResource('#self-energy',me.energy,GAME_CONFIG.maxEnergy);setResource('#self-health',me.baseHp,GAME_CONFIG.startingBaseHp);deckRemaining=me.deckCount;document.querySelector('#deck-count').textContent=String(deckRemaining);
  document.querySelector('.enemy-base-tag i').style.width=`${Math.max(0,enemy.baseHp/GAME_CONFIG.startingBaseHp*100)}%`;
  const mine=payload.state.activeSeat===selfSeat,finished=payload.state.phase==='finished';document.querySelector('#turn-label').textContent=finished?(payload.state.winnerSeat===selfSeat?'VITÓRIA':'DERROTA'):(mine?'SEU TURNO':'TURNO RIVAL');document.querySelector('#end-turn').disabled=!mine||finished;
}
const lobbyError=document.querySelector('#lobby-error'),gameError=document.querySelector('#game-error'),connectionState=document.querySelector('#connection-state');let gameErrorTimer;function showGameError(message){gameError.textContent=message;clearTimeout(gameErrorTimer);gameErrorTimer=setTimeout(()=>gameError.textContent='',2800)}onlineSocket=new GameSocketClient();
onlineSocket.addEventListener('connected',()=>{connectionState.textContent='SERVIDOR CONECTADO';document.querySelectorAll('#create-room,#join-room').forEach(button=>button.disabled=false)});
onlineSocket.addEventListener('disconnected',()=>{connectionState.textContent='CONEXÃO ENCERRADA';lobbyError.textContent='A conexão com a partida foi encerrada.'});
onlineSocket.addEventListener(SERVER_EVENTS.ROOM_STATE,event=>{lobbyError.textContent='';gameError.textContent='';applyOnlineState(event.detail)});
onlineSocket.addEventListener(SERVER_EVENTS.ERROR,event=>{const message=String(event.detail.message??'Erro na partida.');if(document.querySelector('#online-lobby').classList.contains('closed'))showGameError(message);else lobbyError.textContent=message});
document.querySelectorAll('#create-room,#join-room').forEach(button=>button.disabled=true);
document.querySelector('#room-code').addEventListener('input',event=>{event.target.value=event.target.value.toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6)});
document.querySelector('#create-room').addEventListener('click',()=>onlineSocket.createRoom(document.querySelector('#player-name').value));
document.querySelector('#join-room').addEventListener('click',()=>onlineSocket.joinRoom(document.querySelector('#room-code').value,document.querySelector('#player-name').value));
document.querySelector('#dev-mode').addEventListener('click',()=>{devMode=true;onlineState=null;selfSeat=null;app.dataset.mode='dev';document.querySelector('#online-lobby').classList.add('closed');document.querySelector('#match-state').hidden=false;document.querySelector('#match-code').textContent='DEV MODE';document.querySelector('#turn-label').textContent='TESTE LIVRE';document.querySelector('#turn-clock').textContent='∞';document.querySelector('#end-turn').disabled=false;setResource('#self-energy','∞','');setResource('#self-health',20,20)});
onlineSocket.connect();
setInterval(()=>{if(!onlineState?.state.turnEndsAt)return;const remaining=Math.max(0,onlineState.state.turnEndsAt-Date.now()),minutes=Math.floor(remaining/60000),seconds=Math.floor(remaining%60000/1000);document.querySelector('#turn-clock').textContent=`${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`},250);

const clock=new THREE.Clock();
const enemyBaseTag=document.querySelector('.enemy-base-tag');
const baseTagPoint=new THREE.Vector3();
function positionEnemyStatus(){const target=selfSeat===2?alliedKeep:enemyKeep;target.getWorldPosition(baseTagPoint);baseTagPoint.y+=4.9;baseTagPoint.project(camera);enemyBaseTag.style.left=`${(baseTagPoint.x*.5+.5)*innerWidth}px`;enemyBaseTag.style.top=`${(-baseTagPoint.y*.5+.5)*innerHeight}px`;enemyBaseTag.style.visibility=baseTagPoint.z<1?'visible':'hidden';}
function animate(){requestAnimationFrame(animate);const t=clock.getElapsedTime();controls.update();updateDynamicLighting(t);positionEnemyStatus();topDeckCard.position.y=THREE.MathUtils.lerp(topDeckCard.position.y,deckHover ? .98 : .766,.14);topDeckCard.rotation.z=THREE.MathUtils.lerp(topDeckCard.rotation.z,deckHover ? -.08 : 0,.12);units.forEach((u,i)=>{const rig=u.getObjectByName('rig');rig.position.y=.18+Math.sin(t*1.35+i*1.7)*.012;rig.rotation.z=Math.sin(t*.8+i)*.006;u.traverse(o=>{if(o.userData.magic){o.rotation.y=t*1.5;o.position.y=2.23+Math.sin(t*2.5)*.045;}})});wisps.forEach((w,i)=>{w.position.x=w.userData.baseX+Math.sin(t*.12+i)*.55;w.material.opacity=.012+i*.003+Math.sin(t*.35+i)*.004;});fireLights.forEach((light,i)=>{const pulse=.91+Math.sin(t*7.4+light.userData.phase)*.065+Math.sin(t*13.1+i)*.025;light.intensity=light.userData.baseIntensity*pulse;});renderer.render(scene,camera)}
function resize(){const aspect=innerWidth/innerHeight,view=innerWidth<700?11.2:10.2;camera.left=-view*aspect;camera.right=view*aspect;camera.top=view;camera.bottom=-view;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.7))}addEventListener('resize',resize);resize();animate();setTimeout(()=>document.querySelector('.loading').classList.add('done'),500);
