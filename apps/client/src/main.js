import * as THREE from 'three';
import { CARD_BY_ID, ORTHOGONAL_DIRECTIONS, cellKey, citizensForSeat, completedRoadCount, forwardDeltaForSeat, gridCellsBetween, isAttackDistanceValid, isCannonTargetValid, isDeploymentCell, isRoadPlacementCell, movementDistance } from '@tronos/shared/cards';
import { GAME_CONFIG } from '@tronos/shared/game-config';
import { createCinematicCamera } from './core/createCinematicCamera.js';
import { createGameScene } from './core/createGameScene.js';
import { loadGameSettings, saveGameSettings } from './core/gameSettings.js';
import { add } from './core/scenePrimitives.js';
import { createBoardCoordinates } from './gameplay/boardCoordinates.js';
import { createDeploymentOverlay } from './gameplay/createDeploymentOverlay.js';
import { createDamageEffects } from './gameplay/damageEffects.js';
import { createMovementOverlay } from './gameplay/createMovementOverlay.js';
import { createMageEffects } from './gameplay/mageEffects.js';
import { applyConstructionState as applyUnitConstructionState, isMountedArcher, setUnitTeamColor } from './gameplay/unitState.js';
import { createCardUnit } from './models/createCardUnit.js';
import { setArcherMountedState } from './models/unitModels.js';
import { makeRoad } from './assets/models/roadModel.js';
import { makeFireHazard } from './assets/models/fireHazardModel.js';
import { GameSocketClient, SERVER_EVENTS } from './network/gameSocket.js';
import { mountGameShell } from './ui/gameShell.js';
import { cardMarkup, cards, hideDeckPreview as hideCardPreview, showDeckPreview } from './ui/cardView.js';
import { setResource } from './ui/resourceView.js';
import { setMageFireBadgeActive, updateHealthBadge } from './ui/unitHealthBadge.js';
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
const mageEffects = createMageEffects(scene, tile);

// Each miniature is snapped to the exact center of a tile. Scale 0.64 keeps
// even the outermost weapon silhouette inside the 1.08 × 1.08 footprint.
const units=[];
const hoverables=[];
const roads=[];const roadMeshes=[];const fires=[];const fireMeshes=[];
const { unitAtCell, unitsAtCell, baseSeatAtCell, baseCellsForSeat, snapToTile } = createBoardCoordinates({ getUnits: () => units, tile, half });

function roadConnections(road,allRoads){
  const bases=new Set(baseCellsForSeat(road.ownerSeat).map(cell=>cellKey(cell.x,cell.z))),owned=new Set(allRoads.filter(item=>item.ownerSeat===road.ownerSeat&&!item.underConstruction).map(item=>cellKey(item.x,item.z)));
  const names=['east','west','south','north'];return Object.fromEntries(ORTHOGONAL_DIRECTIONS.map((direction,index)=>{const key=cellKey(road.x+direction.x,road.z+direction.z);return[names[index],owned.has(key)||bases.has(key)]}));
}
function reconcileRoads(serverRoads){
  roadMeshes.splice(0).forEach(mesh=>scene.remove(mesh));roads.splice(0,roads.length,...serverRoads.map(road=>({...road})));
  roads.forEach(road=>{const mesh=makeRoad(roadConnections(road,roads),tile,{underConstruction:Boolean(road.underConstruction)});mesh.position.set(road.x*tile-half,.072,road.z*tile-half);mesh.userData={...mesh.userData,roadId:road.id,ownerSeat:road.ownerSeat,buildReadyRound:road.buildReadyRound};roadMeshes.push(mesh);scene.add(mesh)});
  app.dataset.roads=String(roads.length);
}
function reconcileFires(serverFires){
  fireMeshes.splice(0).forEach(mesh=>scene.remove(mesh));fires.splice(0,fires.length,...serverFires.map(fire=>({...fire,damagedUnitIds:[...(fire.damagedUnitIds??[])]})));
  fires.forEach(fire=>{const mesh=makeFireHazard(tile);mesh.position.set(fire.x*tile-half,.079,fire.z*tile-half);mesh.userData.fireId=fire.id;fireMeshes.push(mesh);scene.add(mesh)});
  app.dataset.fires=String(fires.length);
}

// Selection and unit status HUD.
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let selected=null,dragged=null,dragMoved=false,justDragged=false,onlineState=null,selfSeat=null,onlineSocket=null,devMode=false;
const boardPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
const dragPoint=new THREE.Vector3();
const archerMountPoint=new THREE.Vector3();
const tileMarker=add(new THREE.PlaneGeometry(tile*.9,tile*.9),new THREE.MeshBasicMaterial({color:0xcaa45d,transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide}),scene,[0,.075,0],[-Math.PI/2,0,0]);
tileMarker.visible=false;
const mageTargetGeometry=new THREE.PlaneGeometry(tile*.78,tile*.78),mageTargetMaterial=new THREE.MeshBasicMaterial({color:0xff4728,transparent:true,opacity:.48,depthWrite:false,side:THREE.DoubleSide}),mageChosenMaterial=new THREE.MeshBasicMaterial({color:0xffc247,transparent:true,opacity:.78,depthWrite:false,side:THREE.DoubleSide});
const mageTargetMarkers=[];let mageAiming=false,mageFireCells=[];
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
const devUnitTools=document.querySelector('#dev-unit-tools');
const towerId=unit=>unit.userData.serverUnitId??unit.uuid;
function towerForArcher(unit){return unit?.userData.cardId==='archer'&&unit.userData.mountedOnTowerId?units.find(candidate=>towerId(candidate)===unit.userData.mountedOnTowerId&&candidate.userData.cardId==='tower'&&!candidate.userData.underConstruction):null}
function currentRound(){return onlineState?.state.round??round}
function syncInstantCommand(){
  app.dataset.instantAvailable=String(Boolean(towerForArcher(selected)));
}
function mageFireTriggerAtPointer(e){
  const rect=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-rect.left)/rect.width)*2-1;pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;ray.setFromCamera(pointer,camera);
  const hit=ray.intersectObjects(units,true).find(item=>item.object.userData.mageFireTrigger);if(!hit)return null;
  let unit=hit.object;while(unit.parent&&!unit.userData.selectable)unit=unit.parent;return unit.userData.selectable?unit:null;
}
function clearMageTargets(){mageTargetMarkers.splice(0).forEach(marker=>scene.remove(marker));if(selected?.userData.cardId==='mage')setMageFireBadgeActive(selected,false);mageAiming=false;mageFireCells=[]}
function showMageTargets(){
  mageTargetMarkers.splice(0).forEach(marker=>scene.remove(marker));if(!mageAiming||selected?.userData.cardId!=='mage')return;
  const origin={x:Math.round((selected.position.x+half)/tile),z:Math.round((selected.position.z+half)/tile)},chosen=new Set(mageFireCells.map(cell=>cellKey(cell.x,cell.z)));
  for(let dx=-4;dx<=4;dx++)for(let dz=-4;dz<=4;dz++){const value=Math.abs(dx)+Math.abs(dz),x=origin.x+dx,z=origin.z+dz;if(value<1||value>4||x<0||x>=GAME_CONFIG.boardSize||z<0||z>=GAME_CONFIG.boardSize)continue;const marker=new THREE.Mesh(mageTargetGeometry,chosen.has(cellKey(x,z))?mageChosenMaterial:mageTargetMaterial);marker.rotation.x=-Math.PI/2;marker.position.set(x*tile-half,.082,z*tile-half);scene.add(marker);mageTargetMarkers.push(marker)}
}
function syncMageCommands(){
  if(selected?.userData.cardId!=='mage'){clearMageTargets();return}
  setMageFireBadgeActive(selected,mageAiming);
}
function syncDevUnitTools(){const visible=devMode&&Boolean(selected);devUnitTools.hidden=!visible;if(!visible)return;document.querySelector('#dev-unit-name').textContent=selected.userData.name;document.querySelectorAll('[data-unit-level]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.unitLevel)===(selected.userData.devLevel??1))))}
function clearUnitSelection(){if(!selected)return;const ring=selected.getObjectByName('selectionRing');if(ring)ring.material.emissiveIntensity=ring.userData.baseEmissiveIntensity??.75;clearMageTargets();selected=null;clearMovementGrid();syncInstantCommand();syncMageCommands();syncDevUnitTools()}
function centerCamera(){if(cameraCentering)cameraTransition.focusBoard({side:selfSeat===2?-1:1})}
function selectUnit(u,{cinematic=true}={}){if(selected!==u)clearMageTargets();if(selected){const previousRing=selected.getObjectByName('selectionRing');if(previousRing)previousRing.material.emissiveIntensity=previousRing.userData.baseEmissiveIntensity??.75}selected=u;const ring=selected.getObjectByName('selectionRing');if(ring)ring.material.emissiveIntensity=1.6;showMovementGrid(u);syncInstantCommand();syncMageCommands();syncDevUnitTools();if(cinematic)centerCamera()}
function boardCellAtPointer(e){
  const rect=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-rect.left)/rect.width)*2-1;pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;ray.setFromCamera(pointer,camera);
  if(!ray.ray.intersectPlane(boardPlane,dragPoint)||Math.abs(dragPoint.x)>half+tile/2||Math.abs(dragPoint.z)>half+tile/2)return null;
  const worldX=snapToTile(dragPoint.x),worldZ=snapToTile(dragPoint.z);
  return{x:Math.round((worldX+half)/tile),z:Math.round((worldZ+half)/tile),worldX,worldZ};
}
function baseSeatAtPointer(e){
  const rect=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-rect.left)/rect.width)*2-1;pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;ray.setFromCamera(pointer,camera);
  if(ray.intersectObject(alliedKeep,true).length)return 1;
  if(ray.intersectObject(enemyKeep,true).length)return 2;
  return null;
}
function removeLocalUnit(unit){
  const removedTowerId=towerId(unit);units.splice(units.indexOf(unit),1);hoverables.splice(hoverables.indexOf(unit),1);scene.remove(unit);
  units.filter(candidate=>candidate.userData.mountedOnTowerId===removedTowerId).forEach(candidate=>{candidate.userData.mountedOnTowerId=null;candidate.userData.attackRange=CARD_BY_ID[candidate.userData.cardId].attackRange;candidate.position.y=.06;setArcherMountedState(candidate,false)});
}
function damageLocalUnit(unit,amount){if(!unit||!units.includes(unit))return;damageEffects.show(unit.position,amount);unit.userData.hp-=amount;updateHealthBadge(unit);if(unit.userData.hp<=0)removeLocalUnit(unit)}
function applyLocalFireEntry(unit){
  const cell={x:Math.round((unit.position.x+half)/tile),z:Math.round((unit.position.z+half)/tile)};
  for(const fire of fires.filter(item=>item.x===cell.x&&item.z===cell.z&&!item.damagedUnitIds.includes(unit.uuid))){fire.damagedUnitIds.push(unit.uuid);damageLocalUnit(unit,1);if(!units.includes(unit))break}
}
function resolveLocalFires(endingSeat){
  fires.filter(fire=>fire.ownerSeat!==endingSeat).forEach(fire=>{const occupant=unitAtCell(fire.x,fire.z);if(occupant&&!fire.damagedUnitIds.includes(occupant.uuid))damageLocalUnit(occupant,1)});
  reconcileFires(fires.filter(fire=>fire.ownerSeat===endingSeat));
}
function canCommandUnit(unit){return Boolean(unit&&(devMode?unit.userData.ownerSeat===activePlayer:onlineState&&unit.userData.ownerSeat===selfSeat&&onlineState.state.activeSeat===selfSeat&&!unit.userData.actionUsed))}
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
  if(unit.userData.cardId==='mage'&&(hostileTarget||baseTarget)){unit.position.copy(originPosition);showGameError('Use CONJURAR FOGO e escolha uma ou duas casas.');return}
  const forward=forwardDeltaForSeat(unit.userData.ownerSeat);
  const cannonTarget=unit.userData.cardId==='cannon'&&isCannonTargetValid({...origin,ownerSeat:unit.userData.ownerSeat},destination);
  const cannonMove=unit.userData.cardId==='cannon'&&destination.x===origin.x+forward.x&&destination.z===origin.z+forward.z;
  if(isMountedArcher(unit)&&!hostileTarget&&!baseTarget){unit.position.copy(originPosition);showGameError('O arqueiro na torre não pode se mover.');return}
  const blockedByUnit=gridCellsBetween(origin,destination).some(cell=>unitAtCell(cell.x,cell.z,unit));
  const mountedShot=isMountedArcher(unit)&&(hostileTarget||baseTarget);
  if(blockedByUnit&&!mountedShot){unit.position.copy(originPosition);return}
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
    operator.position.set(origin.x*tile-half,.06,origin.z*tile-half);unit.position.set(destination.worldX,.06,destination.worldZ);applyLocalFireEntry(operator);applyLocalFireEntry(unit);return;
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
  else{unit.position.set(destination.worldX,.06,destination.worldZ);unit.userData.mountedOnTowerId=null;setArcherMountedState(unit,false);unit.userData.attackRange=CARD_BY_ID[unit.userData.cardId].attackRange;applyLocalFireEntry(unit)}
}
function toggleMageFireCell(destination){
  const origin={x:Math.round((selected.position.x+half)/tile),z:Math.round((selected.position.z+half)/tile)},value=Math.abs(destination.x-origin.x)+Math.abs(destination.z-origin.z);
  if(value<1||value>CARD_BY_ID.mage.attackRange)return showGameError('Escolha uma casa a até 4 quadrados do Mago.');
  const index=mageFireCells.findIndex(cell=>cell.x===destination.x&&cell.z===destination.z);if(index>=0)mageFireCells.splice(index,1);else if(mageFireCells.length<CARD_BY_ID.mage.maxFireCells)mageFireCells.push({x:destination.x,z:destination.z});else return showGameError('O Mago pode incendiar no máximo duas casas.');
  showMageTargets();syncMageCommands();
}
function pick(e){
  if(justDragged){justDragged=false;return}
  const fireMage=mageFireTriggerAtPointer(e);if(fireMage){if(selected!==fireMage)selectUnit(fireMage,{cinematic:false});activateMageFire();return}
  if(selectedCardElement())return playSelectedCardAtPointer(e);
  const clickedBaseSeat=selected&&canCommandUnit(selected)?baseSeatAtPointer(e):null,enemySeat=selected?.userData.ownerSeat===1?2:1;
  if(clickedBaseSeat===enemySeat){const cell=baseCellsForSeat(clickedBaseSeat).find(item=>movementOverlay.isInteractiveCell(item.x,item.z));if(cell){moveOrAttackUnit(selected,{...cell,worldX:cell.x*tile-half,worldZ:cell.z*tile-half});clearMovementGrid();return}}
  const u=unitAtPointer(e),destination=boardCellAtPointer(e);
  if(mageAiming&&selected?.userData.cardId==='mage'&&destination){toggleMageFireCell(destination);return}
  if(selected&&canCommandUnit(selected)&&destination&&u!==selected){if(!movementOverlay.isInteractiveCell(destination.x,destination.z)){if(u)selectUnit(u);return}moveOrAttackUnit(selected,destination,u);clearMovementGrid();return}
  if(u)selectUnit(u);
}
function startDrag(e){
  if(e.button!==0)return;if(mageFireTriggerAtPointer(e)){e.preventDefault();e.stopPropagation();return}const u=unitAtPointer(e);if(!u)return;
  if(selectedCardElement()||(selected&&selected!==u&&canCommandUnit(selected)))return;
  if(devMode&&u.userData.ownerSeat!==activePlayer){selectUnit(u,{cinematic:false});return showGameError('Passe o turno para controlar este reino.');}
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
  let changedCell=false;
  if(dragMoved){
    const destination={x:Math.round((dragged.position.x+half)/tile),z:Math.round((dragged.position.z+half)/tile),worldX:dragged.position.x,worldZ:dragged.position.z};
    const originCell={x:Math.round((dragged.userData.dragOrigin.x+half)/tile),z:Math.round((dragged.userData.dragOrigin.z+half)/tile)};
    changedCell=destination.x!==originCell.x||destination.z!==originCell.z;
    if(changedCell&&movementOverlay.isInteractiveCell(destination.x,destination.z))moveOrAttackUnit(dragged,destination,null,dragged.userData.dragOrigin);else dragged.position.copy(dragged.userData.dragOrigin);
  }
  app.dataset.lastMoved=`${dragged.userData.name}:${dragged.position.x.toFixed(2)},${dragged.position.z.toFixed(2)}`;delete app.dataset.dragging;const wasDrag=dragMoved&&changedCell;justDragged=true;setTimeout(()=>{justDragged=false},0);dragged=null;
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

let activePlayer=1,round=1,devCardLevel=1,devInstantBuild=false;
const devKingdoms={1:{baseLevel:1,baseSize:1,hp:GAME_CONFIG.startingBaseHp},2:{baseLevel:1,baseSize:1,hp:GAME_CONFIG.startingBaseHp}};
const keepForSeat=seat=>seat===1?alliedKeep:enemyKeep;
const settingsModal=document.querySelector('#settings-modal'),settingsToggle=document.querySelector('#settings-toggle'),settingsClose=document.querySelector('#settings-close');let restoreControlsAfterSettings=true;
function syncDevSettings(){if(!devMode)return;const kingdom=devKingdoms[activePlayer];document.querySelector('#dev-base-size').textContent=String(kingdom.baseSize);document.querySelectorAll('[data-base-level]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.baseLevel)===kingdom.baseLevel)));document.querySelectorAll('[data-dev-settings] [data-card-level]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.cardLevel)===devCardLevel)));document.querySelector('#dev-instant-build').setAttribute('aria-pressed',String(devInstantBuild));document.querySelector('#dev-instant-build').textContent=devInstantBuild?'LIGADO':'DESLIGADO'}
function syncSettingsButtons(){document.querySelectorAll('[data-graphics]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.graphics===graphicsQuality)));document.querySelectorAll('[data-camera-centering]').forEach(button=>button.setAttribute('aria-pressed',String((button.dataset.cameraCentering==='true')===cameraCentering)));syncDevSettings()}
function persistSettings(){saveGameSettings({graphics:graphicsQuality,cameraCentering})}
function applyGraphicsQuality(nextQuality){graphicsQuality=nextQuality;setSceneGraphicsQuality(nextQuality);setWorldGraphicsQuality(nextQuality);resize();persistSettings();syncSettingsButtons()}
function openSettings(){restoreControlsAfterSettings=controls.enabled;controls.enabled=false;settingsModal.hidden=false;syncSettingsButtons();settingsClose.focus()}
function closeSettings(){settingsModal.hidden=true;controls.enabled=restoreControlsAfterSettings&&!cameraTransition.active;settingsToggle.focus()}
settingsToggle.addEventListener('click',openSettings);settingsClose.addEventListener('click',closeSettings);settingsModal.addEventListener('click',event=>{if(event.target===settingsModal)closeSettings()});
document.querySelectorAll('[data-graphics]').forEach(button=>button.addEventListener('click',()=>applyGraphicsQuality(button.dataset.graphics)));
document.querySelectorAll('[data-camera-centering]').forEach(button=>button.addEventListener('click',()=>{cameraCentering=button.dataset.cameraCentering==='true';if(!cameraCentering)cameraTransition.cancel();persistSettings();syncSettingsButtons()}));
addEventListener('keydown',event=>{if(event.key==='Escape'&&!settingsModal.hidden)closeSettings()});syncSettingsButtons();
function resizeDevBase(delta){const kingdom=devKingdoms[activePlayer];kingdom.baseSize=THREE.MathUtils.clamp(kingdom.baseSize+delta,1,6);keepForSeat(activePlayer).scale.setScalar(.85+kingdom.baseSize*.15);syncDevSettings()}
document.querySelector('#dev-base-size-minus').addEventListener('click',()=>resizeDevBase(-1));document.querySelector('#dev-base-size-plus').addEventListener('click',()=>resizeDevBase(1));
document.querySelectorAll('[data-base-level]').forEach(button=>button.addEventListener('click',()=>{devKingdoms[activePlayer].baseLevel=Number(button.dataset.baseLevel);syncDevKingdomHud()}));
document.querySelectorAll('[data-dev-settings] [data-card-level]').forEach(button=>button.addEventListener('click',()=>{devCardLevel=Number(button.dataset.cardLevel);syncDevSettings();if(!gallery.hidden)renderDevGallery();if(!galleryDetail.hidden)showDevCardDetail(galleryCardIndex)}));
document.querySelector('#dev-instant-build').addEventListener('click',()=>{devInstantBuild=!devInstantBuild;if(devInstantBuild)units.filter(unit=>unit.userData.ownerSeat===activePlayer&&unit.userData.underConstruction).forEach(unit=>applyConstructionState(unit,false));syncDevSettings();syncDevKingdomHud()});
function removeDevUnit(unit){if(!unit)return;const removedId=towerId(unit);units.splice(units.indexOf(unit),1);hoverables.splice(hoverables.indexOf(unit),1);scene.remove(unit);units.filter(candidate=>candidate.userData.mountedOnTowerId===removedId).forEach(candidate=>{candidate.userData.mountedOnTowerId=null;candidate.userData.attackRange=CARD_BY_ID[candidate.userData.cardId].attackRange;candidate.position.y=.06;setArcherMountedState(candidate,false)});if(selected===unit)clearUnitSelection();syncDevKingdomHud()}
document.querySelector('#dev-delete-unit').addEventListener('click',()=>{if(devMode)removeDevUnit(selected)});
document.querySelectorAll('[data-unit-level]').forEach(button=>button.addEventListener('click',()=>{if(!devMode||!selected)return;const level=Number(button.dataset.unitLevel),card=cards[selected.userData.cardIndex],multiplier=1+(level-1)*.25;selected.userData.devLevel=level;if(card.hp!==null){selected.userData.maxHp=Math.ceil(card.hp*multiplier);selected.userData.hp=selected.userData.maxHp;updateHealthBadge(selected)}selected.userData.damage=Math.ceil((card.damage??0)*multiplier);syncDevUnitTools()}));
document.querySelector('#dev-clear-board').addEventListener('click',()=>{if(!devMode)return;clearUnitSelection();units.splice(0).forEach(unit=>scene.remove(unit));hoverables.splice(0);reconcileRoads([]);reconcileFires([]);syncDevKingdomHud();showGameError('Tabuleiro de testes limpo.')});
function setKingdomProgressHud(citizens,level,enemyLevel=1){document.querySelector('#self-citizens').textContent=String(citizens);document.querySelector('#self-level').textContent=`LV ${level}`;document.querySelector('#enemy-base-level').textContent=`LV ${enemyLevel}`;document.querySelector('#level-requirement').textContent=level>=2?'Nível 2 alcançado. Os próximos níveis serão adicionados depois.':'Nível 2: tenha 9 cidadãos e 2 ruas concluídas em seu reino.'}
function syncTurnRoundStatus(turn,roundNumber){document.querySelector('#turn-round-card').hidden=false;document.querySelector('#current-turn-number').textContent=String(turn);document.querySelector('#current-round-number').textContent=String(roundNumber)}
function syncLocalKingdomHud(){const localUnits=units.map(unit=>({ownerSeat:unit.userData.ownerSeat??1,cardId:unit.userData.cardId,x:Math.round((unit.position.x+half)/tile),z:Math.round((unit.position.z+half)/tile),underConstruction:Boolean(unit.userData.underConstruction)})),citizens=citizensForSeat(1,localUnits,roads,GAME_CONFIG.boardSize),level=citizens>=GAME_CONFIG.level2CitizenRequirement&&completedRoadCount(1,roads)>=GAME_CONFIG.level2RoadRequirement?2:1;setKingdomProgressHud(citizens,level)}
function finishLocalRoadsForSeat(seat){let roadsChanged=false;roads.forEach(road=>{if(road.underConstruction&&road.ownerSeat===seat&&road.buildReadyRound<=round){road.underConstruction=false;roadsChanged=true}});if(roadsChanged)reconcileRoads([...roads])}
function endTurn(){if(onlineState)return sendOnlineAction({type:'end_turn'});resolveLocalFires(activePlayer);activePlayer=activePlayer===1?2:1;if(activePlayer===1)round++;units.filter(unit=>unit.userData.underConstruction&&unit.userData.ownerSeat===activePlayer&&unit.userData.buildReadyRound<=round).forEach(unit=>applyConstructionState(unit,false));finishLocalRoadsForSeat(activePlayer);units.filter(unit=>unit.userData.ownerSeat===activePlayer).forEach(unit=>{unit.userData.actionUsed=false;unit.userData.abilityUsed=false});syncTurnRoundStatus(activePlayer,round);syncLocalKingdomHud();showDeploymentArea(false);clearMageTargets();syncInstantCommand();syncMageCommands()}
function syncDevKingdomHud(){const localUnits=units.map(unit=>({ownerSeat:unit.userData.ownerSeat??1,cardId:unit.userData.cardId,x:Math.round((unit.position.x+half)/tile),z:Math.round((unit.position.z+half)/tile),underConstruction:Boolean(unit.userData.underConstruction)})),citizens=citizensForSeat(activePlayer,localUnits,roads,GAME_CONFIG.boardSize),enemySeat=activePlayer===1?2:1;setKingdomProgressHud(citizens,devKingdoms[activePlayer].baseLevel,devKingdoms[enemySeat].baseLevel);document.querySelector('#level-requirement').textContent=`Nível selecionado manualmente para o Reino ${activePlayer}.`;setResource('#self-health',devKingdoms[activePlayer].hp,GAME_CONFIG.startingBaseHp);document.querySelector('.enemy-base-tag i').style.width=`${devKingdoms[enemySeat].hp/GAME_CONFIG.startingBaseHp*100}%`;document.querySelector('#turn-label').textContent=`REINO ${activePlayer} · TURNO ${round}`;syncDevSettings()}
function endDevTurn(){resolveLocalFires(activePlayer);clearUnitSelection();activePlayer=activePlayer===1?2:1;if(activePlayer===1)round++;selfSeat=activePlayer;units.filter(unit=>unit.userData.underConstruction&&unit.userData.ownerSeat===activePlayer&&(devInstantBuild||unit.userData.buildReadyRound<=round)).forEach(unit=>applyConstructionState(unit,false));finishLocalRoadsForSeat(activePlayer);units.filter(unit=>unit.userData.ownerSeat===activePlayer).forEach(unit=>{unit.userData.actionUsed=false;unit.userData.abilityUsed=false});syncTurnRoundStatus(activePlayer,round);syncDevKingdomHud();showDeploymentArea(false);syncInstantCommand();syncMageCommands();cameraTransition.focusBoard({side:activePlayer===2?-1:1})}
document.querySelector('#end-turn').addEventListener('click',()=>devMode?endDevTurn():endTurn());addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.target.closest?.('input,select,button'))(devMode?endDevTurn():endTurn())});

const deckPreview=document.querySelector('#deck-preview');
function previewDeckCard(index){
  showDeckPreview(deckPreview,cards[index]);
}
function hideDeckPreview(){hideCardPreview(deckPreview)}
const hand=document.querySelector('#card-hand');
hand.replaceChildren();
document.querySelector('#hand-count').textContent=`${hand.children.length} CARTAS`;
const bottomCommand=document.querySelector('.bottom-command');
let cardDrag=null,suppressCardClick=false,cardCasting=false;
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
function summonCard(cardIndex,x,z,mountableTower=null,level=devCardLevel){const card=cards[cardIndex];if(card.id==='road'){reconcileRoads([...roads,{id:`local-road-${roads.length+1}`,ownerSeat:activePlayer,x:Math.round((x+half)/tile),z:Math.round((z+half)/tile),underConstruction:!devInstantBuild,buildReadyRound:round+card.buildRounds}]);syncDevKingdomHud();return}const unit=makeSummonedUnit(cardIndex);unit.position.set(x,.06,z);unit.userData.ownerSeat=activePlayer;unit.userData.devLevel=level;unit.rotation.y=card.id==='cannon'&&activePlayer===2?Math.PI:0;setUnitTeamColor(unit,activePlayer===1?0x168cff:0xff352f);units.push(unit);hoverables.push(unit);scene.add(unit);if(card.buildRounds&&!devInstantBuild){unit.userData.buildReadyRound=round+card.buildRounds;applyConstructionState(unit,true)}if(card.id==='archer'&&mountableTower)mountArcherLocally(unit,mountableTower);else selectUnit(unit,{cinematic:false});syncDevKingdomHud()}
const summonFlightPoint=new THREE.Vector3();
function animateCardSummon(cardNode,tileInfo,onCommit){
  if(cardCasting)return false;cardCasting=true;
  const rect=cardNode.getBoundingClientRect(),flight=cardNode.cloneNode(true);flight.classList.remove('selected','aiming');flight.classList.add('summon-card-flight');flight.style.left=`${rect.left}px`;flight.style.top=`${rect.top}px`;flight.style.width=`${rect.width}px`;flight.style.height=`${rect.height}px`;document.body.appendChild(flight);cardNode.classList.remove('aiming');cardNode.classList.add('casting');
  summonFlightPoint.set(tileInfo.worldX,.5,tileInfo.worldZ).project(camera);const targetX=(summonFlightPoint.x*.5+.5)*innerWidth,targetY=(-summonFlightPoint.y*.5+.5)*innerHeight,dx=targetX-(rect.left+rect.width/2),dy=targetY-(rect.top+rect.height/2),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  app.dataset.cardFlight='active';let committed=false;const commit=()=>{if(committed)return;committed=true;onCommit()};
  const keyframes=reduced
    ? [{transform:'scale(1)',opacity:1},{transform:`translate(${dx}px,${dy}px) scale(.16)`,opacity:0}]
    : [{transform:'translate(0,0) rotate(0) scale(1)',opacity:1},{offset:.08,transform:'translate(-5px,1px) rotate(-2.4deg) scale(1.015)'},{offset:.16,transform:'translate(5px,-1px) rotate(2.4deg) scale(1.015)'},{offset:.24,transform:'translate(-4px,0) rotate(-1.8deg) scale(1.02)'},{offset:.32,transform:'translate(3px,-8px) rotate(1.2deg) scale(1.03)'},{offset:.72,transform:`translate(${dx*.78}px,${dy*.68-42}px) rotate(-7deg) scale(.72)`,opacity:.95},{transform:`translate(${dx}px,${dy}px) rotate(-14deg) scale(.16)`,opacity:0}];
  const duration=reduced?180:720,motion=flight.animate(keyframes,{duration,easing:'cubic-bezier(.2,.72,.18,1)',fill:'forwards'});setTimeout(commit,reduced?45:280);
  motion.finished.catch(()=>{}).finally(()=>{commit();flight.remove();cardNode.classList.remove('casting');cardCasting=false;app.dataset.cardFlight='done';syncBottomCommand()});return true;
}
function playSelectedCardAtPointer(e){
  const cardNode=selectedCardElement();if(!cardNode)return false;
  if(onlineState&&onlineState.state.activeSeat!==selfSeat){showGameError('Aguarde o seu turno.');return true}
  const index=Number(cardNode.dataset.card),tileInfo=cardTileAtPointer(e,index);
  if(!tileInfo?.valid){showGameError(cards[index].id==='road'?'Conecte a Rua ao castelo ou a outra Rua do seu reino.':'Escolha uma casa livre a até 2 casas do seu reino.');return true}
  const launched=animateCardSummon(cardNode,tileInfo,()=>{if(onlineState)sendOnlineAction({type:'summon',cardInstanceId:cardNode.dataset.instance,x:tileInfo.x,z:tileInfo.z});else{summonCard(index,tileInfo.worldX,tileInfo.worldZ,tileInfo.mountableTower,Number(cardNode.dataset.cardLevel)||1);cardNode.remove();document.querySelector('#hand-count').textContent=`${hand.querySelectorAll('.game-card').length} CARTAS`}});if(!launched)return true;
  cardNode.classList.remove('selected');showDeploymentArea(false);syncBottomCommand();return true;
}
hand.addEventListener('dragstart',event=>event.preventDefault());
hand.addEventListener('pointerdown',e=>{
  const card=e.target.closest('.game-card');if(!card||e.button!==0||cardCasting||onlineState&&onlineState.state.activeSeat!==selfSeat)return;e.preventDefault();cameraTransition.cancel({restoreControls:false});card.setPointerCapture(e.pointerId);controls.enabled=false;
  cardDrag={card,index:Number(card.dataset.card),instanceId:card.dataset.instance,startX:e.clientX,startY:e.clientY,moved:false,tile:null};showDeploymentArea(true);syncBottomCommand();
});
addEventListener('pointermove',e=>{
  if(!cardDrag)return;const distance=Math.hypot(e.clientX-cardDrag.startX,e.clientY-cardDrag.startY);if(!cardDrag.moved&&distance<7)return;
  if(!cardDrag.moved){cardDrag.moved=true;cardDrag.card.classList.add('aiming')}
  cardDrag.tile=cardTileAtPointer(e,cardDrag.index);tileMarker.visible=Boolean(cardDrag.tile);if(cardDrag.tile){tileMarker.position.set(cardDrag.tile.worldX,.075,cardDrag.tile.worldZ);tileMarker.material.color.setHex(cardDrag.tile.valid?0x6cad78:0xa54239)}
});
addEventListener('pointerup',e=>{
  if(!cardDrag)return;const drag=cardDrag;cardDrag=null;controls.enabled=true;tileMarker.visible=false;
  if(drag.moved){suppressCardClick=true;if(drag.tile?.valid)animateCardSummon(drag.card,drag.tile,()=>{if(onlineState)sendOnlineAction({type:'summon',cardInstanceId:drag.instanceId,x:drag.tile.x,z:drag.tile.z});else{summonCard(drag.index,drag.tile.worldX,drag.tile.worldZ,drag.tile.mountableTower,Number(drag.card.dataset.cardLevel)||1);drag.card.remove();document.querySelector('#hand-count').textContent=`${hand.querySelectorAll('.game-card').length} CARTAS`}});else drag.card.classList.remove('aiming');setTimeout(()=>{suppressCardClick=false;showDeploymentArea(false);syncBottomCommand()},0)}else{drag.card.classList.remove('aiming');showDeploymentArea(Boolean(selectedCardElement()));syncBottomCommand()}
});

let drawingCard=false,handShift=0,deckRemaining=28,deckHover=false,deckPreviewIndex=0;
const deckScreenPoint=new THREE.Vector3();
function deckScreenPosition(y=.8){deck3D.getWorldPosition(deckScreenPoint);deckScreenPoint.y+=y;deckScreenPoint.project(camera);return{x:(deckScreenPoint.x*.5+.5)*innerWidth,y:(-deckScreenPoint.y*.5+.5)*innerHeight}}
const gallery=document.querySelector('#dev-card-gallery'),galleryGrid=document.querySelector('#dev-gallery-grid'),galleryDetail=document.querySelector('#dev-card-detail');
const gallerySearch=document.querySelector('#dev-card-search'),rarityFilter=document.querySelector('#dev-rarity-filter'),typeFilter=document.querySelector('#dev-type-filter'),costFilter=document.querySelector('#dev-cost-filter');
let galleryCardIndex=0;
const normalizeSearch=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const cardTypeLabel=card=>card.type??'unit';
function fillGalleryFilters(){[...new Set(cards.map(card=>card.rarity))].sort().forEach(value=>rarityFilter.add(new Option(value,value)));[...new Set(cards.map(card=>cardTypeLabel(card)))].sort().forEach(value=>typeFilter.add(new Option(value==='unit'?'UNIDADE':value.toUpperCase(),value)));[...new Set(cards.map(card=>card.cost))].sort((a,b)=>a-b).forEach(value=>costFilter.add(new Option(String(value),String(value))))}
function renderDevGallery(){const query=normalizeSearch(gallerySearch.value),rarity=rarityFilter.value,type=typeFilter.value,cost=costFilter.value;galleryGrid.replaceChildren();cards.forEach((card,index)=>{const haystack=normalizeSearch(`${card.name} ${card.description} ${card.ability} ${card.abilityText}`);if(query&&!haystack.includes(query)||rarity&&card.rarity!==rarity||type&&cardTypeLabel(card)!==type||cost&&String(card.cost)!==cost)return;const item=document.createElement('article');item.className='dev-gallery-card';item.tabIndex=0;item.setAttribute('role','button');item.setAttribute('aria-label',`Ampliar ${card.name}`);item.dataset.cardIndex=String(index);item.innerHTML=cardMarkup(card,index,{level:devCardLevel});galleryGrid.appendChild(item)});document.querySelector('#dev-gallery-empty').hidden=Boolean(galleryGrid.children.length)}
function openDevGallery(){if(!devMode)return;gallery.hidden=false;controls.enabled=false;galleryDetail.hidden=true;gallerySearch.value='';rarityFilter.value='';typeFilter.value='';costFilter.value='';renderDevGallery();requestAnimationFrame(()=>gallerySearch.focus())}
function closeDevGallery(){gallery.hidden=true;galleryDetail.hidden=true;controls.enabled=true;app.focus({preventScroll:true})}
function showDevCardDetail(index){const card=cards[index];if(!card)return;galleryCardIndex=index;document.querySelector('#dev-detail-card').innerHTML=cardMarkup(card,index,{level:devCardLevel});document.querySelector('#dev-detail-level').textContent=String(devCardLevel);document.querySelector('#dev-detail-name').textContent=card.name;document.querySelector('#dev-detail-description').textContent=card.description;galleryDetail.hidden=false;document.querySelector('#dev-choose-card').focus()}
function chooseDevCard(){const holder=document.createElement('div');holder.innerHTML=cardMarkup(cards[galleryCardIndex],galleryCardIndex,{level:devCardLevel});const node=holder.firstElementChild;node.dataset.instance=`dev-${crypto.randomUUID()}`;hand.appendChild(node);document.querySelector('#hand-count').textContent=`${hand.children.length} CARTAS`;hand.classList.add('reflow');setTimeout(()=>hand.classList.remove('reflow'),600);closeDevGallery();showGameError(`${cards[galleryCardIndex].name} nível ${devCardLevel} adicionada à mão.`)}
fillGalleryFilters();[gallerySearch,rarityFilter,typeFilter,costFilter].forEach(control=>control.addEventListener(control===gallerySearch?'input':'change',renderDevGallery));galleryGrid.addEventListener('click',event=>{const item=event.target.closest('.dev-gallery-card');if(item)showDevCardDetail(Number(item.dataset.cardIndex))});galleryGrid.addEventListener('keydown',event=>{if(!['Enter',' '].includes(event.key))return;const item=event.target.closest('.dev-gallery-card');if(item){event.preventDefault();showDevCardDetail(Number(item.dataset.cardIndex))}});document.querySelector('#dev-gallery-close').addEventListener('click',closeDevGallery);document.querySelector('#dev-detail-close').addEventListener('click',()=>{galleryDetail.hidden=true;galleryGrid.querySelector(`[data-card-index="${galleryCardIndex}"]`)?.focus()});document.querySelector('#dev-choose-card').addEventListener('click',chooseDevCard);
function drawCardPreview(){
  if(devMode){openDevGallery();return}
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
document.querySelector('.card-dock').addEventListener('wheel',event=>{if(Math.abs(event.deltaY)<Math.abs(event.deltaX))return;event.preventDefault();moveTray(event.deltaY>0?-1:1)},{passive:false});

function sendOnlineAction(action){if(onlineState&&onlineSocket)onlineSocket.sendAction(action,onlineState.state.version)}
function activateSelectedInstant(){
  const tower=towerForArcher(selected),owned=devMode?selected?.userData.ownerSeat===activePlayer:selected?.userData.ownerSeat===selfSeat,me=onlineState?.state.players.find(player=>player.seat===selfSeat);
  if(!tower||!owned||selected.userData.instantUsedRound===currentRound()||Boolean(me&&me.energy<CARD_BY_ID.tower.instant.cost))return;
  if(onlineState){sendOnlineAction({type:'use_instant',unitId:selected.userData.serverUnitId});return}
  const directions=[[1,0],[-1,0],[0,1],[0,-1]],origin={x:Math.round((selected.position.x+half)/tile),z:Math.round((selected.position.z+half)/tile)};
  for(const [dx,dz] of directions){
    const target=units.filter(unit=>unit!==selected).map(unit=>{const x=Math.round((unit.position.x+half)/tile),z=Math.round((unit.position.z+half)/tile),step=dx?(x-origin.x)/dx:(z-origin.z)/dz;return{unit,x,z,step}}).filter(item=>item.step>=1&&item.step<=3&&item.x===origin.x+dx*item.step&&item.z===origin.z+dz*item.step).sort((a,b)=>a.step-b.step)[0]?.unit;
    if(target&&target.userData.ownerSeat!==selected.userData.ownerSeat){target.userData.hp-=2;updateHealthBadge(target);if(target.userData.hp<=0){units.splice(units.indexOf(target),1);hoverables.splice(hoverables.indexOf(target),1);scene.remove(target)}}
  }
  selected.userData.instantUsedRound=round;syncInstantCommand();
}
function castMageFireLocally(cells){
  const additions=cells.map((cell,index)=>({id:`local-fire-${round}-${Date.now()}-${index}`,ownerSeat:selected.userData.ownerSeat??activePlayer,casterUnitId:selected.uuid,...cell,damagedUnitIds:[]}));
  reconcileFires([...fires,...additions]);
  additions.forEach(fire=>{const target=unitAtCell(fire.x,fire.z);if(target)damageLocalUnit(target,CARD_BY_ID.mage.damage)});
  selected.userData.actionUsed=true;
}
function activateMageFire(){
  const owned=devMode?selected?.userData.ownerSeat===activePlayer:selected?.userData.ownerSeat===selfSeat;
  const unavailable=selected?.userData.cardId!=='mage'||!owned||selected.userData.actionUsed||Boolean(onlineState&&onlineState.state.activeSeat!==selfSeat);
  if(unavailable)return;
  if(!mageAiming){mageAiming=true;mageFireCells=[];clearMovementGrid();showMageTargets();syncMageCommands();return}
  if(!mageFireCells.length)return;
  const cells=mageFireCells.map(cell=>({...cell}));if(onlineState)sendOnlineAction({type:'mage_fire',unitId:selected.userData.serverUnitId,cells});else castMageFireLocally(cells);
  clearMageTargets();syncMageCommands();
}
function activateMageAcid(){
  const owned=devMode?selected?.userData.ownerSeat===activePlayer:selected?.userData.ownerSeat===selfSeat,me=onlineState?.state.players.find(player=>player.seat===selfSeat);
  const unavailable=selected?.userData.cardId!=='mage'||!owned||selected.userData.actionUsed||selected.userData.abilityUsed||Boolean(onlineState&&(onlineState.state.activeSeat!==selfSeat||me.energy<CARD_BY_ID.mage.ability.cost));
  if(unavailable)return;
  mageEffects.castAcid(selected);
  if(onlineState){sendOnlineAction({type:'use_ability',unitId:selected.userData.serverUnitId});return}
  const origin={x:Math.round((selected.position.x+half)/tile),z:Math.round((selected.position.z+half)/tile)};
  [...units].filter(unit=>unit!==selected&&Math.max(Math.abs(Math.round((unit.position.x+half)/tile)-origin.x),Math.abs(Math.round((unit.position.z+half)/tile)-origin.z))<=1).forEach(unit=>damageLocalUnit(unit,CARD_BY_ID.mage.ability.damage));
  selected.userData.actionUsed=true;selected.userData.abilityUsed=true;syncMageCommands();
}
addEventListener('keydown',event=>{if(event.key.toLowerCase()!=='f'||event.repeat||event.target.closest?.('input,textarea'))return;event.preventDefault();if(selected?.userData.cardId==='mage')activateMageAcid();else activateSelectedInstant()});
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
  clearMovementGrid();clearMageTargets();units.splice(0).forEach(unit=>scene.remove(unit));hoverables.splice(0);selected=null;syncInstantCommand();syncMageCommands();
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
  if(previous&&payload.self.hand.length>previous.self.hand.length)animateServerDraw();renderOnlineHand(payload.self.hand);reconcileRoads(payload.state.roads??[]);reconcileFires(payload.state.fires??[]);reconcileOnlineUnits(payload.state.units);
  const me=payload.state.players.find(player=>player.seat===selfSeat),enemy=payload.state.players.find(player=>player.seat!==selfSeat);if(!me||!enemy)return;
  setResource('#self-energy',me.energy,me.maxEnergy??GAME_CONFIG.maxEnergy);setResource('#self-health',me.baseHp,GAME_CONFIG.startingBaseHp);setKingdomProgressHud(me.citizens??0,me.baseLevel??1,enemy.baseLevel??1);deckRemaining=me.deckCount;document.querySelector('#deck-count').textContent=String(deckRemaining);
  document.querySelector('.enemy-base-tag i').style.width=`${Math.max(0,enemy.baseHp/GAME_CONFIG.startingBaseHp*100)}%`;
  document.querySelector('.enemy-base-tag').setAttribute('aria-label',`Castelo inimigo nível ${enemy.baseLevel??1}, vida ${enemy.baseHp} de ${GAME_CONFIG.startingBaseHp}`);
  const mine=payload.state.activeSeat===selfSeat,finished=payload.state.phase==='finished';document.querySelector('#turn-label').textContent=finished?(payload.state.winnerSeat===selfSeat?'VITÓRIA':'DERROTA'):(mine?'SEU TURNO':'TURNO RIVAL');document.querySelector('#end-turn').disabled=!mine||finished;
  syncTurnRoundStatus(payload.state.activeSeat,payload.state.round);
}
const lobbyError=document.querySelector('#lobby-error'),gameError=document.querySelector('#game-error'),connectionState=document.querySelector('#connection-state');let gameErrorTimer;function showGameError(message){gameError.textContent=message;clearTimeout(gameErrorTimer);gameErrorTimer=setTimeout(()=>gameError.textContent='',2800)}onlineSocket=new GameSocketClient();
onlineSocket.addEventListener('connected',()=>{connectionState.textContent='SERVIDOR CONECTADO';lobbyError.textContent='';document.querySelectorAll('#create-room,#join-room').forEach(button=>button.disabled=false)});
onlineSocket.addEventListener('disconnected',()=>{connectionState.textContent='RECONECTANDO...';lobbyError.textContent='Reconectando ao servidor da partida...';document.querySelectorAll('#create-room,#join-room').forEach(button=>button.disabled=true)});
onlineSocket.addEventListener(SERVER_EVENTS.ROOM_STATE,event=>{lobbyError.textContent='';gameError.textContent='';applyOnlineState(event.detail)});
onlineSocket.addEventListener(SERVER_EVENTS.ERROR,event=>{const message=String(event.detail.message??'Erro na partida.');if(document.querySelector('#online-lobby').classList.contains('closed'))showGameError(message);else lobbyError.textContent=message});
document.querySelectorAll('#create-room,#join-room').forEach(button=>button.disabled=true);
document.querySelector('#room-code').addEventListener('input',event=>{event.target.value=event.target.value.toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6)});
document.querySelector('#create-room').addEventListener('click',()=>onlineSocket.createRoom(document.querySelector('#player-name').value));
document.querySelector('#join-room').addEventListener('click',()=>onlineSocket.joinRoom(document.querySelector('#room-code').value,document.querySelector('#player-name').value));
function initializeDevMode(){devMode=true;onlineState=null;activePlayer=1;round=1;selfSeat=1;app.dataset.mode='dev';document.querySelector('#online-lobby').classList.add('closed');document.querySelector('#match-state').hidden=false;document.querySelector('#turn-clock').textContent='∞';document.querySelector('#end-turn').disabled=false;setResource('#self-energy','∞','');hand.replaceChildren();document.querySelector('#hand-count').textContent='0 CARTAS';deckRemaining=Number.POSITIVE_INFINITY;document.querySelector('#deck-count').textContent='∞';document.querySelector('[data-dev-settings]').hidden=false;devUnitTools.hidden=true;units.splice(0).forEach(unit=>scene.remove(unit));hoverables.splice(0);reconcileRoads([]);reconcileFires([]);keepForSeat(1).scale.setScalar(1);keepForSeat(2).scale.setScalar(1);setOnlinePerspective();syncTurnRoundStatus(activePlayer,round);syncDevKingdomHud();syncDevSettings();showDeploymentArea(false)}
document.querySelector('#dev-mode').addEventListener('click',initializeDevMode);
addEventListener('keydown',event=>{if(event.key!=='Escape'||gallery.hidden)return;if(!galleryDetail.hidden){galleryDetail.hidden=true;return}closeDevGallery()});
onlineSocket.connect();
setInterval(()=>{if(!onlineState?.state.turnEndsAt)return;const remaining=Math.max(0,onlineState.state.turnEndsAt-Date.now()),minutes=Math.floor(remaining/60000),seconds=Math.floor(remaining%60000/1000);document.querySelector('#turn-clock').textContent=`${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`},250);

const clock=new THREE.Clock();
const enemyBaseTag=document.querySelector('.enemy-base-tag');
const baseTagPoint=new THREE.Vector3();
function positionEnemyStatus(){const target=selfSeat===2?alliedKeep:enemyKeep;target.getWorldPosition(baseTagPoint);baseTagPoint.y+=4.9;baseTagPoint.project(camera);enemyBaseTag.style.left=`${(baseTagPoint.x*.5+.5)*innerWidth}px`;enemyBaseTag.style.top=`${(-baseTagPoint.y*.5+.5)*innerHeight}px`;enemyBaseTag.style.visibility=baseTagPoint.z<1?'visible':'hidden';}
let lastStatusUpdate=0;
function animate(){requestAnimationFrame(animate);const delta=clock.getDelta(),t=clock.elapsedTime;controls.update();cameraTransition.update();damageEffects.update(delta);mageEffects.update(delta);if(t-lastStatusUpdate>(graphicsQuality==='low'?.1:.033)){positionEnemyStatus();lastStatusUpdate=t}topDeckCard.position.y=THREE.MathUtils.lerp(topDeckCard.position.y,deckHover ? .98 : .766,.14);topDeckCard.rotation.z=THREE.MathUtils.lerp(topDeckCard.rotation.z,deckHover ? -.08 : 0,.12);if(graphicsQuality==='high'){updateDynamicLighting(t);updateTerrain(t);units.forEach((u,i)=>{const rig=u.getObjectByName('rig');rig.position.y=.18+Math.sin(t*1.35+i*1.7)*.012;rig.rotation.z=Math.sin(t*.8+i)*.006;u.traverse(o=>{if(o.userData.magic){o.rotation.y=t*1.5;}})});fireMeshes.forEach(group=>group.traverse(o=>{if(o.userData.flame){o.scale.y=.86+Math.sin(t*8+o.userData.phase)*.16;o.rotation.y=t*1.7+o.userData.phase}}));wisps.forEach((w,i)=>{w.position.x=w.userData.baseX+Math.sin(t*.12+i)*.55;w.material.opacity=.012+i*.003+Math.sin(t*.35+i)*.004;});fireLights.forEach((light,i)=>{const pulse=.91+Math.sin(t*7.4+light.userData.phase)*.065+Math.sin(t*13.1+i)*.025;light.intensity=light.userData.baseIntensity*pulse;})}renderer.render(scene,camera)}
function resize(){const aspect=innerWidth/innerHeight,view=innerWidth<700?12.6:11.45;camera.left=-view*aspect;camera.right=view*aspect;camera.top=view;camera.bottom=-view;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,graphicsQuality==='low'?.9:1.7))}addEventListener('resize',resize);resize();animate();setTimeout(()=>document.querySelector('.loading').classList.add('done'),500);
