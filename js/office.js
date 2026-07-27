// ============================================================
//  L'open space : pièce, mobilier, lumières et postes de travail.
//  Tout est généré en code (aucun asset externe).
// ============================================================

import * as THREE from 'three';

const ROOM = { w: 20, d: 15, h: 4.2 }; // x, z, y

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.9,
    metalness: opts.metalness ?? 0.02,
    ...(opts.emissive ? { emissive: opts.emissive, emissiveIntensity: opts.emissiveIntensity ?? 1 } : {}),
    ...(opts.map ? { map: opts.map } : {}),
    ...(opts.side ? { side: opts.side } : {}),
  });
}

function box(parent, w, h, d, material, x, y, z, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

// --- Textures canvas ------------------------------------------
function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}

function floorTexture() {
  return canvasTexture(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#8a6f52';
    ctx.fillRect(0, 0, w, h);
    const plank = 128;
    for (let y = 0; y < h; y += plank) {
      for (let x = -plank; x < w + plank; x += 512) {
        const off = ((y / plank) % 2) * 256;
        const shade = 0.9 + Math.random() * 0.2;
        ctx.fillStyle = `rgb(${Math.round(138 * shade)}, ${Math.round(111 * shade)}, ${Math.round(80 * shade)})`;
        ctx.fillRect(x + off, y, 508, plank - 4);
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    for (let y = plank; y < h; y += plank) ctx.fillRect(0, y - 2, w, 3);
  });
}

function cityTexture() {
  return canvasTexture(1024, 512, (ctx, w, h) => {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#0b1026');
    sky.addColorStop(0.7, '#1b2350');
    sky.addColorStop(1, '#2c2a5e');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    // étoiles
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 90; i++) ctx.fillRect(Math.random() * w, Math.random() * h * 0.5, 2, 2);
    // lune
    ctx.fillStyle = '#f3e9c8';
    ctx.beginPath(); ctx.arc(w * 0.82, h * 0.18, 26, 0, Math.PI * 2); ctx.fill();
    // immeubles
    for (let x = 0; x < w;) {
      const bw = 40 + Math.random() * 70;
      const bh = h * (0.25 + Math.random() * 0.45);
      ctx.fillStyle = `hsl(232, 30%, ${8 + Math.random() * 7}%)`;
      ctx.fillRect(x, h - bh, bw, bh);
      ctx.fillStyle = 'rgba(255, 214, 130, 0.85)';
      for (let wy = h - bh + 10; wy < h - 12; wy += 18) {
        for (let wx = x + 6; wx < x + bw - 8; wx += 16) {
          if (Math.random() < 0.45) ctx.fillRect(wx, wy, 7, 9);
        }
      }
      x += bw + 6 + Math.random() * 20;
    }
  });
}

function neonTexture(text, color) {
  return canvasTexture(1024, 256, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.clearRect(0, 0, w, h);
    ctx.font = '700 150px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = color;
    ctx.shadowBlur = 45;
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.strokeText(text, w / 2, h / 2);
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, w / 2, h / 2);
  });
}

// Petite faïence dorée à joints noirs (pour le four à pizza)
function goldTileTexture() {
  const t = canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#14100c'; // joints noirs
    ctx.fillRect(0, 0, w, h);
    const s = 24, g = 5; // petits carreaux + joints fins
    for (let y = g; y < h - s; y += s + g) {
      for (let x = g; x < w - s; x += s + g) {
        const hue = 42 + (Math.random() * 8 - 4);
        const sat = 62 + Math.random() * 20;
        const light = 46 + Math.random() * 16;
        ctx.fillStyle = `hsl(${hue}, ${sat}%, ${light}%)`;
        ctx.fillRect(x, y, s, s);
        // petit reflet en haut à gauche de chaque carreau
        ctx.fillStyle = 'rgba(255, 240, 200, 0.35)';
        ctx.fillRect(x + 2, y + 2, s * 0.4, s * 0.18);
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Carrelage damier du restaurant
function tileFloorTexture() {
  const t = canvasTexture(512, 512, (ctx, w, h) => {
    const c1 = '#e8e0d0', c2 = '#b8452f';
    const s = 64;
    for (let y = 0; y < h; y += s) {
      for (let x = 0; x < w; x += s) {
        ctx.fillStyle = ((x + y) / s) % 2 ? c2 : c1;
        ctx.fillRect(x, y, s - 2, s - 2);
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Ardoise menu du restaurant
function menuTexture() {
  return canvasTexture(512, 640, (ctx, w, h) => {
    ctx.fillStyle = '#20232b';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#c9a144';
    ctx.lineWidth = 10;
    ctx.strokeRect(16, 16, w - 32, h - 32);
    ctx.fillStyle = '#e9c766';
    ctx.font = 'italic 700 64px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('Menu', w / 2, 110);
    ctx.font = '400 34px Georgia, serif';
    ctx.fillStyle = '#efe9da';
    ctx.textAlign = 'left';
    const items = [['Margherita', '9€'], ['Regina', '11€'], ['Diavola', '12€'], ['4 Fromages', '12€'], ['Napolitaine', '11€']];
    items.forEach(([n, p], i) => {
      const y = 200 + i * 64;
      ctx.fillText(n, 56, y);
      ctx.textAlign = 'right';
      ctx.fillText(p, w - 56, y);
      ctx.textAlign = 'left';
    });
    ctx.fillStyle = '#e9c766';
    ctx.font = 'italic 400 30px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('— cuites au feu de bois —', w / 2, 570);
  });
}

function whiteboardTexture() {
  return canvasTexture(1024, 512, (ctx, w, h) => {
    ctx.fillStyle = '#f6f7f5';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#2b6cb0';
    ctx.lineWidth = 6;
    ctx.font = '700 54px "Comic Sans MS", cursive, sans-serif';
    ctx.fillStyle = '#2b6cb0';
    ctx.fillText('Roadmap Q3 🚀', 60, 90);
    ctx.font = '400 38px "Comic Sans MS", cursive, sans-serif';
    ctx.fillStyle = '#374151';
    ctx.fillText('• Lancer le site', 80, 170);
    ctx.fillText('• Campagne Insta', 80, 230);
    ctx.fillText('• Compta T2 ✓', 80, 290);
    ctx.strokeStyle = '#e53e3e';
    ctx.beginPath();
    ctx.moveTo(600, 140); ctx.quadraticCurveTo(700, 90, 800, 160);
    ctx.quadraticCurveTo(880, 220, 780, 280);
    ctx.stroke();
    ctx.fillStyle = '#e53e3e';
    ctx.font = '400 34px "Comic Sans MS", cursive, sans-serif';
    ctx.fillText('objectif : +30% 📈', 590, 340);
    ctx.fillStyle = '#059669';
    ctx.fillText('On y croit !', 640, 420);
  });
}

// Écrans de moniteurs selon le métier
function screenTexture(kind, accent) {
  return canvasTexture(512, 320, (ctx, w, h) => {
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, w, h);
    const rnd = (a, b) => a + Math.random() * (b - a);
    if (kind === 'code') {
      const colors = ['#7ee787', '#79c0ff', '#ffa657', '#d2a8ff', '#a5d6ff'];
      for (let y = 24; y < h - 10; y += 22) {
        let x = 20 + (Math.random() < 0.4 ? 40 : 0);
        const n = 2 + Math.floor(Math.random() * 4);
        for (let i = 0; i < n; i++) {
          const len = rnd(30, 90);
          ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
          ctx.globalAlpha = 0.9;
          ctx.fillRect(x, y, len, 10);
          x += len + 14;
          if (x > w - 60) break;
        }
      }
      ctx.globalAlpha = 1;
    } else if (kind === 'graphique') {
      ctx.strokeStyle = '#30363d';
      for (let y = 40; y < h; y += 50) { ctx.beginPath(); ctx.moveTo(30, y); ctx.lineTo(w - 20, y); ctx.stroke(); }
      const bars = 8;
      for (let i = 0; i < bars; i++) {
        const bh = rnd(30, h - 80);
        ctx.fillStyle = i % 2 ? accent : '#3fb950';
        ctx.fillRect(40 + i * ((w - 80) / bars), h - 30 - bh, (w - 80) / bars - 12, bh);
      }
      ctx.strokeStyle = '#f0f6fc';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(35, h - rnd(60, 120));
      for (let x = 90; x < w - 20; x += 55) ctx.lineTo(x, h - rnd(50, h - 70));
      ctx.stroke();
    } else if (kind === 'tableur') {
      ctx.strokeStyle = '#2d333b';
      ctx.fillStyle = '#161b22';
      ctx.fillRect(0, 0, w, 34);
      for (let x = 0; x < w; x += 74) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 34; y < h; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      ctx.font = '600 13px monospace';
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 6; c++) {
          if (Math.random() < 0.7) {
            ctx.fillStyle = c === 5 ? (Math.random() < 0.3 ? '#f85149' : '#3fb950') : '#9da7b3';
            ctx.fillText((rnd(10, 9999)).toFixed(c >= 4 ? 2 : 0), 8 + c * 74, 56 + r * 30);
          }
        }
      }
    } else if (kind === 'kanban') {
      const cols = ['#f78166', '#d29922', '#3fb950'];
      for (let c = 0; c < 3; c++) {
        const cx = 20 + c * ((w - 40) / 3);
        ctx.fillStyle = '#161b22';
        ctx.fillRect(cx, 20, (w - 40) / 3 - 12, h - 40);
        ctx.fillStyle = cols[c];
        ctx.fillRect(cx, 20, (w - 40) / 3 - 12, 8);
        const n = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) {
          ctx.fillStyle = '#21262d';
          ctx.fillRect(cx + 8, 44 + i * 62, (w - 40) / 3 - 28, 48);
          ctx.fillStyle = '#8b949e';
          ctx.fillRect(cx + 16, 56 + i * 62, rnd(40, 90), 8);
          ctx.fillRect(cx + 16, 72 + i * 62, rnd(30, 70), 8);
        }
      }
    } else if (kind === 'energie') {
      // tableau de bord de production solaire
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath(); ctx.arc(46, 44, 20, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(46 + Math.cos(a) * 26, 44 + Math.sin(a) * 26);
        ctx.lineTo(46 + Math.cos(a) * 34, 44 + Math.sin(a) * 34);
        ctx.stroke();
      }
      ctx.fillStyle = '#e6edf3';
      ctx.font = '700 22px monospace';
      ctx.fillText(`${(rnd(3, 9)).toFixed(1)} kWc`, 90, 40);
      ctx.fillStyle = '#3fb950';
      ctx.font = '600 15px monospace';
      ctx.fillText(`autoconso ${Math.round(rnd(55, 90))}%`, 90, 62);
      // courbe de production en cloche
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 20; x < w - 20; x += 6) {
        const p = (x - 20) / (w - 40);
        const y = h - 34 - Math.sin(p * Math.PI) * rnd(95, 115);
        x === 20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      // barres de production journalière
      ctx.fillStyle = 'rgba(63, 185, 80, 0.75)';
      for (let i = 0; i < 12; i++) {
        const bh = rnd(12, 55);
        ctx.fillRect(24 + i * ((w - 48) / 12), h - 26 - bh, (w - 48) / 12 - 6, bh);
      }
    } else { // document
      ctx.fillStyle = '#f6f7f5';
      ctx.fillRect(60, 16, w - 120, h - 32);
      ctx.fillStyle = '#1f2328';
      ctx.fillRect(90, 40, w - 220, 14);
      ctx.fillStyle = '#57606a';
      for (let y = 76; y < h - 40; y += 20) {
        ctx.fillRect(90, y, (w - 180) * rnd(0.6, 1), 8);
      }
    }
  });
}

// --- Mobilier --------------------------------------------------
const woodM = mat(0x9c7b57, { roughness: 0.7 });
const darkWoodM = mat(0x5d4632, { roughness: 0.75 });
const metalM = mat(0x3a3f4a, { roughness: 0.4, metalness: 0.6 });
const blackM = mat(0x14161c, { roughness: 0.5 });
const chairM = mat(0x23272f, { roughness: 0.8 });

function buildDesk(agent) {
  const g = new THREE.Group();
  // plateau + pieds
  box(g, 1.7, 0.06, 0.85, woodM, 0, 0.74, -0.15);
  for (const [sx, sz] of [[-0.78, -0.5], [0.78, -0.5], [-0.78, 0.16], [0.78, 0.16]]) {
    box(g, 0.06, 0.74, 0.06, metalM, sx, 0.37, sz);
  }
  // moniteur(s)
  const screens = agent.screen === 'code' ? 2 : 1;
  for (let i = 0; i < screens; i++) {
    const off = screens === 2 ? (i === 0 ? -0.42 : 0.42) : 0;
    const ry = screens === 2 ? (i === 0 ? 0.28 : -0.28) : 0;
    const monitor = new THREE.Group();
    box(monitor, 0.72, 0.44, 0.03, blackM, 0, 1.13, -0.42);
    const scr = new THREE.Mesh(
      new THREE.PlaneGeometry(0.66, 0.38),
      new THREE.MeshStandardMaterial({
        map: screenTexture(agent.screen || 'document', agent.accent),
        emissive: 0xffffff,
        emissiveMap: screenTexture(agent.screen || 'document', agent.accent),
        emissiveIntensity: 0.55,
        roughness: 0.4,
      })
    );
    scr.position.set(0, 1.13, -0.4);
    monitor.add(scr);
    box(monitor, 0.07, 0.16, 0.05, blackM, 0, 0.85, -0.44);
    box(monitor, 0.26, 0.02, 0.18, blackM, 0, 0.78, -0.44);
    monitor.position.x = off;
    monitor.rotation.y = ry;
    g.add(monitor);
  }
  // clavier + souris + mug
  box(g, 0.42, 0.02, 0.15, mat(0x2b303b, { roughness: 0.6 }), 0, 0.785, -0.08);
  box(g, 0.07, 0.025, 0.11, blackM, 0.32, 0.785, -0.08);
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.09, 12), mat(agent.accent, { roughness: 0.5 }));
  mug.position.set(-0.6, 0.82, -0.25);
  mug.castShadow = true;
  g.add(mug);

  // chaise de bureau
  if (agent.pose === 'sit') {
    const chair = new THREE.Group();
    box(chair, 0.44, 0.07, 0.44, chairM, 0, 0.47, 0);
    box(chair, 0.42, 0.5, 0.07, chairM, 0, 0.78, 0.24);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8), metalM);
    pole.position.y = 0.3;
    chair.add(pole);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const branch = box(chair, 0.26, 0.03, 0.04, metalM, Math.cos(a) * 0.14, 0.06, Math.sin(a) * 0.14, -a);
      branch.rotation.y = -a;
      const wheel = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), blackM);
      wheel.position.set(Math.cos(a) * 0.27, 0.035, Math.sin(a) * 0.27);
      chair.add(wheel);
    }
    chair.position.z = 0.62;
    g.add(chair);
  } else {
    // table haute pour la directrice
    g.clear();
    box(g, 1.1, 0.05, 0.6, darkWoodM, 0, 1.02, -0.75);
    box(g, 0.07, 1.0, 0.07, metalM, -0.45, 0.51, -0.75);
    box(g, 0.07, 1.0, 0.07, metalM, 0.45, 0.51, -0.75);
    const mug2 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.09, 12), mat(agent.accent, { roughness: 0.5 }));
    mug2.position.set(0.3, 1.09, -0.75);
    g.add(mug2);
  }
  return g;
}

function buildPlant(scale = 1) {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.17 * scale, 0.34 * scale, 10), mat(0xb0562f, { roughness: 0.8 }));
  pot.position.y = 0.17 * scale;
  pot.castShadow = true;
  g.add(pot);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.035 * scale, 0.05 * scale, 0.5 * scale, 7), darkWoodM);
  trunk.position.y = 0.55 * scale;
  g.add(trunk);
  const leafM = mat(0x2f9e44, { roughness: 0.85, flat: true });
  leafM.flatShading = true;
  for (let i = 0; i < 4; i++) {
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry((0.3 - i * 0.04) * scale, 0), leafM);
    leaf.position.set((Math.random() - 0.5) * 0.24 * scale, (0.85 + i * 0.2) * scale, (Math.random() - 0.5) * 0.24 * scale);
    leaf.rotation.set(Math.random(), Math.random(), Math.random());
    leaf.castShadow = true;
    g.add(leaf);
  }
  return g;
}

// --- Le restaurant ---------------------------------------------
function buildPizza(r = 0.16) {
  const g = new THREE.Group();
  const pate = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.94, 0.025, 18), mat(0xe0aa5f, { roughness: 0.8 }));
  const sauce = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r * 0.8, 0.014, 18), mat(0xc63d2a, { roughness: 0.75 }));
  sauce.position.y = 0.016;
  g.add(pate, sauce);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + Math.random();
    const mozza = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.16, r * 0.16, 0.012, 8), mat(0xf6f0dc, { roughness: 0.7 }));
    mozza.position.set(Math.cos(a) * r * 0.42, 0.026, Math.sin(a) * r * 0.42);
    g.add(mozza);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// Four à pizza napolitain : dôme rond en petite faïence or, joints noirs
function buildPizzaOven() {
  const g = new THREE.Group();
  const tiles = goldTileTexture();
  const tileM = new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.35, metalness: 0.35 });
  const brickM = mat(0x3a3230, { roughness: 0.9 });

  // socle maçonné + plan de travail
  box(g, 2.6, 1.02, 2.4, brickM, 0, 0.51, 0);
  box(g, 2.75, 0.08, 2.55, mat(0x8a7a68, { roughness: 0.7 }), 0, 1.06, 0);
  // frise de faïence dorée sur le socle
  const frieze = new THREE.Mesh(new THREE.BoxGeometry(2.62, 0.3, 2.42), tileM);
  frieze.position.y = 0.82;
  frieze.castShadow = true;
  g.add(frieze);

  // le dôme bien rond
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.06, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2), tileM);
  dome.position.y = 1.1;
  dome.scale.y = 0.92;
  dome.castShadow = true;
  g.add(dome);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(1.07, 1.1, 0.14, 32), tileM);
  collar.position.y = 1.14;
  g.add(collar);

  // bouche du four (face +x) : encadrement brique, fond noir, braises
  const mouth = new THREE.Group();
  box(mouth, 0.34, 0.52, 0.78, mat(0x6e3b2a, { roughness: 0.85 }), 0.92, 1.36, 0);
  const opening = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.3, 16, 1, false, 0, Math.PI), mat(0x070605, { roughness: 1 }));
  opening.rotation.z = -Math.PI / 2;
  opening.rotation.y = Math.PI / 2;
  opening.position.set(1.02, 1.32, 0);
  mouth.add(opening);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.06, 8, 18, Math.PI), tileM);
  arch.rotation.y = Math.PI / 2;
  arch.position.set(1.09, 1.32, 0);
  mouth.add(arch);
  const embers = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.22),
    new THREE.MeshBasicMaterial({ color: 0xff8a3c })
  );
  embers.rotation.y = Math.PI / 2;
  embers.position.set(1.0, 1.2, 0);
  mouth.add(embers);
  g.add(mouth);
  const fire = new THREE.PointLight(0xff7733, 10, 5, 1.9);
  fire.position.set(1.5, 1.35, 0);
  g.add(fire);

  // cheminée
  box(g, 0.36, 1.5, 0.36, brickM, -0.25, 2.6, 0);
  box(g, 0.48, 0.1, 0.48, mat(0x8a7a68), -0.25, 3.38, 0);

  // bûches empilées + pelle à pizza
  for (const [ly, lz] of [[0.12, 0.9], [0.12, 1.08], [0.29, 0.99]]) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.6, 9), mat(0x6b4a2b, { roughness: 1 }));
    log.rotation.z = Math.PI / 2;
    log.position.set(1.55, ly, lz);
    log.castShadow = true;
    g.add(log);
  }
  const peelHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.7, 8), mat(0x9c7b57));
  peelHandle.position.set(1.42, 0.95, -1.05);
  peelHandle.rotation.z = 0.28;
  const peelHead = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 14), mat(0xb9c1c9, { metalness: 0.6, roughness: 0.4 }));
  peelHead.position.set(1.66, 1.78, -1.05);
  peelHead.rotation.z = 0.28 + Math.PI / 2;
  g.add(peelHandle, peelHead);
  return g;
}

// Comptoir de cuisine ouverte (plan inox + ingrédients)
function buildKitchenCounter() {
  const g = new THREE.Group();
  box(g, 0.75, 0.96, 3.6, mat(0x30343d, { roughness: 0.7 }), 0, 0.48, 0);
  box(g, 0.85, 0.06, 3.75, mat(0xb9c1c9, { metalness: 0.7, roughness: 0.3 }), 0, 1.0, 0);
  // planche + pizza en préparation
  box(g, 0.4, 0.03, 0.5, darkWoodM, 0, 1.05, -1.1);
  const prep = buildPizza(0.17);
  prep.position.set(0, 1.07, -1.1);
  g.add(prep);
  // bols d'ingrédients (sauce, farine, basilic)
  for (const [bz, colr] of [[-0.3, 0xc63d2a], [0.1, 0xf3ead5], [0.5, 0x2f9e44]]) {
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.1, 12), mat(0xdfd8ca, { roughness: 0.5 }));
    bowl.position.set(0.05, 1.08, bz);
    const contenu = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 12), mat(colr, { roughness: 0.8 }));
    contenu.position.set(0.05, 1.13, bz);
    bowl.castShadow = true;
    g.add(bowl, contenu);
  }
  // pile d'assiettes
  for (let i = 0; i < 4; i++) {
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.02, 14), mat(0xf5f2ec, { roughness: 0.4 }));
    plate.position.set(-0.1, 1.04 + i * 0.024, 1.25);
    g.add(plate);
  }
  return g;
}

// Table de bistrot + 2 chaises
function buildDiningTable(withPizza) {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.05, 20), darkWoodM);
  top.position.y = 0.74;
  top.castShadow = true;
  g.add(top);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.72, 10), blackM);
  leg.position.y = 0.37;
  g.add(leg);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.04, 16), blackM);
  foot.position.y = 0.02;
  g.add(foot);
  if (withPizza) {
    const pz = buildPizza(0.15);
    pz.position.y = 0.77;
    g.add(pz);
  } else {
    // deux verres
    for (const gx of [-0.18, 0.16]) {
      const verre = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.028, 0.11, 10), mat(0xbfd8d2, { roughness: 0.15, metalness: 0.1 }));
      verre.position.set(gx, 0.82, gx * 0.6);
      g.add(verre);
    }
  }
  // chaises bistrot de part et d'autre
  const chairM2 = mat(0x7a2e2e, { roughness: 0.85 });
  for (const side of [-1, 1]) {
    const ch = new THREE.Group();
    box(ch, 0.36, 0.045, 0.36, chairM2, 0, 0.46, 0);
    box(ch, 0.36, 0.42, 0.04, chairM2, 0, 0.7, 0.17);
    for (const [lx, lz] of [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]]) {
      box(ch, 0.035, 0.46, 0.035, blackM, lx, 0.23, lz);
    }
    ch.position.set(side * 0.72, 0, side * 0.18);
    ch.rotation.y = side > 0 ? Math.PI + 0.35 : -0.25;
    g.add(ch);
  }
  return g;
}

// Coin chantier : escabeau, caisse à outils, peinture, planches
function buildChantier() {
  const g = new THREE.Group();
  // escabeau en A
  const alu = mat(0xb9c1c9, { metalness: 0.6, roughness: 0.4 });
  for (const side of [-1, 1]) {
    for (const lx of [-0.28, 0.28]) {
      const montant = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.5, 0.05), alu);
      montant.position.set(lx, 0.72, side * 0.3);
      montant.rotation.x = side * 0.32;
      montant.castShadow = true;
      g.add(montant);
    }
  }
  for (let i = 0; i < 4; i++) {
    const marche = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.12), alu);
    marche.position.set(0, 0.25 + i * 0.34, -0.3 + (0.25 + i * 0.34) * 0.33);
    marche.castShadow = true;
    g.add(marche);
  }
  const sommet = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.05, 0.22), alu);
  sommet.position.set(0, 1.42, 0);
  g.add(sommet);

  // caisse à outils rouge
  const caisse = new THREE.Group();
  box(caisse, 0.5, 0.22, 0.26, mat(0xc0392b, { roughness: 0.5 }), 0, 0.11, 0);
  const poignee = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.018, 8, 14, Math.PI), mat(0x2c2c31, { metalness: 0.5, roughness: 0.4 }));
  poignee.position.set(0, 0.22, 0);
  caisse.add(poignee);
  // manche de marteau qui dépasse
  const manche = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.3, 8), darkWoodM);
  manche.position.set(0.15, 0.3, 0.02);
  manche.rotation.z = -0.4;
  caisse.add(manche);
  caisse.position.set(0.85, 0, 0.55);
  caisse.rotation.y = 0.5;
  g.add(caisse);

  // pots de peinture (dont un ouvert, jaune chantier)
  for (const [px, pz, open] of [[-0.85, 0.6, true], [-1.05, 0.35, false]]) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.12, 0.24, 14), mat(0x8f9aa5, { metalness: 0.5, roughness: 0.4 }));
    pot.position.set(px, 0.12, pz);
    pot.castShadow = true;
    g.add(pot);
    if (open) {
      const peinture = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.02, 14), mat(0xfacc15, { roughness: 0.4 }));
      peinture.position.set(px, 0.245, pz);
      g.add(peinture);
      const pinceau = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.26, 0.02), darkWoodM);
      pinceau.position.set(px + 0.1, 0.3, pz);
      pinceau.rotation.z = -0.5;
      g.add(pinceau);
    }
  }

  // planches appuyées contre le mur
  for (let i = 0; i < 3; i++) {
    const planche = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.0, 0.03), woodM);
    planche.position.set(1.6 + i * 0.08, 0.95, -0.75 + i * 0.1);
    planche.rotation.x = -0.28;
    planche.rotation.y = 0.15;
    planche.castShadow = true;
    g.add(planche);
  }

  // panneau « travaux » au sol
  const panneau = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.02), mat(0xfacc15, { roughness: 0.5 }));
  panneau.position.set(-0.2, 0.35, 0.95);
  panneau.rotation.x = -0.25;
  panneau.rotation.y = 2.6;
  panneau.castShadow = true;
  g.add(panneau);
  const bande = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.022), mat(0x1d1d22));
  bande.position.copy(panneau.position);
  bande.rotation.copy(panneau.rotation);
  g.add(bande);
  return g;
}

// Enseigne RDF Énergie (soleil + texte)
function rdfSignTexture() {
  return canvasTexture(1024, 300, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(10, 16, 30, 0.92)';
    ctx.beginPath();
    ctx.roundRect(10, 10, w - 20, h - 20, 34);
    ctx.fill();
    ctx.strokeStyle = '#84cc16';
    ctx.lineWidth = 6;
    ctx.stroke();
    // soleil
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.arc(130, h / 2, 52, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 10; ctx.lineCap = 'round';
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(130 + Math.cos(a) * 68, h / 2 + Math.sin(a) * 68);
      ctx.lineTo(130 + Math.cos(a) * 92, h / 2 + Math.sin(a) * 92);
      ctx.stroke();
    }
    ctx.fillStyle = '#f4f6fb';
    ctx.font = '800 96px system-ui, sans-serif';
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 22;
    ctx.fillText('RDF ÉNERGIE', 260, 140);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#9fd44a';
    ctx.font = '500 38px system-ui, sans-serif';
    ctx.fillText('Photovoltaïque · Médoc & Sud-Ouest', 262, 214);
  });
}

// Texture de cellules photovoltaïques (bleu nuit, quadrillage)
function solarCellTexture() {
  return canvasTexture(512, 320, (ctx, w, h) => {
    ctx.fillStyle = '#0b1d3a';
    ctx.fillRect(0, 0, w, h);
    const cw = w / 8, chh = h / 5;
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 8; x++) {
        ctx.fillStyle = `hsl(216, 62%, ${16 + Math.random() * 7}%)`;
        ctx.fillRect(x * cw + 4, y * chh + 4, cw - 8, chh - 8);
        ctx.fillStyle = 'rgba(255,255,255,0.14)';
        ctx.fillRect(x * cw + 7, y * chh + 7, cw * 0.4, 4);
      }
    }
  });
}

// Le petit bureau d'angle RDF Énergie (décor solaire)
function buildRdfCorner() {
  const g = new THREE.Group();

  // tapis vert énergie sous le coin
  const rug = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 0.02, 26), mat(0x33502a, { roughness: 1 }));
  rug.position.set(-8.1, 0.012, 5.6);
  rug.receiveShadow = true;
  g.add(rug);

  // enseigne lumineuse sur le mur gauche
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(3.3, 0.97),
    new THREE.MeshBasicMaterial({ map: rdfSignTexture(), transparent: true })
  );
  sign.rotation.y = Math.PI / 2;
  sign.position.set(-ROOM.w / 2 + 0.13, 2.55, 5.6);
  g.add(sign);
  const signLight = new THREE.PointLight(0xfbbf24, 5, 5);
  signLight.position.set(-ROOM.w / 2 + 0.8, 2.4, 5.6);
  g.add(signLight);

  // panneau solaire d'exposition (montage au sol incliné, comme sur
  // une installation réelle : haut à l'arrière, bas à l'avant)
  const expo = new THREE.Group();
  const cells = new THREE.MeshStandardMaterial({ map: solarCellTexture(), roughness: 0.35, metalness: 0.3 });
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.05, 0.85), cells);
  panel.position.y = 0.62;
  panel.rotation.x = -0.55;
  panel.castShadow = true;
  expo.add(panel);
  const alu = mat(0xb9c1c9, { metalness: 0.6, roughness: 0.4 });
  for (const side of [-1, 1]) {
    const legB = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.82, 0.05), alu);
    legB.position.set(side * 0.52, 0.41, -0.3);
    const legF = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.38, 0.05), alu);
    legF.position.set(side * 0.52, 0.19, 0.3);
    expo.add(legB, legF);
  }
  const traverse = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.05, 0.05), alu);
  traverse.position.set(0, 0.36, 0);
  expo.add(traverse);
  expo.position.set(-6.7, 0, 6.5);
  expo.rotation.y = 0.65; // tourné vers la caméra
  g.add(expo);

  // table d'appoint avec maquette de maison + panneaux sur le toit
  const table = new THREE.Group();
  box(table, 0.55, 0.5, 0.4, darkWoodM, 0, 0.25, 0);
  const maison = new THREE.Group();
  box(maison, 0.3, 0.18, 0.24, mat(0xefe6d5, { roughness: 0.9 }), 0, 0.6, 0);
  const toit = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.16), mat(0x8c3b2e, { roughness: 0.85 }));
  toit.position.set(0, 0.74, 0);
  toit.rotation.z = 0; toit.rotation.x = Math.PI / 4;
  toit.castShadow = true;
  maison.add(toit);
  for (const px of [-0.08, 0.04]) {
    const mini = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 0.09), cells);
    mini.position.set(px, 0.795, -0.062);
    mini.rotation.x = -Math.PI / 4;
    maison.add(mini);
  }
  table.add(maison);
  table.position.set(-9.5, 0, 5.58);
  g.add(table);

  // batterie de stockage murale (LED verte)
  const batt = new THREE.Group();
  box(batt, 0.4, 0.62, 0.14, mat(0xf0f2f4, { roughness: 0.4 }), 0, 0, 0);
  box(batt, 0.4, 0.1, 0.145, mat(0x84cc16, { roughness: 0.5 }), 0, 0.2, 0);
  const led = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 8), mat(0x22c55e, { emissive: 0x22c55e, emissiveIntensity: 1.6 }));
  led.rotation.x = Math.PI / 2;
  led.position.set(0.1, -0.05, 0.075);
  batt.add(led);
  batt.rotation.y = Math.PI / 2;
  batt.position.set(-ROOM.w / 2 + 0.18, 1.15, 3.9);
  g.add(batt);

  // borne de recharge véhicule électrique
  const borne = new THREE.Group();
  box(borne, 0.28, 1.05, 0.16, mat(0xf0f2f4, { roughness: 0.4 }), 0, 0.53, 0);
  const ecran = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.1), mat(0x06283a, { emissive: 0x06b6d4, emissiveIntensity: 0.7 }));
  ecran.position.set(0, 0.82, 0.085);
  borne.add(ecran);
  const prise = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 10), mat(0x22262e, { roughness: 0.5 }));
  prise.rotation.x = Math.PI / 2;
  prise.position.set(0, 0.5, 0.09);
  borne.add(prise);
  borne.position.set(-5.75, 0, 7.0);
  borne.rotation.y = 0.9;
  g.add(borne);

  return g;
}

// Cloison basse végétalisée entre le restaurant et l'open space
function buildDivider() {
  const g = new THREE.Group();
  const wallM2 = mat(0x232a3e, { roughness: 0.9 });
  const leafM = mat(0x2f9e44, { roughness: 0.9, flat: true });
  for (const cx of [-5.5, 5.5]) {
    box(g, 9, 0.92, 0.18, wallM2, cx, 0.46, 0);
    box(g, 9.1, 0.05, 0.3, darkWoodM, cx, 0.95, 0);
    // liseré doré côté restaurant
    box(g, 9, 0.05, 0.02, mat(0xc9a144, { emissive: 0xc9a144, emissiveIntensity: 0.35, metalness: 0.5, roughness: 0.4 }), cx, 0.7, 0.1);
    for (let i = -3.8; i <= 3.8; i += 1.25) {
      if (Math.random() < 0.85) {
        const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16 + Math.random() * 0.05, 0), leafM);
        bush.position.set(cx + i, 1.06, 0);
        bush.rotation.set(Math.random(), Math.random(), 0);
        bush.castShadow = true;
        g.add(bush);
      }
    }
  }
  return g;
}

// Ardoise menu sur chevalet
function buildMenuBoard() {
  const g = new THREE.Group();
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.84, 0.035), mat(0x20232b, { map: menuTexture(), roughness: 0.7 }));
  board.position.y = 0.78;
  board.rotation.x = -0.1;
  board.castShadow = true;
  g.add(board);
  for (const side of [-1, 1]) {
    const legF = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.25, 8), darkWoodM);
    legF.position.set(side * 0.3, 0.6, 0.1);
    legF.rotation.x = 0.18;
    const legB = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.25, 8), darkWoodM);
    legB.position.set(side * 0.3, 0.6, -0.14);
    legB.rotation.x = -0.22;
    g.add(legF, legB);
  }
  return g;
}

function buildArcade() {
  const g = new THREE.Group();
  box(g, 0.8, 1.8, 0.7, mat(0x231a3e, { roughness: 0.6 }), 0, 0.9, 0);
  const scr = new THREE.Mesh(
    new THREE.PlaneGeometry(0.58, 0.44),
    mat(0x000000, {
      emissive: 0x27e0a3, emissiveIntensity: 0.8, roughness: 0.3,
      map: canvasTexture(256, 192, (ctx, w, h) => {
        ctx.fillStyle = '#03120c'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#27e0a3';
        for (let i = 0; i < 5; i++) ctx.fillRect(20 + i * 44, 30, 26, 20);
        for (let i = 0; i < 4; i++) ctx.fillRect(42 + i * 44, 66, 26, 20);
        ctx.fillRect(w / 2 - 12, h - 40, 24, 18);
        ctx.fillRect(w / 2 - 4, h - 58, 8, 18);
      }),
    })
  );
  scr.position.set(0, 1.25, 0.355);
  scr.rotation.x = -0.12;
  g.add(scr);
  box(g, 0.8, 0.14, 0.32, mat(0x1a1330), 0, 0.86, 0.42);
  const joy = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), mat(0xe03131, { roughness: 0.4 }));
  joy.position.set(-0.18, 0.99, 0.42);
  g.add(joy);
  for (const [bx, colr] of [[0.08, 0xffd43b], [0.22, 0x4dabf7]]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 10), mat(colr, { roughness: 0.4 }));
    b.position.set(bx, 0.94, 0.45);
    g.add(b);
  }
  box(g, 0.86, 0.28, 0.76, mat(0x2e2352), 0, 1.94, 0, 0);
  return g;
}

function buildShelf() {
  const g = new THREE.Group();
  box(g, 0.06, 2.2, 0.9, darkWoodM, -0.6, 1.1, 0);
  box(g, 0.06, 2.2, 0.9, darkWoodM, 0.6, 1.1, 0);
  const bookColors = [0xc0392b, 0x2980b9, 0x27ae60, 0xf39c12, 0x8e44ad, 0x16a085, 0xd35400];
  for (let s = 0; s < 4; s++) {
    const y = 0.35 + s * 0.55;
    box(g, 1.26, 0.05, 0.9, darkWoodM, 0, y, 0);
    let x = -0.5;
    while (x < 0.42) {
      const bw = 0.05 + Math.random() * 0.06;
      const bh = 0.28 + Math.random() * 0.14;
      if (Math.random() < 0.82) {
        box(g, bw, bh, 0.5, mat(bookColors[Math.floor(Math.random() * bookColors.length)], { roughness: 0.85 }), x + bw / 2, y + bh / 2 + 0.03, 0);
      }
      x += bw + 0.015;
    }
  }
  return g;
}

// --- Construction de la scène ----------------------------------
export function buildOffice(scene, agents) {
  const root = new THREE.Group();
  scene.add(root);

  // Sol
  const floorTex = floorTexture();
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(3, 2.2);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.d), mat(0xffffff, { map: floorTex, roughness: 0.8 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  root.add(floor);

  // Sol carrelé damier côté restaurant (devant la cloison)
  const tileTex = tileFloorTexture();
  tileTex.repeat.set(10, 4.4);
  const restoFloor = new THREE.Mesh(new THREE.PlaneGeometry(19.6, 8.5), mat(0xffffff, { map: tileTex, roughness: 0.6 }));
  restoFloor.rotation.x = -Math.PI / 2;
  restoFloor.position.set(0, 0.006, 3.2);
  restoFloor.receiveShadow = true;
  root.add(restoFloor);

  // Tapis sous les pods de bureaux (zone open space)
  const rugM1 = mat(0x2f3d55, { roughness: 1 });
  const rugM2 = mat(0x50395c, { roughness: 1 });
  for (const [rx, rz, rm] of [[-5.1, -3.9, rugM1], [5.1, -3.9, rugM2]]) {
    const rug = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 0.02, 28), rm);
    rug.position.set(rx, 0.011, rz);
    rug.receiveShadow = true;
    root.add(rug);
  }

  // Cloison basse végétalisée : restaurant devant, open space derrière
  const divider = buildDivider();
  divider.position.set(0, 0, -1.3);
  root.add(divider);

  // Murs (fond + gauche + droit)
  const wallM = mat(0xe7e2d9, { roughness: 0.95 });
  const accentWallM = mat(0x1d2438, { roughness: 0.9 });
  const back = box(root, ROOM.w, ROOM.h, 0.2, accentWallM, 0, ROOM.h / 2, -ROOM.d / 2);
  back.receiveShadow = true;
  box(root, 0.2, ROOM.h, ROOM.d, wallM, -ROOM.w / 2, ROOM.h / 2, 0);
  box(root, 0.2, ROOM.h, ROOM.d, wallM, ROOM.w / 2, ROOM.h / 2, 0);
  // plinthes lumineuses sur le mur du fond
  box(root, ROOM.w, 0.08, 0.06, mat(0x8b5cf6, { emissive: 0x8b5cf6, emissiveIntensity: 1.4 }), 0, 0.1, -ROOM.d / 2 + 0.14);

  // Baies vitrées (mur du fond) avec ville nocturne
  const city = cityTexture();
  for (const wx of [-6.4, 6.4]) {
    const frame = box(root, 5.4, 2.6, 0.12, blackM, wx, 2.1, -ROOM.d / 2 + 0.12);
    frame.receiveShadow = false;
    const view = new THREE.Mesh(
      new THREE.PlaneGeometry(5.1, 2.35),
      new THREE.MeshBasicMaterial({ map: city })
    );
    view.position.set(wx, 2.1, -ROOM.d / 2 + 0.19);
    root.add(view);
    // croisillons
    box(root, 0.06, 2.6, 0.14, blackM, wx - 1.35, 2.1, -ROOM.d / 2 + 0.13);
    box(root, 0.06, 2.6, 0.14, blackM, wx + 1.35, 2.1, -ROOM.d / 2 + 0.13);
  }

  // Néon "RESTO • IA" au centre du mur du fond
  const neon = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 1.15),
    new THREE.MeshBasicMaterial({ map: neonTexture('RESTO • IA', '#8b5cf6'), transparent: true })
  );
  neon.position.set(0, 3.1, -ROOM.d / 2 + 0.15);
  root.add(neon);
  const neonLight = new THREE.PointLight(0x8b5cf6, 14, 8);
  neonLight.position.set(0, 3.0, -ROOM.d / 2 + 0.8);
  root.add(neonLight);

  // Tableau blanc près de la directrice
  const wb = new THREE.Group();
  box(wb, 2.1, 1.3, 0.05, mat(0xffffff, { map: whiteboardTexture(), roughness: 0.5 }), 0, 1.85, 0);
  box(wb, 2.2, 1.4, 0.03, metalM, 0, 1.85, -0.02);
  wb.position.set(-2.8, 0, -ROOM.d / 2 + 0.16);
  root.add(wb);

  // Horloge murale
  const clock = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.05, 24), mat(0xf5f2ec, { roughness: 0.4 }));
  clock.rotation.x = Math.PI / 2;
  clock.position.set(2.8, 3.1, -ROOM.d / 2 + 0.15);
  root.add(clock);

  // ================= LE RESTAURANT (zone avant) =================
  // Four à pizza napolitain — dôme en faïence or, joints noirs
  const oven = buildPizzaOven();
  oven.position.set(-8.3, 0, 0.6);
  root.add(oven);

  // Néon PIZZERIA au-dessus de la cuisine (mur gauche)
  const pizzeriaNeon = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 0.95),
    new THREE.MeshBasicMaterial({ map: neonTexture('PIZZERIA', '#f2c14e'), transparent: true })
  );
  pizzeriaNeon.rotation.y = Math.PI / 2;
  pizzeriaNeon.position.set(-ROOM.w / 2 + 0.13, 3.0, 2.6);
  root.add(pizzeriaNeon);
  const pizzeriaLight = new THREE.PointLight(0xf2c14e, 8, 6);
  pizzeriaLight.position.set(-ROOM.w / 2 + 0.8, 2.9, 2.6);
  root.add(pizzeriaLight);

  // Comptoir de cuisine ouverte
  const counter = buildKitchenCounter();
  counter.position.set(-6.55, 0, 2.9);
  root.add(counter);

  // Tables de la salle
  for (const [tx, tz, pizza] of [[1.5, 5.0, true], [4.8, 2.2, false], [7.2, 5.0, false]]) {
    const table = buildDiningTable(pizza);
    table.position.set(tx, 0, tz);
    table.rotation.y = Math.random() * Math.PI;
    root.add(table);
  }

  // Ardoise menu à l'entrée du passage
  const menu = buildMenuBoard();
  menu.position.set(1.8, 0, -0.55);
  menu.rotation.y = 0.5;
  root.add(menu);

  // ================= L'OPEN SPACE (zone arrière) =================
  const shelf = buildShelf();
  shelf.rotation.y = Math.PI / 2;
  shelf.position.set(-ROOM.w / 2 + 0.55, 0, -5.6);
  root.add(shelf);

  for (const [px, pz, s] of [[-9, -6.6, 1.3], [9, -6.6, 1.2], [2.2, 6.8, 1.1], [1.6, -6.3, 0.9], [9.2, 6.5, 1.0]]) {
    const p = buildPlant(s);
    p.position.set(px, 0, pz);
    root.add(p);
  }

  const arcade = buildArcade();
  arcade.rotation.y = -Math.PI / 2;
  arcade.position.set(ROOM.w / 2 - 0.55, 0, -2.8);
  root.add(arcade);

  // Machine à café
  const coffee = new THREE.Group();
  box(coffee, 1.0, 0.9, 0.55, darkWoodM, 0, 0.45, 0);
  box(coffee, 0.42, 0.5, 0.4, mat(0x900c3f, { roughness: 0.35, metalness: 0.3 }), -0.2, 1.15, 0);
  box(coffee, 0.1, 0.06, 0.1, blackM, -0.2, 1.0, 0.18);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.08, 10), mat(0xf5f2ec));
  cup.position.set(0.22, 0.94, 0.1);
  coffee.add(cup);
  coffee.rotation.y = Math.PI / 2;
  coffee.position.set(-ROOM.w / 2 + 0.5, 0, -3.2);
  root.add(coffee);

  // Suspensions lumineuses
  const bulbs = [];
  for (const [lx, lz] of [[-5.1, -3.9], [5.1, -3.9], [0, -5.0], [4.8, 2.2], [1.8, 4.8]]) {
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.1, 6), blackM);
    cord.position.set(lx, ROOM.h - 0.55, lz);
    root.add(cord);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.3, 16, 1, true), mat(0x3d4350, { roughness: 0.5, emissive: 0xffdf99, emissiveIntensity: 0.12, side: THREE.DoubleSide }));
    shade.position.set(lx, ROOM.h - 1.12, lz);
    root.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), mat(0xfff2cc, { emissive: 0xffdf99, emissiveIntensity: 2.2 }));
    bulb.position.set(lx, ROOM.h - 1.22, lz);
    root.add(bulb);
    const pl = new THREE.PointLight(0xffe0b0, 18, 9, 1.8);
    pl.position.set(lx, ROOM.h - 1.35, lz);
    root.add(pl);
    bulbs.push(bulb);
  }

  // Coin chantier de Sébastien (zone droite de l'open space)
  const chantier = buildChantier();
  chantier.position.set(5.6, 0, -4.3);
  root.add(chantier);

  // Petit bureau d'angle RDF Énergie (Marie & Romain, photovoltaïque)
  root.add(buildRdfCorner());

  // Postes de travail des agents (les agents « en zone » — cuisine,
  // chantier — n'ont pas de bureau : leur poste est dans le décor)
  const deskGroups = new Map();
  for (const agent of agents) {
    if (agent.zone) continue;
    const dg = buildDesk(agent);
    dg.position.set(agent.desk.x, 0, agent.desk.z);
    dg.rotation.y = agent.desk.ry;
    root.add(dg);
    deskGroups.set(agent.id, dg);
  }

  return { root, deskGroups, ROOM };
}

export function buildLights(scene, opts = {}) {
  const ambient = new THREE.AmbientLight(0xbfc8e6, 0.55);
  scene.add(ambient);
  const hemi = new THREE.HemisphereLight(0xdde4ff, 0x3a3226, 0.5);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xfff1dd, 1.6);
  dir.position.set(6, 9, 5);
  dir.castShadow = true;
  const res = opts.lowPower ? 1024 : 2048; // ombres allégées sur mobile
  dir.shadow.mapSize.set(res, res);
  dir.shadow.camera.left = -12;
  dir.shadow.camera.right = 12;
  dir.shadow.camera.top = 12;
  dir.shadow.camera.bottom = -12;
  dir.shadow.bias = -0.0004;
  scene.add(dir);
}
