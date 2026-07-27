// ============================================================
//  Personnages 3D stylisés (low-poly), générés en code.
//  Chaque agent a une morphologie, une coiffure, une tenue
//  et des accessoires propres, plus une petite animation d'idle.
// ============================================================

import * as THREE from 'three';

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.85,
    metalness: opts.metalness ?? 0.05,
    flatShading: opts.flat ?? false,
    ...(opts.emissive ? { emissive: opts.emissive, emissiveIntensity: opts.emissiveIntensity ?? 1 } : {}),
  });
}

function addMesh(parent, geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

// --- Coiffures ------------------------------------------------
function buildHair(head, style, color, headR) {
  const hm = mat(color, { roughness: 0.6 });
  const g = new THREE.Group();
  switch (style) {
    case 'bun': {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.05, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), hm);
      g.add(cap);
      const bun = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.45, 12, 10), hm);
      bun.position.set(0, headR * 0.75, headR * 0.55);
      g.add(bun);
      break;
    }
    case 'long': {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.07, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), hm);
      g.add(cap);
      const back = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.92, headR * 0.75, headR * 2.1, 14, 1, true), hm);
      back.position.set(0, -headR * 0.55, headR * 0.28);
      back.scale.z = 0.72;
      g.add(back);
      break;
    }
    case 'afro': {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.32, 8, 6), hm);
      puff.material = mat(color, { roughness: 0.9, flat: true });
      puff.position.y = headR * 0.28;
      g.add(puff);
      break;
    }
    case 'ponytail': {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.05, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), hm);
      g.add(cap);
      const tail = new THREE.Mesh(new THREE.CapsuleGeometry(headR * 0.28, headR * 1.1, 6, 10), hm);
      tail.position.set(0, -headR * 0.1, headR * 0.85);
      tail.rotation.x = 0.5;
      g.add(tail);
      break;
    }
    case 'messy': {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.12, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.6), mat(color, { flat: true }));
      cap.rotation.y = 0.4;
      g.add(cap);
      break;
    }
    case 'buzz': {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.02, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.45), hm);
      g.add(cap);
      break;
    }
    case 'short':
    default: {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.06, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.52), hm);
      g.add(cap);
      const fringe = new THREE.Mesh(new THREE.BoxGeometry(headR * 1.3, headR * 0.35, headR * 0.3), hm);
      fringe.position.set(0, headR * 0.45, -headR * 0.82);
      g.add(fringe);
      break;
    }
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  head.add(g);
}

// --- Accessoires ----------------------------------------------
function buildAccessories(head, torso, acc, headR, accent, cfg) {
  if (acc.toque) {
    const tm = mat(0xf7f4ee, { roughness: 0.85 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.78, headR * 0.86, headR * 0.75, 16), tm);
    base.position.y = headR * 0.82;
    const puff = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.88, 14, 10), tm);
    puff.position.y = headR * 1.28;
    puff.scale.y = 0.62;
    head.add(base, puff);
  }
  if (acc.apron) {
    const am = mat(cfg?.apronColor ?? 0x8a2f2f, { roughness: 0.95 });
    const bib = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.34, 0.02), am);
    bib.position.set(0, -0.02, -0.2);
    bib.rotation.x = -0.06;
    torso.add(bib);
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.015), am);
    strap.position.set(0, 0.19, -0.19);
    torso.add(strap);
  }
  if (acc.glasses) {
    const gm = mat(0x18181f, { roughness: 0.35, metalness: 0.35 });
    const lens = new THREE.TorusGeometry(headR * 0.3, headR * 0.05, 8, 18);
    const l = new THREE.Mesh(lens, gm); l.position.set(-headR * 0.38, headR * 0.08, -headR * 0.92);
    const r = new THREE.Mesh(lens, gm); r.position.set(headR * 0.38, headR * 0.08, -headR * 0.92);
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.24, headR * 0.06, headR * 0.06), gm);
    bridge.position.set(0, headR * 0.08, -headR * 0.95);
    head.add(l, r, bridge);
  }
  if (acc.headphones) {
    const hm = mat(0x101018, { roughness: 0.4, metalness: 0.3 });
    const band = new THREE.Mesh(new THREE.TorusGeometry(headR * 1.08, headR * 0.09, 8, 20, Math.PI), hm);
    band.rotation.z = Math.PI; band.rotation.y = Math.PI / 2;
    band.position.y = headR * 0.15;
    const earGeo = new THREE.CylinderGeometry(headR * 0.34, headR * 0.34, headR * 0.22, 14);
    const e1 = new THREE.Mesh(earGeo, hm); e1.rotation.z = Math.PI / 2; e1.position.set(-headR * 1.06, 0, 0);
    const e2 = e1.clone(); e2.position.x = headR * 1.06;
    const dotM = mat(accent, { emissive: accent, emissiveIntensity: 0.9 });
    const d1 = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.16, headR * 0.16, headR * 0.02, 12), dotM);
    d1.rotation.z = Math.PI / 2; d1.position.set(-headR * 1.19, 0, 0);
    const d2 = d1.clone(); d2.position.x = headR * 1.19;
    head.add(band, e1, e2, d1, d2);
  }
  if (acc.tie) {
    const tm = mat(accent, { roughness: 0.6 });
    const knot = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.03), tm);
    knot.position.set(0, 0.16, -0.185);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.2, 0.02), tm);
    body.position.set(0, 0.03, -0.2);
    body.rotation.x = -0.12;
    torso.add(knot, body);
  }
  if (acc.collar) {
    const cm = mat(0xf5f2ec, { roughness: 0.7 });
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.035, 8, 18), cm);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.21;
    torso.add(collar);
  }
  if (acc.badge) {
    const bm = mat(0xf5f2ec, { roughness: 0.5 });
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.012), bm);
    badge.position.set(0.11, 0.05, -0.2);
    badge.rotation.x = -0.08;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.025, 0.014), mat(accent, { emissive: accent, emissiveIntensity: 0.4 }));
    stripe.position.set(0.11, 0.085, -0.2);
    stripe.rotation.x = -0.08;
    torso.add(badge, stripe);
  }
}

// --- Personnage -----------------------------------------------
// Le personnage regarde vers -Z local. Origine : sol, entre les pieds.
export function createCharacter(agent) {
  const cfg = agent.avatar;
  const accent = new THREE.Color(agent.accent);
  const group = new THREE.Group();
  group.name = `char-${agent.id}`;

  const skinM = mat(cfg.skin, { roughness: 0.75 });
  const topM = mat(cfg.top, { roughness: 0.85 });
  const bottomM = mat(cfg.bottom, { roughness: 0.9 });
  const shoeM = mat(cfg.shoes, { roughness: 0.7 });

  const headR = 0.185;
  const sitting = agent.pose === 'sit';

  // Hauteurs de référence
  const hipY = sitting ? 0.5 : 0.62;      // assise de la chaise ≈ 0.5
  const torsoH = 0.42;
  const torsoY = hipY + torsoH / 2 + 0.05;
  const headY = torsoY + torsoH / 2 + headR * 0.95;

  // Torse
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.185, torsoH - 0.2, 6, 14), topM);
  torso.position.y = torsoY;
  torso.castShadow = true;
  group.add(torso);

  // Bassin
  const hips = addMesh(group, new THREE.CapsuleGeometry(0.16, 0.1, 4, 12), bottomM, 0, hipY + 0.04, 0);
  hips.scale.set(1.05, 0.8, 0.95);

  // Tête + cou
  addMesh(group, new THREE.CylinderGeometry(0.06, 0.075, 0.09, 10), skinM, 0, headY - headR - 0.03, 0);
  const head = new THREE.Mesh(new THREE.SphereGeometry(headR, 22, 16), skinM);
  head.position.y = headY;
  head.castShadow = true;
  group.add(head);

  // Yeux + sourcils (le visage regarde -Z)
  const eyeM = mat(0x141418, { roughness: 0.3 });
  const eyeGeo = new THREE.SphereGeometry(0.023, 8, 8);
  const eL = new THREE.Mesh(eyeGeo, eyeM); eL.position.set(-0.065, 0.03, -headR * 0.94);
  const eR = new THREE.Mesh(eyeGeo, eyeM); eR.position.set(0.065, 0.03, -headR * 0.94);
  const browGeo = new THREE.BoxGeometry(0.055, 0.012, 0.012);
  const browM = mat(cfg.hairColor);
  const bL = new THREE.Mesh(browGeo, browM); bL.position.set(-0.065, 0.085, -headR * 0.95);
  const bR = new THREE.Mesh(browGeo, browM); bR.position.set(0.065, 0.085, -headR * 0.95);
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 6, 12, Math.PI * 0.7), mat(0x9c4a3c));
  mouth.position.set(0, -0.055, -headR * 0.93);
  mouth.rotation.z = Math.PI + Math.PI * 0.15;
  head.add(eL, eR, bL, bR, mouth);

  buildHair(head, cfg.hairStyle, cfg.hairColor, headR);
  buildAccessories(head, torso, cfg.accessories || {}, headR, accent, cfg);

  // Bras (épaule -> avant, posture différente assis/debout)
  const armGeo = new THREE.CapsuleGeometry(0.055, 0.3, 4, 10);
  const handGeo = new THREE.SphereGeometry(0.055, 10, 8);
  const shoulderY = torsoY + torsoH / 2 - 0.12;
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(armGeo, topM);
    arm.castShadow = true;
    const hand = new THREE.Mesh(handGeo, skinM);
    hand.castShadow = true;
    if (sitting) {
      // bras tendus vers le clavier
      arm.position.set(side * 0.23, shoulderY - 0.1, -0.14);
      arm.rotation.x = -Math.PI / 2.6;
      arm.rotation.z = side * 0.12;
      hand.position.set(side * 0.2, hipY + 0.16, -0.38);
    } else if (cfg.accessories?.tray && side === 1) {
      // bras plié : le serveur porte son plateau à hauteur d'épaule
      arm.position.set(side * 0.26, shoulderY - 0.06, -0.04);
      arm.rotation.x = -Math.PI / 2.1;
      arm.rotation.z = side * 0.25;
      hand.position.set(side * 0.3, shoulderY + 0.1, -0.16);
      const trayG = new THREE.Group();
      const plateau = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.018, 20), mat(0x2e3038, { roughness: 0.35, metalness: 0.5 }));
      trayG.add(plateau);
      // pizza sur le plateau
      const pate = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.125, 0.02, 18), mat(0xe0aa5f, { roughness: 0.8 }));
      pate.position.y = 0.02;
      const sauce = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.012, 18), mat(0xc63d2a, { roughness: 0.75 }));
      sauce.position.y = 0.032;
      trayG.add(pate, sauce);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.5;
        const mozza = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.012, 8), mat(0xf6f0dc, { roughness: 0.7 }));
        mozza.position.set(Math.cos(a) * 0.06, 0.042, Math.sin(a) * 0.06);
        trayG.add(mozza);
      }
      trayG.position.set(side * 0.3, shoulderY + 0.13, -0.16);
      trayG.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      group.add(trayG);
    } else {
      // un bras le long du corps, l'autre tient la tablette
      const holding = cfg.accessories?.tablet && side === 1;
      if (holding) {
        arm.position.set(side * 0.25, shoulderY - 0.08, -0.08);
        arm.rotation.x = -Math.PI / 3;
        arm.rotation.z = side * 0.15;
        hand.position.set(side * 0.2, shoulderY - 0.02, -0.26);
        const tab = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.22), mat(0x1a1d26, { roughness: 0.4 }));
        tab.position.set(side * 0.16, shoulderY, -0.3);
        tab.rotation.x = -0.5;
        const scr = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.013, 0.19), mat(0x0b0e14, { emissive: accent, emissiveIntensity: 0.5 }));
        scr.position.copy(tab.position);
        scr.rotation.copy(tab.rotation);
        scr.position.y += 0.004;
        group.add(tab, scr);
      } else {
        arm.position.set(side * 0.25, shoulderY - 0.16, 0);
        arm.rotation.z = side * 0.1;
        hand.position.set(side * 0.28, shoulderY - 0.38, 0);
      }
    }
    group.add(arm, hand);
  }

  // Jambes
  if (sitting) {
    const thighGeo = new THREE.CapsuleGeometry(0.075, 0.22, 4, 10);
    const calfGeo = new THREE.CapsuleGeometry(0.065, 0.24, 4, 10);
    const shoeGeo = new THREE.BoxGeometry(0.11, 0.07, 0.2);
    for (const side of [-1, 1]) {
      const thigh = new THREE.Mesh(thighGeo, bottomM);
      thigh.rotation.x = Math.PI / 2;
      thigh.position.set(side * 0.1, hipY, -0.16);
      const calf = new THREE.Mesh(calfGeo, bottomM);
      calf.position.set(side * 0.1, hipY - 0.24, -0.3);
      const shoe = new THREE.Mesh(shoeGeo, shoeM);
      shoe.position.set(side * 0.1, 0.035, -0.36);
      thigh.castShadow = calf.castShadow = shoe.castShadow = true;
      group.add(thigh, calf, shoe);
    }
  } else {
    const legGeo = new THREE.CapsuleGeometry(0.075, 0.42, 4, 10);
    const shoeGeo = new THREE.BoxGeometry(0.11, 0.07, 0.2);
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(legGeo, bottomM);
      leg.position.set(side * 0.1, 0.32, 0);
      const shoe = new THREE.Mesh(shoeGeo, shoeM);
      shoe.position.set(side * 0.1, 0.035, -0.03);
      leg.castShadow = shoe.castShadow = true;
      group.add(leg, shoe);
    }
  }

  // Étiquette flottante (nom + rôle)
  const label = makeLabelSprite(agent);
  label.position.y = (sitting ? headY : headY) + 0.42;
  group.add(label);

  // Matériaux à teinter au survol
  const tintable = [skinM, topM, bottomM];

  const state = { t: Math.random() * 10, highlight: 0 };
  return {
    group,
    agent,
    label,
    setHighlight(on) { state.targetHighlight = on ? 1 : 0; },
    update(dt, camera) {
      state.t += dt;
      // respiration + léger balancement de tête
      const breathe = Math.sin(state.t * 1.7) * 0.012;
      torso.scale.y = 1 + breathe;
      head.position.y = headY + breathe * 0.5 + Math.sin(state.t * 1.7 + 0.6) * 0.006;
      head.rotation.y = Math.sin(state.t * 0.45) * 0.22;
      head.rotation.x = Math.sin(state.t * 0.8) * 0.05 + (sitting ? 0.08 : 0);
      // lueur de survol (transition douce)
      state.targetHighlight ??= 0;
      state.highlight += (state.targetHighlight - state.highlight) * Math.min(1, dt * 10);
      const h = state.highlight;
      for (const m of tintable) {
        m.emissive.copy(accent);
        m.emissiveIntensity = h * 0.28;
      }
      label.material.opacity = 0.75 + h * 0.25;
      const s = 1 + h * 0.1;
      label.scale.set(1.5 * s, 0.42 * s, 1);
      if (camera) label.quaternion.copy(camera.quaternion);
    },
  };
}

// --- Étiquette (sprite canvas) --------------------------------
function makeLabelSprite(agent) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 144;
  const ctx = c.getContext('2d');
  const r = 28;
  ctx.fillStyle = 'rgba(13, 17, 28, 0.82)';
  ctx.beginPath();
  ctx.roundRect(8, 8, 496, 128, r);
  ctx.fill();
  ctx.strokeStyle = agent.accent;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = agent.accent;
  ctx.beginPath();
  ctx.arc(52, 72, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f4f6fb';
  ctx.font = '600 46px system-ui, sans-serif';
  ctx.fillText(agent.nom, 84, 66);
  ctx.fillStyle = 'rgba(220, 226, 240, 0.75)';
  ctx.font = '400 34px system-ui, sans-serif';
  ctx.fillText(agent.role, 84, 112);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.75, depthWrite: false }));
  sprite.scale.set(1.5, 0.42, 1);
  return sprite;
}
