// ============================================================
//  Réglages de connexion à l'API (compatible OpenAI).
//  Fonctionne avec Hermes (Nous Research), Open WebUI, Ollama,
//  OpenAI, ou tout autre serveur compatible /chat/completions.
// ============================================================

const STORAGE_KEY = 'restoia.settings.v1';

export const PRESETS = {
  vps: {
    label: 'Mon Hermes Agent (ce serveur)',
    baseUrl: '/v1',
    model: 'hermes',
    hint: 'Interface servie par votre VPS : /v1 est relayé vers Hermes. Clé = API_SERVER_KEY (affichée par install-vps.sh). « Tester la connexion » remplit le modèle automatiquement.',
  },
  hermes: {
    label: 'Hermes — Nous Research (cloud)',
    baseUrl: 'https://inference-api.nousresearch.com/v1',
    model: 'Hermes-4-405B',
    hint: 'Créez une clé API sur portal.nousresearch.com',
  },
  openwebui: {
    label: 'Open WebUI (local)',
    baseUrl: 'http://localhost:3000/api',
    model: '',
    hint: 'Clé API : Paramètres → Compte → Clés API dans Open WebUI',
  },
  ollama: {
    label: 'Ollama (local)',
    baseUrl: 'http://localhost:11434/v1',
    model: 'hermes3',
    hint: 'Aucune clé requise. Lancez « ollama pull hermes3 » d\'abord.',
  },
  openai: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    hint: 'Clé API sur platform.openai.com',
  },
  autre: {
    label: 'Autre serveur compatible OpenAI',
    baseUrl: '',
    model: '',
    hint: 'Toute API exposant POST /chat/completions',
  },
};

const DEFAULTS = {
  preset: 'vps',
  baseUrl: '/v1',
  apiKey: '',
  model: PRESETS.vps.model,
  temperature: 0.7,
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch (_) { /* stockage indisponible */ }
  return { ...DEFAULTS };
}

export function saveSettings(s) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch (_) { /* stockage indisponible */ }
}

export function isConfigured(s) {
  return Boolean(s.baseUrl && s.model);
}

// --- Interface du panneau de réglages -------------------------
export function initSettingsUI(onSaved) {
  const modal = document.getElementById('settings-modal');
  const form = document.getElementById('settings-form');
  const presetSel = document.getElementById('set-preset');
  const urlInput = document.getElementById('set-url');
  const keyInput = document.getElementById('set-key');
  const modelInput = document.getElementById('set-model');
  const tempInput = document.getElementById('set-temp');
  const tempVal = document.getElementById('set-temp-val');
  const hintEl = document.getElementById('set-hint');
  const statusEl = document.getElementById('set-status');

  for (const [id, p] of Object.entries(PRESETS)) {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = p.label;
    presetSel.appendChild(opt);
  }

  function fill(s) {
    presetSel.value = s.preset;
    urlInput.value = s.baseUrl;
    keyInput.value = s.apiKey;
    modelInput.value = s.model;
    tempInput.value = s.temperature;
    tempVal.textContent = Number(s.temperature).toFixed(1);
    hintEl.textContent = PRESETS[s.preset]?.hint || '';
  }

  presetSel.addEventListener('change', () => {
    const p = PRESETS[presetSel.value];
    if (p) {
      if (p.baseUrl) urlInput.value = p.baseUrl;
      modelInput.value = p.model;
      hintEl.textContent = p.hint;
    }
  });

  tempInput.addEventListener('input', () => {
    tempVal.textContent = Number(tempInput.value).toFixed(1);
  });

  document.getElementById('btn-settings').addEventListener('click', open);
  document.getElementById('settings-close').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  document.getElementById('btn-test').addEventListener('click', async () => {
    statusEl.textContent = 'Test de connexion en cours…';
    statusEl.className = 'set-status';
    try {
      const headers = {};
      if (keyInput.value.trim()) headers.Authorization = `Bearer ${keyInput.value.trim()}`;
      const res = await fetch(`${urlInput.value.replace(/\/+$/, '')}/models`, { headers });
      if (res.ok) {
        let names = [];
        try {
          const json = await res.json();
          names = (json.data || []).map((m) => m.id).filter(Boolean);
        } catch (_) { /* réponse non-JSON */ }
        if (names.length) {
          statusEl.textContent = `✅ Connexion réussie ! Modèles disponibles : ${names.slice(0, 6).join(', ')}`;
          if (!modelInput.value.trim() || !names.includes(modelInput.value.trim())) {
            modelInput.value = names[0];
          }
        } else {
          statusEl.textContent = '✅ Connexion réussie ! Le serveur répond.';
        }
        statusEl.className = 'set-status ok';
      } else {
        statusEl.textContent = `⚠️ Le serveur a répondu ${res.status}. Vérifiez l'URL et la clé API.`;
        statusEl.className = 'set-status warn';
      }
    } catch (err) {
      statusEl.textContent = '❌ Connexion impossible. Vérifiez l\'URL (et le CORS si serveur local).';
      statusEl.className = 'set-status err';
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const s = {
      preset: presetSel.value,
      baseUrl: urlInput.value.trim().replace(/\/+$/, ''),
      apiKey: keyInput.value.trim(),
      model: modelInput.value.trim(),
      temperature: Number(tempInput.value),
    };
    saveSettings(s);
    statusEl.textContent = '';
    close();
    onSaved?.(s);
  });

  function open() {
    fill(loadSettings());
    statusEl.textContent = '';
    modal.classList.add('visible');
  }
  function close() {
    modal.classList.remove('visible');
  }

  return { open, close };
}
