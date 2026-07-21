import * as THREE from 'three';
import { CARD_BY_ID, ORTHOGONAL_DIRECTIONS, cellKey, citizensForSeat, forwardDeltaForSeat, gridCellsBetween, isAttackDistanceValid, isCannonTargetValid, isDeploymentCell, isRoadPlacementCell, movementDistance } from '@tronos/shared/cards';
import { GAME_CONFIG } from '@tronos/shared/game-config';
import { createCinematicCamera } from './core/createCinematicCamera.js';
import { createGameScene } from './core/createGameScene.js';
import { loadGameSettings, saveGameSettings } from './core/gameSettings.js';
import { add } from './core/scenePrimitives.js';
import { createBoardCoordinates } from './gameplay/boardCoordinates.js';
import { createDeploymentOverlay } from './gameplay/createDeploymentOverlay.js';
import { createDamageEffects } from './gameplay/damageEffects.js';
import { createMovementOverlay } from './gameplay/createMovementOverlay.js';
import { applyConstructionState as applyUnitConstructionState, isMountedArcher, setUnitTeamColor } from './gameplay/unitState.js';
import { createCardUnit, UNIT_MODEL_SCALE } from './models/createCardUnit.js';
import { makeArcher, makeGuard, makeWarrior, setArcherMountedState } from './models/unitModels.js';
import { makeRoad } from './assets/models/roadModel.js';
import { GameSocketClient, SERVER_EVENTS } from './network/gameSocket.js';
import { mountGameShell } from './ui/gameShell.js';
import { cardMarkup, cards, hideDeckPreview as hideCardPreview, showDeckPreview } from './ui/cardView.js';
import { setResource } from './ui/resourceView.js';
import { ensureHealthBadge, updateHealthBadge } from './ui/unitHealthBadge.js';
import { createWorld } from './world/createWorld.js';
import './style.css';

mountGameShell();
const app = document.querySelector('#game');
app.focus({ preventScroll: true });
const gameSettings=loadGameSettings();let graphicsQuality=gameSettings.graphics,cameraCentering=gameSettings.cameraCentering;
const { scene, renderer, camera, controls, updateDynamicLighting, setGraphicsQuality:setSceneGraphicsQuality } = createGameScene(app,{quality:graphicsQuality});
const damageEffects = createDamageEffects(scene);
const cameraTransition = createCinematicCamera({ camera, controls, app });
const { board, tile, half, alliedKeep, enemyKeep, deck3D, topDeckCard, wisps, fireLights, updateTerrain, setGraphicsQuality:setWorldGraphicsQuality } = createWorld(scene, renderer,{quality:graphicsQuality});

// Each miniature is snapped to the exact center of a tile. Scale 0.64 keeps
// even the outermost weapon silhouette inside the 1.08 × 1.08 footprint.
const units=[makeWarrior(),makeGuard(),makeArcher()]; units[0].position.set(-2.16,.06,0);units[1].position.set(0,.06,0);units[2].position.set(2.16,.06,0);units.forEach((u,cardIndex)=>{const card=cards[cardIndex];u.scale.setScalar(UNIT_MODEL_SCALE);Object.assign(u.userData,{hoverable:true,cardId:card.id,cardIndex,hp:card.hp,maxHp:card.hp,damage:card.damage,move:card.move,movementType:card.movementType,minAttackRange:card.minAttackRange,attackRange:card.attackRange,cardType:card.type,cost:card.cost,ability:card.ability,abilityUsed:false,description:card.abilityText});ensureHealthBadge(u);scene.add(u)});
const hoverables=[...units];
const roads=[];const roadMeshes=[];
const { unitAtCell, unitsAtCell, baseSeatAtCell, baseCellsForSeat, snapToTile } = createBoardCoordinates({ getUnits: () => units, tile, half });

function roadConnections(road,allRoads){
  const bases=new Set(baseCellsForSeat(road.ownerSeat).map(cell=>cellKey(cell.x,cell.z))),owned=new Set(allRoads.filter(item=>item.ownerSeat===road.ownerSeat).map(item=>cellKey(item.x,item.z)));
  const names=['east','west','south','north'];return Object.fromEntries(ORTHOGONAL_DIRECTIONS.map((direction,index)=>{const key=cellKey(road.x+direction.x,road.z+direction.z);return[names[index],owned.has(key)||bases.has(key)]}));
}
function reconcileRoads(serverRoads){
  roadMeshes.splice(0).forEach(mesh=>scene.remove(mesh));roads.splice(0,roads.length,...serverRoads.map(road=>({...road})));
  roads.forEach(road=>{const mesh=makeRoad(roadConnections(road,roads),tile);mesh.position.set(road.x*tile-half,.072,road.z*tile-half);mesh.userData={roadId:road.id,ownerSeat:road.ownerSeat};roadMeshes.push(mesh);scene.add(mesh)});
  app.dataset.roads=String(roads.length);
}

// Selection and unit status HUD.
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let selected=null,dragged=null,dragMoved=false,justDragged=false,onlineState=null,selfSeat=null,onlineSocket=null,devMode=false;
const boardPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
const dragPoint=new THREE.Vector3();
const archerMountPoint=new THREE.Vector3();
const tileMarker=add(new THREE.PlaneGeometry(tile*.9,tile*.9),new THREE.MeshBasicMaterial({color:0xcaa45d,transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide}),scene,[0,.075,0],[-Math.PI/2,0,0]);
tileMarker.visible=false;
const movementOverlay=createMovementOverlay({scene,app,units,tile,half,unitAtCell,baseSeatAtCell,baseCellsForSeat,getRoads:()=>roads,getMatchContext:()=>({onlineState,selfSeat,devMode})});
const deploymentOverlay=createDeploymentOverlay({scene,tile,half});
const clearMovementGrid=()=>movementOverlay.clear();
const showMovementGrid=unit=>movementOverlay.show(unit);
function unitAtPointer(e){
  const rect=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-rect.left)/rect.width)*2-1;pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;ray.setFromCamera(pointer,camera);
  const hits=ray.intersectObjects(units,true);if(!hits.length)return null;let u=hits[0].object;while(u.parent&&!u.userData.selectable)u=u.parent;return u.userData.selectable?u:null;
}
function hoverableAtPointer(e){
  const rect=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-rect.left)/rect.width)*2-1;pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;ray.setFromCamera(pointer,camera);
  const hits=ray.intersectObjects(hoverables,true);if(!hits.length)return null;let o=hits[0].object;while(o.parent&&!o.userData.hoverable)o=o.parent;return o.userData.hoverable?o:null;
}
function applyConstructionState(unit,underConstruction){applyUnitConstructionState(unit,underConstruction,units,app)}
const instantButton=document.querySelector('#activate-instant');
const towerId=unit=>unit.userData.serverUnitId??unit.uuid;
function towerForArcher(unit){return unit?.userData.cardId==='archer'&&unit.userData.mountedOnTowerId?units.find(candidate=>towerId(candidate)===unit.userData.mountedOnTowerId&&candidate.userData.cardId==='tower'&&!candidate.userData.underConstruction):null}
function currentRound(){return onlineState?.state.round??round}
function syncInstantCommand(){
  const tower=towerForArcher(selected),owned=devMode||selected?.userData.ownerSeat===selfSeat,available=tower&&owned;
  instantButton.hidden=!available;if(!available)return;
  const me=onlineState?.state.players.find(player=>player.seat===selfSeat),used=selected.userData.instantUsedRound===currentRound();
  instantButton.disabled=used||Boolean(me&&me.energy<CARD_BY_ID.tower.instant.cost);
  instantButton.title=used?'Disponível novamente na próxima rodada':'Dispara nas quatro direções retas';
}
function clearUnitSelection(){if(!selected)return;const ring=selected.getObjectByName('selectionRing');if(ring)ring.material.emissiveIntensity=ring.userData.baseEmissiveIntensity??.75;selected=null;clearMovementGrid();syncInstantCommand()}
function centerCamera(){if(cameraCentering)cameraTransition.focusBoard({side:selfSeat===2?-1:1})}
function selectUnit(u,{cinematic=true}={}){if(selected){const previousRing=selected.getObjectByName('selectionRing');if(previousRing)previousRing.material.emissiveIntensity=previousRing.userData.baseEmissiveIntensity??.75}selected=u;const ring=selected.getObjectByName('selectionRing');if(ring)ring.material.emissiveIntensity=1.6;showMovementGrid(u);syncInstantCommand();if(cinematic)centerCamera()}
function boardCellAtPointer(e){
  const rect=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-rect.left)/rect.width)*2-1;pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;ray.setFromCamera(pointer,camera);
  if(!ray.ray.intersectPlane(boardPlane,dragPoint)||Math.abs(dragPoint.x)>half+tile/2||Math.abs(dragPoint.z)>half+tile/2)return null;
  const worldX=snapToTile(dragPoint.x),worldZ=snapToTile(dragPoint.z);
  return{x:Math.round((worldX+half)/tile),z:Math.round((worldZ+half)/tile),worldX,worldZ};
}
function canCommandUnit(unit){return Boolean(unit&&(devMode||onlineState&&unit.userData.ownerSeat===selfSeat&&onlineState.state.activeSeat===selfSeat&&!unit.userData.actionUsed))}
function placeArcherOnTower(unit,tower){
  const mount=tower.getObjectByName('archerMount');tower.updateMatrixWorld(true);
  if(mount)unit.position.copy(mount.getWorldPosition(archerMountPoint));else unit.position.set(tower.position.x,.94,tower.position.z);
  setArcherMountedState(unit,true);
}
function mountArcherLocally(unit,tower){placeArcherOnTower(unit,tower);unit.userData.mountedOnTowerId=towerId(tower);unit.userData.attackRange=CARD_BY_ID.archer.attackRange+1;selectUnit(unit,{cinematic:false})}
function moveOrAttackUnit(unit,destination,explicitTarget=null,originPosition=unit.position.clone()){
  const origin={x:Math.round((originPosition.x+half)/tile),z:Math.round((originPosition.z+half)/tile)};
  const occupants=unitsAtCell(destination.x,destination.z,unit),target=explicitTarget??occupants.find(item=>item!==unit)??null;
  const opponentBaseSeat=selfSeat===1?2:1,baseTarget=onlineState&&baseSeatAtCell(destination.x,destination.z)===opponentBaseSeat;
  const mountable=unit.userData.cardId==='archer'&&target?.userData.cardId==='tower'&&target.userData.ownerSeat===unit.userData.ownerSeat&&!target.userData.underConstruction&&occupants.every(item=>item===target);
  const hostileTarget=target&&target.userData.ownerSeat!==unit.userData.ownerSeat;
  const forward=forwardDeltaForSeat(unit.userData.ownerSeat);
  const cannonTarget=unit.userData.cardId==='cannon'&&isCannonTargetValid({...origin,ownerSeat:unit.userData.ownerSeat},destination);
  const cannonMove=unit.userData.cardId==='cannon'&&destination.x===origin.x+forward.x&&destination.z===origin.z+forward.z;
  if(isMountedArcher(unit)&&!hostileTarget&&!baseTarget){unit.position.copy(originPosition);showGameError('O arqueiro na torre não pode se mover.');return}
  const blockedByUnit=gridCellsBetween(origin,destination).some(cell=>unitAtCell(cell.x,cell.z,unit));
  if(blockedByUnit){unit.position.copy(originPosition);showGameError(target||baseTarget?'A linha de ataque está bloqueada por outra tropa.':'O caminho está bloqueado por outra tropa.');return}
  if(onlineState){
    unit.position.copy(originPosition);
    if(mountable)return sendOnlineAction({type:'move',unitId:unit.userData.serverUnitId,...destination});
    if(cannonMove)return sendOnlineAction({type:'move',unitId:unit.userData.serverUnitId,...destination});
    if(target&&(target.userData.ownerSeat!==selfSeat||cannonTarget)){const targetDistance=Math.abs(destination.x-origin.x)+Math.abs(destination.z-origin.z),validTarget=unit.userData.cardId==='cannon'?cannonTarget:isAttackDistanceValid(unit.userData,targetDistance);if(validTarget)sendOnlineAction({type:'attack',unitId:unit.userData.serverUnitId,targetUnitId:target.userData.serverUnitId});else showGameError('Alvo fora de alcance.');}
    else if(target)showGameError('Esta casa já está ocupada.');
    else if(baseTarget)sendOnlineAction({type:'attack',unitId:unit.userData.serverUnitId,targetBaseSeat:opponentBaseSeat});
    else if(cannonTarget)sendOnlineAction({type:'attack',unitId:unit.userData.serverUnitId,x:destination.x,z:destination.z});
    else if(unit.userData.cardId==='cannon')showGameError('Escolha a casa verde à frente ou uma casa vermelha de disparo.');
    else sendOnlineAction({type:'move',unitId:unit.userData.serverUnitId,...destination});
    return;
  }
  if(!devMode)return;
  const moveDistance=movementDistance(unit.userData.movementType,origin,destination);
  if(mountable){unit.position.copy(originPosition);if(moveDistance<=unit.userData.move)mountArcherLocally(unit,target);else showGameError('Movimento fora de alcance.');return}
  if(cannonMove){
    const operator=unitAtCell(origin.x-forward.x,origin.z-forward.z,unit);
    if(operator?.userData.cardId!=='operator'||operator.userData.ownerSeat!==unit.userData.ownerSeat){unit.position.copy(originPosition);return showGameError('O Canhão precisa de um Operador exatamente atrás.');}
    if(target||baseSeatAtCell(destination.x,destination.z)){unit.position.copy(originPosition);return showGameError('A casa à frente do Canhão está bloqueada.');}
    operator.position.set(origin.x*tile-half,.06,origin.z*tile-half);unit.position.set(destination.worldX,.06,destination.worldZ);return;
  }
  if(unit.userData.cardId==='cannon'&&cannonTarget){
    const operator=unitAtCell(origin.x-forward.x,origin.z-forward.z,unit);unit.position.copy(originPosition);
    if(operator?.userData.cardId!=='operator'||operator.userData.ownerSeat!==unit.userData.ownerSeat)return showGameError('O Canhão precisa de um Operador exatamente atrás.');
    [...units].filter(candidate=>Math.abs(Math.round((candidate.position.x+half)/tile)-destination.x)+Math.abs(Math.round((candidate.position.z+half)/tile)-destination.z)<=unit.userData.areaRadius).forEach(candidate=>{const impactDistance=Math.abs(Math.round((candidate.position.x+half)/tile)-destination.x)+Math.abs(Math.round((candidate.position.z+half)/tile)-destination.z),damage=impactDistance===0?unit.userData.damage:unit.userData.areaDamage;damageEffects.show(candidate.position,damage);candidate.userData.hp-=damage;updateHealthBadge(candidate);if(candidate.userData.hp<=0){units.splice(units.indexOf(candidate),1);hoverables.splice(hoverables.indexOf(candidate),1);scene.remove(candidate)}});return;
  }
  if(target){
    const defeatedPosition=target.position.clone();unit.position.copy(originPosition);
    const targetDistance=Math.abs(destination.x-origin.x)+Math.abs(destination.z-origin.z);
    if(!cannonTarget&&!isAttackDistanceValid(unit.userData,targetDistance))return showGameError('Alvo fora de alcance.');
    damageEffects.show(target.position,unit.userData.damage);target.userData.hp-=unit.userData.damage;updateHealthBadge(target);app.dataset.lastAttack=`${unit.userData.name}->${target.userData.name}:${Math.max(0,target.userData.hp)}`;
    if(target.userData.hp<=0){
      const removedTowerId=towerId(target);units.splice(units.indexOf(target),1);hoverables.splice(hoverables.indexOf(target),1);scene.remove(target);
      units.filter(candidate=>candidate.userData.mountedOnTowerId===removedTowerId).forEach(candidate=>{candidate.userData.mountedOnTowerId=null;candidate.userData.attackRange=CARD_BY_ID[candidate.userData.cardId].attackRange;candidate.position.y=.06;setArcherMountedState(candidate,false)});
      if(unit.userData.cardId!=='archer'&&!unitsAtCell(destination.x,destination.z,unit).length)unit.position.set(defeatedPosition.x,.06,defeatedPosition.z);
    }
  }else if(moveDistance>unit.userData.move){unit.position.copy(originPosition);showGameError('Movimento fora de alcance.');}
  else{unit.position.set(destination.worldX,.06,destination.worldZ);unit.userData.mountedOnTowerId=null;setArcherMountedState(unit,false);unit.userData.attackRange=CARD_BY_ID[unit.userData.cardId].attackRange}
}
function pick(e){
  if(justDragged){justDragged=false;return}
  if(selectedCardElement())return playSelectedCardAtPointer(e);
  const u=unitAtPointer(e),destination=boardCellAtPointer(e);
  if(selected&&canCommandUnit(selected)&&destination&&u!==selected){moveOrAttackUnit(selected,destination,u);clearMovementGrid();return}
  if(u)selectUnit(u);
}
function startDrag(e){
  if(e.button!==0)return;const u=unitAtPointer(e);if(!u)return;
  if(selectedCardElement()||(selected&&selected!==u&&canCommandUnit(selected)))return;
  if(u.userData.cardType==='construction'||u.userData.underConstruction)return showGameError(u.userData.underConstruction?'A construção ainda não foi concluída.':'Esta construção não pode se mover.');
  if(isMountedArcher(u)){selectUnit(u,{cinematic:false});return}
  if(onlineState&&(u.userData.ownerSeat!==selfSeat||onlineState.state.activeSeat!==selfSeat||u.userData.actionUsed))return;
  e.preventDefault();e.stopPropagation();cameraTransition.cancel({restoreControls:false});dragged=u;dragMoved=false;controls.enabled=false;selectUnit(u,{cinematic:false});renderer.domElement.setPointerCapture(e.pointerId);
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
    const destination={x:Math.round((dragged.position.x+half)/tile),z:Math.round((dragged.position.z+half)/tile),worldX:dragged.position.x,worldZ:dragged.position.z};
    moveOrAttackUnit(dragged,destination,null,dragged.userData.dragOrigin);
  }
  app.dataset.lastMoved=`${dragged.userData.name}:${dragged.position.x.toFixed(2)},${dragged.position.z.toFixed(2)}`;delete app.dataset.dragging;const wasDrag=dragMoved;justDragged=true;setTimeout(()=>{justDragged=false},0);dragged=null;
  if(wasDrag)clearMovementGrid();else centerCamera();
  if(renderer.domElement.hasPointerCapture(e.pointerId))renderer.domElement.releasePointerCapture(e.pointerId);
}
const hoverCard=document.querySelector('#hover-card');
function showHover(e){
  if(dragged){hoverCard.classList.remove('visible');return}const o=hoverableAtPointer(e);if(!o){hoverCard.classList.remove('visible');hoverCard.setAttribute('aria-hidden','true');return}
  hoverCard.innerHTML=cardMarkup(cards[o.userData.cardIndex],o.userData.cardIndex);const preview=hoverCard.firstElementChild;preview.classList.remove('selected');preview.tabIndex=-1;
  const hpValue=preview.querySelector('[data-stat="hp"]');if(hpValue)hpValue.textContent=String(Math.max(0,o.userData.hp));
  if(o.userData.underConstruction){const remaining=Math.max(1,(o.userData.buildReadyRound??currentRound()+1)-currentRound());preview.querySelector('.card-ability strong').textContent='EM CONSTRUÇÃO';preview.querySelector('.ability-cost').textContent=`${remaining}R`;preview.querySelector('.card-ability p').textContent=`Faltam ${remaining} rodada${remaining===1?'':'s'} para a conclusão.`}
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
const settingsModal=document.querySelector('#settings-modal'),settingsToggle=document.querySelector('#settings-toggle'),settingsClose=document.querySelector('#settings-close');let restoreControlsAfterSettings=true;
function syncSettingsButtons(){document.querySelectorAll('[data-graphics]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.graphics===graphicsQuality)));document.querySelectorAll('[data-camera-centering]').forEach(button=>button.setAttribute('aria-pressed',String((button.dataset.cameraCentering==='true')===cameraCentering)))}
function persistSettings(){saveGameSettings({graphics:graphicsQuality,cameraCentering})}
function applyGraphicsQuality(nextQuality){graphicsQuality=nextQuality;setSceneGraphicsQuality(nextQuality);setWorldGraphicsQuality(nextQuality);resize();persistSettings();syncSettingsButtons()}
function openSettings(){restoreControlsAfterSettings=controls.enabled;controls.enabled=false;settingsModal.hidden=false;syncSettingsButtons();settingsClose.focus()}
function closeSettings(){settingsModal.hidden=true;controls.enabled=restoreControlsAfterSettings&&!cameraTransition.active;settingsToggle.focus()}
settingsToggle.addEventListener('click',openSettings);settingsClose.addEventListener('click',closeSettings);settingsModal.addEventListener('click',event=>{if(event.target===settingsModal)closeSettings()});
document.querySelectorAll('[data-graphics]').forEach(button=>button.addEventListener('click',()=>applyGraphicsQuality(button.dataset.graphics)));
document.querySelectorAll('[data-camera-centering]').forEach(button=>button.addEventListener('click',()=>{cameraCentering=button.dataset.cameraCentering==='true';if(!cameraCentering)cameraTransition.cancel();persistSettings();syncSettingsButtons()}));
addEventListener('keydown',event=>{if(event.key==='Escape'&&!settingsModal.hidden)closeSettings()});syncSettingsButtons();
function setKingdomProgressHud(citizens,level,enemyLevel=1){document.querySelector('#self-citizens').textContent=String(citizens);document.querySelector('#self-level').textContent=`LV ${level}`;document.querySelector('#enemy-base-level').textContent=`LV ${enemyLevel}`;document.querySelector('#level-requirement').textContent=level>=2?'Nível 2 alcançado. Os próximos níveis serão adicionados depois.':'Nível 2: tenha 9 cidadãos em seu reino.'}
function syncLocalKingdomHud(){const localUnits=units.map(unit=>({ownerSeat:unit.userData.ownerSeat??1,cardId:unit.userData.cardId,x:Math.round((unit.position.x+half)/tile),z:Math.round((unit.position.z+half)/tile),underConstruction:Boolean(unit.userData.underConstruction)})),citizens=citizensForSeat(1,localUnits,roads,GAME_CONFIG.boardSize),level=citizens>=GAME_CONFIG.level2CitizenRequirement?2:1;setKingdomProgressHud(citizens,level)}
function endTurn(){if(onlineState)return sendOnlineAction({type:'end_turn'});activePlayer=activePlayer===1?2:1;if(activePlayer===1)round++;units.filter(unit=>unit.userData.underConstruction&&unit.userData.ownerSeat===activePlayer&&unit.userData.buildReadyRound<=round).forEach(unit=>applyConstructionState(unit,false));syncLocalKingdomHud();showDeploymentArea(false);syncInstantCommand()}
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
function selectedCardElement(){return hand.querySelector('.game-card.selected')}
function deploymentSeat(){return onlineState?selfSeat:activePlayer}
function showDeploymentArea(emphasized=false){deploymentOverlay.show(deploymentSeat(),emphasized)}
showDeploymentArea(false);
function syncBottomCommand(){bottomCommand.classList.toggle('hidden-by-card',Boolean(cardDrag||hand.querySelector('.game-card:hover')||hand.querySelector('.game-card.selected')))}
hand.addEventListener('pointerover',e=>{if(e.target.closest('.game-card'))syncBottomCommand()});
hand.addEventListener('pointerout',e=>{if(e.target.closest('.game-card'))requestAnimationFrame(syncBottomCommand)});
hand.addEventListener('click',e=>{const card=e.target.closest('.game-card');if(!card||suppressCardClick)return;const wasSelected=card.classList.contains('selected');hand.querySelectorAll('.game-card').forEach(el=>el.classList.remove('selected'));if(!wasSelected){card.classList.add('selected');clearUnitSelection()}showDeploymentArea(!wasSelected);syncBottomCommand()});

function cardTileAtPointer(e,cardIndex=Number(selectedCardElement()?.dataset.card)){
  const cell=boardCellAtPointer(e);if(!cell||!Number.isInteger(cardIndex))return null;
  const card=cards[cardIndex],occupants=unitsAtCell(cell.x,cell.z),tower=occupants.find(unit=>unit.userData.cardId==='tower'&&unit.userData.ownerSeat===deploymentSeat()&&!unit.userData.underConstruction);
  const mountable=card.id==='archer'&&tower&&occupants.length===1;
  const roadBlocker=occupants.some(unit=>['construction','machine'].includes(unit.userData.cardType));
  const roadOccupied=roads.some(road=>road.x===cell.x&&road.z===cell.z);
  const valid=card.id==='road'
    ? !baseSeatAtCell(cell.x,cell.z)&&!roadBlocker&&isRoadPlacementCell(deploymentSeat(),cell.x,cell.z,roads,GAME_CONFIG.boardSize)
    : isDeploymentCell(deploymentSeat(),cell.x,cell.z,GAME_CONFIG.boardSize)&&(!occupants.length||mountable)&&!(roadOccupied&&['construction','machine'].includes(card.type));
  return{...cell,valid,mountableTower:tower??null};
}
function makeSummonedUnit(cardIndex){
  return createCardUnit(cards[cardIndex],cardIndex);
}
function summonCard(cardIndex,x,z,mountableTower=null){const card=cards[cardIndex];if(card.id==='road'){reconcileRoads([...roads,{id:`local-road-${roads.length+1}`,ownerSeat:activePlayer,x:Math.round((x+half)/tile),z:Math.round((z+half)/tile)}]);syncLocalKingdomHud();return}const unit=makeSummonedUnit(cardIndex);unit.position.set(x,.06,z);unit.userData.ownerSeat=activePlayer;unit.rotation.y=card.id==='cannon'&&activePlayer===2?Math.PI:0;units.push(unit);hoverables.push(unit);scene.add(unit);if(card.buildRounds){unit.userData.buildReadyRound=round+card.buildRounds;applyConstructionState(unit,true)}if(card.id==='archer'&&mountableTower)mountArcherLocally(unit,mountableTower);else selectUnit(unit,{cinematic:false});syncLocalKingdomHud()}
function playSelectedCardAtPointer(e){
  const cardNode=selectedCardElement();if(!cardNode)return false;
  if(onlineState&&onlineState.state.activeSeat!==selfSeat){showGameError('Aguarde o seu turno.');return true}
  const index=Number(cardNode.dataset.card),tileInfo=cardTileAtPointer(e,index);
  if(!tileInfo?.valid){showGameError(cards[index].id==='road'?'Conecte a Rua ao castelo ou a outra Rua do seu reino.':'Escolha uma casa livre a até 2 casas do seu reino.');return true}
  if(onlineState)sendOnlineAction({type:'summon',cardInstanceId:cardNode.dataset.instance,x:tileInfo.x,z:tileInfo.z});
  else{summonCard(index,tileInfo.worldX,tileInfo.worldZ,tileInfo.mountableTower);cardNode.remove();document.querySelector('#hand-count').textContent=`${hand.querySelectorAll('.game-card').length} CARTAS`}
  cardNode.classList.remove('selected');showDeploymentArea(false);syncBottomCommand();return true;
}
hand.addEventListener('pointerdown',e=>{
  const card=e.target.closest('.game-card');if(!card||e.button!==0||onlineState&&onlineState.state.activeSeat!==selfSeat)return;e.preventDefault();cameraTransition.cancel({restoreControls:false});card.setPointerCapture(e.pointerId);controls.enabled=false;
  cardDrag={card,index:Number(card.dataset.card),instanceId:card.dataset.instance,startX:e.clientX,startY:e.clientY,moved:false,ghost:null,tile:null};showDeploymentArea(true);syncBottomCommand();
});
addEventListener('pointermove',e=>{
  if(!cardDrag)return;const distance=Math.hypot(e.clientX-cardDrag.startX,e.clientY-cardDrag.startY);if(!cardDrag.moved&&distance<7)return;
  if(!cardDrag.moved){cardDrag.moved=true;cardDrag.card.classList.add('summoning');cardDrag.ghost=cardDrag.card.cloneNode(true);cardDrag.ghost.classList.remove('selected');cardDrag.ghost.classList.add('summon-card-ghost');document.body.appendChild(cardDrag.ghost)}
  cardDrag.ghost.style.left=`${e.clientX}px`;cardDrag.ghost.style.top=`${e.clientY}px`;cardDrag.tile=cardTileAtPointer(e,cardDrag.index);tileMarker.visible=Boolean(cardDrag.tile);if(cardDrag.tile){tileMarker.position.set(cardDrag.tile.worldX,.075,cardDrag.tile.worldZ);tileMarker.material.color.setHex(cardDrag.tile.valid?0x6cad78:0xa54239)}
});
addEventListener('pointerup',e=>{
  if(!cardDrag)return;const drag=cardDrag;cardDrag=null;controls.enabled=true;tileMarker.visible=false;drag.ghost?.remove();drag.card.classList.remove('summoning');
  if(drag.moved){suppressCardClick=true;if(drag.tile?.valid){if(onlineState)sendOnlineAction({type:'summon',cardInstanceId:drag.instanceId,x:drag.tile.x,z:drag.tile.z});else{summonCard(drag.index,drag.tile.worldX,drag.tile.worldZ,drag.tile.mountableTower);drag.card.remove();document.querySelector('#hand-count').textContent=`${hand.querySelectorAll('.game-card').length} CARTAS`}}setTimeout(()=>{suppressCardClick=false;showDeploymentArea(false);syncBottomCommand()},0)}else{showDeploymentArea(Boolean(selectedCardElement()));syncBottomCommand()}
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
renderer.domElement.addEventListener('pointerdown',e=>{if(e.button!==0||!deckAtPointer(e))return;e.preventDefault();e.stopPropagation();cameraTransition.cancel({restoreControls:false});deckPressed=true;controls.enabled=false},true);
renderer.domElement.addEventListener('pointerup',e=>{if(!deckPressed)return;e.preventDefault();e.stopPropagation();deckPressed=false;controls.enabled=true;if(deckAtPointer(e))drawCardPreview()},true);
renderer.domElement.addEventListener('pointerleave',()=>{deckHover=false;deckPressed=false;controls.enabled=true;renderer.domElement.style.cursor='';hideDeckPreview()});
function moveTray(direction){const dock=document.querySelector('.card-dock'),maxShift=Math.max(0,hand.scrollWidth-dock.clientWidth+48);handShift=THREE.MathUtils.clamp(handShift+direction*120,-maxShift,0);hand.style.setProperty('--hand-shift',`${handShift}px`)}
document.querySelector('#tray-prev').addEventListener('click',()=>moveTray(1));document.querySelector('#tray-next').addEventListener('click',()=>moveTray(-1));

function sendOnlineAction(action){if(onlineState&&onlineSocket)onlineSocket.sendAction(action,onlineState.state.version)}
function activateSelectedInstant(){
  if(instantButton.hidden||instantButton.disabled||!towerForArcher(selected))return;
  if(onlineState){sendOnlineAction({type:'use_instant',unitId:selected.userData.serverUnitId});return}
  const directions=[[1,0],[-1,0],[0,1],[0,-1]],origin={x:Math.round((selected.position.x+half)/tile),z:Math.round((selected.position.z+half)/tile)};
  for(const [dx,dz] of directions){
    const target=units.filter(unit=>unit!==selected).map(unit=>{const x=Math.round((unit.position.x+half)/tile),z=Math.round((unit.position.z+half)/tile),step=dx?(x-origin.x)/dx:(z-origin.z)/dz;return{unit,x,z,step}}).filter(item=>item.step>=1&&item.step<=3&&item.x===origin.x+dx*item.step&&item.z===origin.z+dz*item.step).sort((a,b)=>a.step-b.step)[0]?.unit;
    if(target&&target.userData.ownerSeat!==selected.userData.ownerSeat){target.userData.hp-=2;updateHealthBadge(target);if(target.userData.hp<=0){units.splice(units.indexOf(target),1);hoverables.splice(hoverables.indexOf(target),1);scene.remove(target)}}
  }
  selected.userData.instantUsedRound=round;syncInstantCommand();
}
instantButton.addEventListener('click',activateSelectedInstant);
addEventListener('keydown',event=>{if(event.key.toLowerCase()==='f'&&!event.repeat&&!event.target.closest?.('input,textarea')){event.preventDefault();activateSelectedInstant()}});
function renderOnlineHand(instances){
  hand.replaceChildren();
  for(const instance of instances){const c=CARD_BY_ID[instance.cardId],index=cards.findIndex(card=>card.id===instance.cardId);if(!c||index<0||!/^[-0-9a-f]{36}$/i.test(instance.instanceId))continue;const holder=document.createElement('div');holder.innerHTML=cardMarkup(cards[index],index);const node=holder.firstElementChild;node.dataset.instance=instance.instanceId;hand.appendChild(node)}
  document.querySelector('#hand-count').textContent=`${hand.children.length} CARTAS`;
  syncBottomCommand();
}
function onlineUnit(data){
  const index=cards.findIndex(card=>card.id===data.cardId),unit=makeSummonedUnit(index),card=cards[index];
  unit.userData={...unit.userData,serverUnitId:data.id,ownerSeat:data.ownerSeat,cardId:data.cardId,cardIndex:index,hp:data.hp,maxHp:card.hp,actionUsed:data.actionUsed,abilityUsed:data.abilityUsed,instantUsedRound:data.instantUsedRound,mountedOnTowerId:data.mountedOnTowerId,buildReadyRound:data.buildReadyRound,attackRange:card.attackRange+(data.cardId==='archer'&&data.mountedOnTowerId?1:0)};
  updateHealthBadge(unit);
  const color=data.ownerSeat===1?0x168cff:0xff352f;setUnitTeamColor(unit,color);
  applyConstructionState(unit,Boolean(data.underConstruction));unit.position.set(data.x*tile-half,.06,data.z*tile-half);unit.rotation.y=data.cardId==='cannon'&&data.ownerSeat===2?Math.PI:0;setArcherMountedState(unit,false);return unit;
}
function reconcileOnlineUnits(serverUnits){
  const nextById=new Map(serverUnits.map(data=>[data.id,data]));
  units.forEach(unit=>{const next=nextById.get(unit.userData.serverUnitId),lost=Math.max(0,unit.userData.hp-(next?.hp??0));if(lost)damageEffects.show(unit.position,lost)});
  clearMovementGrid();units.splice(0).forEach(unit=>scene.remove(unit));hoverables.splice(0);selected=null;syncInstantCommand();
  serverUnits.forEach(data=>{const unit=onlineUnit(data);units.push(unit);hoverables.push(unit);scene.add(unit)});
  units.filter(isMountedArcher).forEach(unit=>{const tower=towerForArcher(unit);if(tower)placeArcherOnTower(unit,tower)});
  app.dataset.onlineUnits=String(serverUnits.length);
}
function setOnlinePerspective(){cameraTransition.cancel();camera.position.set(0,16,selfSeat===1?5.2:-5.2);camera.lookAt(0,0,0);controls.target.set(0,.2,0);controls.update();app.dataset.seat=String(selfSeat);app.dataset.perspectiveResets=String(Number(app.dataset.perspectiveResets??0)+1)}
function animateServerDraw(){const deck=deckScreenPosition(),target=hand.getBoundingClientRect(),ghost=document.createElement('div');ghost.className='draw-card-ghost';ghost.textContent='♜';ghost.style.left=`${deck.x-36}px`;ghost.style.top=`${deck.y-53}px`;document.body.appendChild(ghost);const dx=target.left+target.width/2-deck.x,dy=Math.min(innerHeight-125,target.top+40)-deck.y;ghost.animate([{transform:'translate(0,0) scale(.72)',opacity:.35},{transform:`translate(${dx}px,${dy}px) scale(.9)`,opacity:.1}],{duration:800,easing:'cubic-bezier(.2,.75,.2,1)'}).onfinish=()=>ghost.remove()}
function applyOnlineState(payload){
  const previous=onlineState,shouldSetPerspective=!previous||previous.self.seat!==payload.self.seat||previous.state.phase==='waiting';onlineState=payload;selfSeat=payload.self.seat;
  showDeploymentArea(false);
  document.querySelector('#waiting-code').textContent=payload.code;document.querySelector('#waiting-room').hidden=false;document.querySelector('#match-state').hidden=false;
  if(payload.state.phase==='waiting'){document.querySelector('#waiting-status').textContent='Aguardando o rei rival...';return}
  document.querySelector('#online-lobby').classList.add('closed');if(shouldSetPerspective)setOnlinePerspective();
  if(previous&&payload.self.hand.length>previous.self.hand.length)animateServerDraw();renderOnlineHand(payload.self.hand);reconcileRoads(payload.state.roads??[]);reconcileOnlineUnits(payload.state.units);
  const me=payload.state.players.find(player=>player.seat===selfSeat),enemy=payload.state.players.find(player=>player.seat!==selfSeat);if(!me||!enemy)return;
  setResource('#self-energy',me.energy,me.maxEnergy??GAME_CONFIG.maxEnergy);setResource('#self-health',me.baseHp,GAME_CONFIG.startingBaseHp);setKingdomProgressHud(me.citizens??0,me.baseLevel??1,enemy.baseLevel??1);deckRemaining=me.deckCount;document.querySelector('#deck-count').textContent=String(deckRemaining);
  document.querySelector('.enemy-base-tag i').style.width=`${Math.max(0,enemy.baseHp/GAME_CONFIG.startingBaseHp*100)}%`;
  document.querySelector('.enemy-base-tag').setAttribute('aria-label',`Castelo inimigo nível ${enemy.baseLevel??1}, vida ${enemy.baseHp} de ${GAME_CONFIG.startingBaseHp}`);
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
document.querySelector('#dev-mode').addEventListener('click',()=>{devMode=true;onlineState=null;selfSeat=null;app.dataset.mode='dev';document.querySelector('#online-lobby').classList.add('closed');document.querySelector('#match-state').hidden=false;document.querySelector('#turn-label').textContent='TESTE LIVRE';document.querySelector('#turn-clock').textContent='∞';document.querySelector('#end-turn').disabled=false;setResource('#self-energy','∞','');setResource('#self-health',GAME_CONFIG.startingBaseHp,GAME_CONFIG.startingBaseHp);syncLocalKingdomHud();showDeploymentArea(false)});
onlineSocket.connect();
setInterval(()=>{if(!onlineState?.state.turnEndsAt)return;const remaining=Math.max(0,onlineState.state.turnEndsAt-Date.now()),minutes=Math.floor(remaining/60000),seconds=Math.floor(remaining%60000/1000);document.querySelector('#turn-clock').textContent=`${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`},250);

const clock=new THREE.Clock();
const enemyBaseTag=document.querySelector('.enemy-base-tag');
const baseTagPoint=new THREE.Vector3();
function positionEnemyStatus(){const target=selfSeat===2?alliedKeep:enemyKeep;target.getWorldPosition(baseTagPoint);baseTagPoint.y+=4.9;baseTagPoint.project(camera);enemyBaseTag.style.left=`${(baseTagPoint.x*.5+.5)*innerWidth}px`;enemyBaseTag.style.top=`${(-baseTagPoint.y*.5+.5)*innerHeight}px`;enemyBaseTag.style.visibility=baseTagPoint.z<1?'visible':'hidden';}
let lastStatusUpdate=0;
function animate(){requestAnimationFrame(animate);const delta=clock.getDelta(),t=clock.elapsedTime;controls.update();cameraTransition.update();damageEffects.update(delta);if(t-lastStatusUpdate>(graphicsQuality==='low'?.1:.033)){positionEnemyStatus();lastStatusUpdate=t}topDeckCard.position.y=THREE.MathUtils.lerp(topDeckCard.position.y,deckHover ? .98 : .766,.14);topDeckCard.rotation.z=THREE.MathUtils.lerp(topDeckCard.rotation.z,deckHover ? -.08 : 0,.12);if(graphicsQuality==='high'){updateDynamicLighting(t);updateTerrain(t);units.forEach((u,i)=>{const rig=u.getObjectByName('rig');rig.position.y=.18+Math.sin(t*1.35+i*1.7)*.012;rig.rotation.z=Math.sin(t*.8+i)*.006;u.traverse(o=>{if(o.userData.magic){o.rotation.y=t*1.5;o.position.y=2.23+Math.sin(t*2.5)*.045;}})});wisps.forEach((w,i)=>{w.position.x=w.userData.baseX+Math.sin(t*.12+i)*.55;w.material.opacity=.012+i*.003+Math.sin(t*.35+i)*.004;});fireLights.forEach((light,i)=>{const pulse=.91+Math.sin(t*7.4+light.userData.phase)*.065+Math.sin(t*13.1+i)*.025;light.intensity=light.userData.baseIntensity*pulse;})}renderer.render(scene,camera)}
function resize(){const aspect=innerWidth/innerHeight,view=innerWidth<700?12.6:11.45;camera.left=-view*aspect;camera.right=view*aspect;camera.top=view;camera.bottom=-view;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,graphicsQuality==='low'?.9:1.7))}addEventListener('resize',resize);resize();animate();setTimeout(()=>document.querySelector('.loading').classList.add('done'),500);
