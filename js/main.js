// ============================================================
//  Point d'entrée : scène 3D, caméra, interactions, liaison UI.
// ============================================================

import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { AGENTS, getAgent } from './agents.js';
import { createCharacter, createDog } from './characters.js';
import { buildOffice, buildLights } from './office.js';
import { initChat, openChat, openMeeting, closeChat, isChatOpen } from './chat.js';
import { initSettingsUI, initDefaultSettings, loadSettings, isConfigured } from './settings.js';

// Récupère les réglages depuis le serveur si le localStorage est vide
// (iOS efface le localStorage en HTTP → l'utilisateur perd sa config)
await initDefaultSettings();

const canvasHost = document.getElementById('scene');
const loadingEl = document.getElementById('loading');
const tooltipEl = document.getElementById('tooltip');

// Écran tactile (mobile / tablette) : navigation et réglages adaptés
const isTouch = window.matchMedia('(pointer: coarse)').matches;
if (isTouch) {
  document.getElementById('hint').innerHTML =
    '💡 <strong>1 doigt</strong> : pivoter · <strong>pincer</strong> : zoomer · <strong>touchez un collaborateur</strong> pour discuter';
}

// --- Détection WebGL -------------------------------------------
function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch (_) { return false; }
}

// --- UI commune (chat + réglages + barre d'équipe) --------------
const settingsUI = initSettingsUI(() => {});
initChat({
  openSettings: settingsUI.open,
  onClose: () => focusOverview(),
});

const teamBar = document.getElementById('team-bar');
const chipEls = new Map();
for (const agent of AGENTS) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'team-chip';
  btn.style.setProperty('--accent', agent.accent);
  btn.innerHTML = `<span class="chip-emoji">${agent.emoji}</span><span class="chip-txt"><strong>${agent.nom}</strong><small>${agent.role}</small></span>`;
  btn.addEventListener('click', () => {
    if (selectionMode) toggleSelect(agent.id);
    else selectAgent(agent.id);
  });
  teamBar.appendChild(btn);
  chipEls.set(agent.id, btn);
}

// --- Mode Réunion : sélection des participants -------------------
const MEETING_MEMBERS_KEY = 'restoia.reunion.membres';
let selectionMode = false;
const selectedIds = new Set();
let setRing = () => {}; // fourni par init3D quand la 3D est active

const meetingBar = document.getElementById('meeting-bar');
const meetingCount = document.getElementById('meeting-count');
const meetingStart = document.getElementById('meeting-start');

document.getElementById('btn-meeting').addEventListener('click', () => {
  selectionMode ? exitSelection() : enterSelection();
});
document.getElementById('meeting-cancel').addEventListener('click', exitSelection);
meetingStart.addEventListener('click', startMeeting);
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && selectionMode) exitSelection();
});

function enterSelection() {
  if (isChatOpen()) closeChat();
  selectionMode = true;
  selectedIds.clear();
  // re-propose les participants de la dernière réunion
  try {
    for (const id of JSON.parse(localStorage.getItem(MEETING_MEMBERS_KEY)) || []) {
      if (getAgent(id)) selectedIds.add(id);
    }
  } catch (_) { /* pas de réunion précédente */ }
  document.body.classList.add('selecting');
  meetingBar.classList.add('visible');
  refreshSelectionUI();
}

function exitSelection() {
  selectionMode = false;
  document.body.classList.remove('selecting');
  meetingBar.classList.remove('visible');
  selectedIds.clear();
  refreshSelectionUI();
}

function toggleSelect(id) {
  selectedIds.has(id) ? selectedIds.delete(id) : selectedIds.add(id);
  refreshSelectionUI();
}

function refreshSelectionUI() {
  for (const agent of AGENTS) {
    const on = selectedIds.has(agent.id);
    chipEls.get(agent.id)?.classList.toggle('selected', on);
    setRing(agent.id, on && selectionMode);
  }
  const n = selectedIds.size;
  meetingCount.textContent = n === 0
    ? 'Cliquez sur les collaborateurs à réunir'
    : `${n} participant${n > 1 ? 's' : ''} sélectionné${n > 1 ? 's' : ''}`;
  meetingStart.disabled = n < 2;
}

function startMeeting() {
  const members = [...selectedIds].map(getAgent).filter(Boolean);
  if (members.length < 2) return;
  try {
    localStorage.setItem(MEETING_MEMBERS_KEY, JSON.stringify(members.map((m) => m.id)));
  } catch (_) { /* stockage indisponible */ }
  exitSelection();
  focusOverview();
  openMeeting(members);
}

if (!isConfigured(loadSettings())) {
  document.getElementById('config-banner').classList.add('visible');
  document.getElementById('banner-settings').addEventListener('click', settingsUI.open);
}
document.getElementById('banner-close')?.addEventListener('click', () => {
  document.getElementById('config-banner').classList.remove('visible');
});

// --- Scène 3D ----------------------------------------------------
let focusAgentCamera = null;
let focusOverview = () => {};

function selectAgent(id) {
  const agent = getAgent(id);
  if (!agent) return;
  focusAgentCamera?.(agent);
  openChat(agent);
}

// --- Mode secours sans WebGL ------------------------------------
if (!webglAvailable()) {
  loadingEl.remove();
  document.getElementById('fallback').classList.add('visible');
  document.body.classList.add('no-3d');
} else {
  init3D();
}

function init3D() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isTouch ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  canvasHost.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0d18);
  scene.fog = new THREE.Fog(0x0a0d18, 26, 44);

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = isTouch ? 0.12 : 0.06;
  controls.rotateSpeed = isTouch ? 0.55 : 1.0;
  controls.zoomSpeed = isTouch ? 0.7 : 1.0;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minPolarAngle = Math.PI * 0.12;
  controls.minDistance = 3;
  controls.maxDistance = 26;
  controls.enablePan = false;
  controls.target.set(0, 1, 0);

  buildLights(scene, { lowPower: isTouch });
  buildOffice(scene, AGENTS);

  // Personnages
  const characters = [];
  const pickables = [];
  for (const agent of AGENTS) {
    const ch = createCharacter(agent);
    const d = agent.desk;
    ch.group.position.set(d.x, 0, d.z);
    ch.group.rotation.y = d.ry;
    if (agent.pose === 'sit') {
      // place le personnage sur la chaise (décalé derrière le bureau, en local +z)
      ch.group.position.x += Math.sin(d.ry) * 0.62;
      ch.group.position.z += Math.cos(d.ry) * 0.62;
    }
    scene.add(ch.group);
    ch.group.traverse((o) => { o.userData.agentId = agent.id; });
    characters.push(ch);
    pickables.push(ch.group);
  }

  // Joy, le labrador noir — simple mascotte, pas cliquable
  const joy = createDog('Joy');
  joy.group.position.set(1.15, 0, -4.15);
  joy.group.rotation.y = Math.PI * 0.9; // assise près d'Anibal, tournée vers la salle
  scene.add(joy.group);

  // Anneaux de sélection (mode réunion) aux pieds des personnages
  const rings = new Map();
  for (const ch of characters) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.42, 0.56, 28),
      new THREE.MeshBasicMaterial({
        color: ch.agent.accent, transparent: true, opacity: 0.85,
        side: THREE.DoubleSide, depthWrite: false,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    ring.visible = false;
    ring.userData.agentId = ch.agent.id;
    ch.group.add(ring);
    rings.set(ch.agent.id, ring);
  }
  setRing = (id, on) => {
    const r = rings.get(id);
    if (r) r.visible = on;
  };

  // --- Caméra : intro + focus agent -----------------------------
  // En portrait (mobile), on recule la caméra pour que la salle
  // entière tienne dans l'écran étroit.
  function overviewPose() {
    const aspect = window.innerWidth / window.innerHeight;
    const zoomOut = Math.min(2.1, Math.max(1, 1.15 / aspect));
    return {
      pos: new THREE.Vector3(7.4 * zoomOut, 5.0 * zoomOut, 9.2 * zoomOut),
      target: new THREE.Vector3(0, 0.9, 0),
    };
  }
  camera.position.set(16, 13, 20);
  let camAnim = null;

  function animateCameraTo(pos, target, duration = 1.2) {
    camAnim = {
      fromPos: camera.position.clone(),
      toPos: pos.clone(),
      fromTgt: controls.target.clone(),
      toTgt: target.clone(),
      t: 0,
      duration,
    };
  }

  focusAgentCamera = (agent) => {
    const d = agent.desk;
    const charPos = new THREE.Vector3(d.x, 1.1, d.z);
    // direction vers laquelle le personnage regarde (local -Z tourné de ry)
    const facing = new THREE.Vector3(-Math.sin(d.ry), 0, -Math.cos(d.ry));
    const aspect = window.innerWidth / window.innerHeight;
    const dist = aspect < 0.9 ? 3.6 : 2.6; // plus de recul en portrait
    const camPos = charPos.clone()
      .add(facing.clone().multiplyScalar(dist))
      .add(new THREE.Vector3(0, aspect < 0.9 ? 1.2 : 0.9, 0));
    // garde la caméra dans la pièce
    camPos.x = THREE.MathUtils.clamp(camPos.x, -9, 9);
    camPos.z = THREE.MathUtils.clamp(camPos.z, -6.6, 7);
    animateCameraTo(camPos, charPos, 1.1);
  };

  focusOverview = () => {
    const o = overviewPose();
    animateCameraTo(o.pos, o.target, 1.1);
  };

  // Intro
  {
    const o = overviewPose();
    animateCameraTo(o.pos, o.target, 2.2);
  }

  document.getElementById('btn-overview').addEventListener('click', () => {
    if (isChatOpen()) closeChat();
    else focusOverview();
  });

  // --- Survol / clic ---------------------------------------------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hovered = null;
  let pointerDown = { x: 0, y: 0, moved: false };

  function pick(clientX, clientY) {
    pointer.x = (clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(pickables, true);
    return hits.length ? hits[0].object.userData.agentId : null;
  }

  renderer.domElement.addEventListener('pointermove', (e) => {
    const id = pick(e.clientX, e.clientY);
    if (id !== hovered) {
      hovered = id;
      for (const ch of characters) ch.setHighlight(ch.agent.id === id);
      renderer.domElement.style.cursor = id ? 'pointer' : 'grab';
      if (id) {
        const a = getAgent(id);
        tooltipEl.innerHTML = `<strong>${a.emoji} ${a.nom}</strong> — ${a.role}<br><small>Cliquez pour discuter</small>`;
        tooltipEl.classList.add('visible');
      } else {
        tooltipEl.classList.remove('visible');
      }
    }
    if (hovered) {
      tooltipEl.style.left = `${e.clientX + 16}px`;
      tooltipEl.style.top = `${e.clientY + 16}px`;
    }
    if (Math.abs(e.clientX - pointerDown.x) + Math.abs(e.clientY - pointerDown.y) > tapTolerance) {
      pointerDown.moved = true;
    }
  });

  // Au doigt, on tolère un léger tremblement pour reconnaître un « tap »
  const tapTolerance = isTouch ? 18 : 6;

  renderer.domElement.addEventListener('pointerdown', (e) => {
    pointerDown = { x: e.clientX, y: e.clientY, moved: false, t: performance.now() };
  });

  renderer.domElement.addEventListener('pointerup', (e) => {
    // c'était une rotation de caméra ou un appui long, pas un tap
    if (pointerDown.moved) return;
    if (pointerDown.t && performance.now() - pointerDown.t > 600) return;
    const id = pick(e.clientX, e.clientY);
    if (!id) return;
    if (selectionMode) toggleSelect(id);
    else selectAgent(id);
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // --- Boucle de rendu --------------------------------------------
  const clock = new THREE.Clock();
  let firstFrame = true;

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);

    // Sur mobile, le chat couvre tout l'écran : on met la 3D en pause
    // pour économiser la batterie (le rendu reprend à la fermeture).
    if (!firstFrame && window.innerWidth <= 700 && document.body.classList.contains('chat-open')) {
      return;
    }

    if (camAnim) {
      camAnim.t += dt / camAnim.duration;
      const k = camAnim.t >= 1 ? 1 : 1 - Math.pow(1 - camAnim.t, 3); // easing cubic-out
      camera.position.lerpVectors(camAnim.fromPos, camAnim.toPos, k);
      controls.target.lerpVectors(camAnim.fromTgt, camAnim.toTgt, k);
      if (camAnim.t >= 1) camAnim = null;
    }

    controls.update();
    for (const ch of characters) ch.update(dt, camera);
    joy.update(dt, camera);
    // pulsation douce des anneaux de sélection
    const tt = clock.elapsedTime;
    for (const r of rings.values()) {
      if (r.visible) r.material.opacity = 0.6 + 0.3 * Math.sin(tt * 3.2);
    }
    renderer.render(scene, camera);

    if (firstFrame) {
      firstFrame = false;
      loadingEl.classList.add('done');
      setTimeout(() => loadingEl.remove(), 700);
    }
  });
}
