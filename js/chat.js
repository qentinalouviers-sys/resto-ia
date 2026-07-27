// ============================================================
//  Panneau de chat : conversation avec un agent, ou réunion
//  d'équipe où chaque agent donne son avis à tour de rôle.
//  Streaming SSE compatible OpenAI (/chat/completions).
// ============================================================

import { loadSettings, isConfigured } from './settings.js';
import { getAgent } from './agents.js';

const HISTORY_KEY = 'restoia.conversations.v1';
const MEETING_KEY = 'reunion';
const MAX_TURNS = 40; // messages conservés par conversation

let currentAgent = null;    // conversation solo
let currentMeeting = null;  // réunion : liste d'agents
let conversations = loadConversations();
let abortController = null;
let settingsOpener = null;
let onCloseCallback = null;

const els = {};

function loadConversations() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || {};
  } catch (_) { return {}; }
}

function persist() {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(conversations));
  } catch (_) { /* stockage plein ou indisponible */ }
}

// --- Mini-rendu Markdown (sans dépendance) ---------------------
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function renderMarkdown(text) {
  const codeBlocks = [];
  let t = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    codeBlocks.push({ lang, code });
    return ` CODE${codeBlocks.length - 1} `;
  });
  t = escapeHtml(t);
  t = t.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  t = t.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|\s)\*([^*\n]+)\*(?=\s|$|[.,!?;:])/g, '$1<em>$2</em>');
  t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const lines = t.split('\n');
  const out = [];
  let inUl = false, inOl = false;
  const closeLists = () => {
    if (inUl) { out.push('</ul>'); inUl = false; }
    if (inOl) { out.push('</ol>'); inOl = false; }
  };
  for (const line of lines) {
    const h = line.match(/^(#{1,4})\s+(.*)/);
    const ul = line.match(/^\s*[-•*]\s+(.*)/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)/);
    if (h) {
      closeLists();
      const lvl = Math.min(h[1].length + 2, 5);
      out.push(`<h${lvl}>${h[2]}</h${lvl}>`);
    } else if (ul) {
      if (!inUl) { closeLists(); out.push('<ul>'); inUl = true; }
      out.push(`<li>${ul[1]}</li>`);
    } else if (ol) {
      if (!inOl) { closeLists(); out.push('<ol>'); inOl = true; }
      out.push(`<li>${ol[1]}</li>`);
    } else if (line.trim() === '') {
      closeLists();
      out.push('<br>');
    } else {
      closeLists();
      out.push(`<p>${line}</p>`);
    }
  }
  closeLists();
  let html = out.join('');
  html = html.replace(/(<br>)+$/, '').replace(/^(<br>)+/, '');
  html = html.replace(/ CODE(\d+) /g, (_, i) => {
    const { lang, code } = codeBlocks[Number(i)];
    return `<pre><code class="lang-${lang || 'txt'}">${escapeHtml(code)}</code></pre>`;
  });
  return html;
}

// --- Interface -------------------------------------------------
export function initChat({ openSettings, onClose }) {
  settingsOpener = openSettings;
  onCloseCallback = onClose;
  els.panel = document.getElementById('chat-panel');
  els.title = document.getElementById('chat-title');
  els.role = document.getElementById('chat-role');
  els.avatar = document.getElementById('chat-avatar');
  els.messages = document.getElementById('chat-messages');
  els.input = document.getElementById('chat-input');
  els.form = document.getElementById('chat-form');
  els.send = document.getElementById('chat-send');
  els.stop = document.getElementById('chat-stop');

  document.getElementById('chat-close').addEventListener('click', closeChat);
  document.getElementById('chat-reset').addEventListener('click', () => {
    const key = conversationKey();
    if (!key) return;
    delete conversations[key];
    persist();
    renderConversation();
  });

  els.form.addEventListener('submit', (e) => {
    e.preventDefault();
    dispatchMessage(els.input.value);
  });
  els.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      dispatchMessage(els.input.value);
    }
  });
  els.input.addEventListener('input', autoGrow);
  els.stop.addEventListener('click', () => abortController?.abort());
}

function conversationKey() {
  if (currentMeeting) return MEETING_KEY;
  if (currentAgent) return currentAgent.id;
  return null;
}

function autoGrow() {
  els.input.style.height = 'auto';
  els.input.style.height = Math.min(els.input.scrollHeight, 160) + 'px';
}

// Sur écran tactile, on ne force pas le focus : ça ouvrirait le
// clavier (qui masque la moitié de l'écran) avant que l'utilisateur
// ne le demande.
const touchScreen = window.matchMedia('(pointer: coarse)').matches;

function focusInput() {
  if (!touchScreen) els.input.focus();
}

function showPanel() {
  els.panel.classList.add('visible');
  document.body.classList.add('chat-open');
  renderConversation();
  setTimeout(focusInput, 350);
}

export function openChat(agent) {
  currentAgent = agent;
  currentMeeting = null;
  els.title.textContent = agent.nom;
  els.role.textContent = agent.role;
  els.avatar.textContent = agent.emoji;
  els.avatar.style.background = agent.accent + '33';
  els.avatar.style.borderColor = agent.accent;
  els.panel.style.setProperty('--accent', agent.accent);
  showPanel();
}

export function openMeeting(members) {
  currentMeeting = members.slice();
  currentAgent = null;
  els.title.textContent = 'Réunion d\'équipe';
  els.role.textContent = members.map((m) => m.nom).join(' · ');
  els.avatar.textContent = '🤝';
  els.avatar.style.background = 'rgba(139, 92, 246, 0.2)';
  els.avatar.style.borderColor = '#8b5cf6';
  els.panel.style.setProperty('--accent', '#8b5cf6');
  showPanel();
}

export function closeChat() {
  abortController?.abort();
  els.panel.classList.remove('visible');
  document.body.classList.remove('chat-open');
  currentAgent = null;
  currentMeeting = null;
  onCloseCallback?.();
}

export function isChatOpen() {
  return Boolean(currentAgent || currentMeeting);
}

function history(key) {
  return conversations[key] || (conversations[key] = []);
}

function renderConversation() {
  els.messages.innerHTML = '';
  const key = conversationKey();
  if (!key) return;
  const msgs = history(key);
  if (msgs.length === 0) {
    const wel = document.createElement('div');
    wel.className = 'chat-welcome';
    if (currentMeeting) {
      wel.innerHTML = `
        <div class="welcome-emoji">🤝</div>
        <h3>Réunion d'équipe</h3>
        <p class="participants">${currentMeeting.map((m) =>
          `<span class="participant" style="--accent:${m.accent}">${m.emoji} ${m.nom}</span>`).join(' ')}</p>
        <p>Posez votre question : chacun donnera son avis selon ses compétences${currentMeeting.some((m) => m.id === 'nova') ? ', puis Nova fera la synthèse' : ''}.</p>
        <div class="suggestions"></div>`;
      const sug = wel.querySelector('.suggestions');
      for (const s of [
        'Faisons le point : quelles priorités pour le mois prochain ?',
        'Brainstorming : comment attirer plus de clients ?',
        'Chacun me donne UNE amélioration à faire cette semaine',
      ]) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'suggestion';
        btn.textContent = s;
        btn.addEventListener('click', () => dispatchMessage(s));
        sug.appendChild(btn);
      }
    } else {
      wel.innerHTML = `
        <div class="welcome-emoji">${currentAgent.emoji}</div>
        <h3>Bonjour, je suis ${currentAgent.nom} !</h3>
        <p>${currentAgent.tagline}.</p>
        <div class="suggestions"></div>`;
      const sug = wel.querySelector('.suggestions');
      for (const s of currentAgent.suggestions || []) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'suggestion';
        btn.textContent = s;
        btn.addEventListener('click', () => dispatchMessage(s));
        sug.appendChild(btn);
      }
    }
    els.messages.appendChild(wel);
  } else {
    for (const m of msgs) {
      if (m.role === 'user') appendBubble('user', m.content);
      else if (m.agentId) appendAgentBubble(getAgent(m.agentId), m.content);
      else appendBubble('assistant', m.content);
    }
  }
  scrollBottom();
}

function appendBubble(role, content) {
  const div = document.createElement('div');
  div.className = `bubble ${role === 'user' ? 'user' : 'assistant'}`;
  div.innerHTML = role === 'user'
    ? `<p>${escapeHtml(content).replace(/\n/g, '<br>')}</p>`
    : renderMarkdown(content);
  els.messages.appendChild(div);
  return div;
}

// Bulle d'un participant de réunion (bandeau nom + rôle coloré).
// content === null → indicateur « en train d'écrire »
function appendAgentBubble(agent, content) {
  const div = document.createElement('div');
  div.className = 'bubble assistant group';
  const accent = agent?.accent || '#8b5cf6';
  div.style.setProperty('--who', accent);
  const nom = agent ? `${agent.emoji} ${agent.nom}` : '🤖';
  const role = agent ? agent.role : '';
  div.innerHTML = `<div class="who"><strong>${nom}</strong><span>${role}</span></div><div class="body"></div>`;
  const body = div.querySelector('.body');
  if (content === null) {
    div.classList.add('thinking');
    body.innerHTML = '<span class="dots"><span></span><span></span><span></span></span>';
  } else {
    body.innerHTML = renderMarkdown(content);
  }
  els.messages.appendChild(div);
  return div;
}

function appendNotice(html) {
  const div = document.createElement('div');
  div.className = 'chat-notice';
  div.innerHTML = html;
  els.messages.appendChild(div);
  scrollBottom();
  return div;
}

function noticeSettingsLink(prefix) {
  const n = appendNotice(`${prefix} <button type="button" class="link">Ouvrir les réglages</button>`);
  n.querySelector('.link').addEventListener('click', () => settingsOpener?.());
}

function scrollBottom() {
  els.messages.scrollTop = els.messages.scrollHeight;
}

function setBusy(busy) {
  els.send.hidden = busy;
  els.stop.hidden = !busy;
  els.input.disabled = busy;
}

// --- Appel API (streaming SSE, ou JSON simple) ------------------
// Écrit la réponse au fil de l'eau dans la bulle et renvoie le texte
// complet. En cas d'interruption (stop), renvoie le texte partiel.
async function requestCompletion(settings, messages, bubble) {
  const target = bubble.querySelector('.body') || bubble;
  const headers = { 'Content-Type': 'application/json' };
  if (settings.apiKey) headers.Authorization = `Bearer ${settings.apiKey}`;
  let full = '';
  const write = () => {
    bubble.classList.remove('thinking');
    target.innerHTML = renderMarkdown(full);
    scrollBottom();
  };
  try {
    const res = await fetch(`${settings.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: settings.model,
        stream: true,
        temperature: settings.temperature,
        messages,
      }),
      signal: abortController.signal,
    });
    if (!res.ok) {
      let detail = '';
      try { detail = (await res.text()).slice(0, 300); } catch (_) {}
      throw new Error(`HTTP ${res.status} — ${detail || res.statusText}`);
    }
    const ctype = res.headers.get('content-type') || '';
    if (ctype.includes('text/event-stream') && res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          const data = line.replace(/^data:\s?/, '').trim();
          if (!line.startsWith('data:') || !data || data === '[DONE]') continue;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content
              ?? json.choices?.[0]?.message?.content ?? '';
            if (delta) { full += delta; write(); }
          } catch (_) { /* fragment incomplet */ }
        }
      }
    } else {
      const json = await res.json();
      full = json.choices?.[0]?.message?.content || '';
      write();
    }
  } catch (err) {
    if (err.name === 'AbortError') return full; // texte partiel
    throw err;
  }
  return full;
}

// --- Envoi -------------------------------------------------------
function dispatchMessage(text) {
  text = (text || '').trim();
  if (!text) return;
  if (currentMeeting) runMeetingRound(text);
  else if (currentAgent) sendSoloMessage(text);
}

function prepareUserTurn(key, text) {
  const settings = loadSettings();
  if (!isConfigured(settings)) {
    noticeSettingsLink(`⚙️ L'API n'est pas encore configurée.`);
    return null;
  }
  els.messages.querySelector('.chat-welcome')?.remove();
  history(key).push({ role: 'user', content: text });
  appendBubble('user', text);
  els.input.value = '';
  autoGrow();
  persist();
  scrollBottom();
  return settings;
}

async function sendSoloMessage(text) {
  const agent = currentAgent;
  const settings = prepareUserTurn(agent.id, text);
  if (!settings) return;

  const msgs = history(agent.id);
  const bubble = appendAgentBubbleLike(agent);
  setBusy(true);
  abortController = new AbortController();

  try {
    const full = await requestCompletion(settings, [
      { role: 'system', content: agent.systemPrompt },
      ...msgs.slice(-MAX_TURNS).map(({ role, content }) => ({ role, content })),
    ], bubble);
    const aborted = abortController.signal.aborted;
    if (!full.trim()) {
      bubble.remove();
      appendNotice(aborted
        ? '⏹️ Génération interrompue.'
        : '🤔 Le serveur a répondu sans contenu. Vérifiez le nom du modèle dans les réglages.');
    } else {
      msgs.push({ role: 'assistant', content: full });
      if (msgs.length > MAX_TURNS) msgs.splice(0, msgs.length - MAX_TURNS);
      persist();
      if (aborted) appendNotice('⏹️ Génération interrompue.');
    }
  } catch (err) {
    bubble.remove();
    noticeSettingsLink(`❌ Erreur de connexion à l'API : <code>${escapeHtml(String(err.message))}</code><br>Vérifiez l'URL, la clé et le modèle.`);
  } finally {
    setBusy(false);
    abortController = null;
    scrollBottom();
    if (isChatOpen()) focusInput();
  }
}

// Bulle "simple" pour le mode solo (sans bandeau de nom)
function appendAgentBubbleLike() {
  const div = document.createElement('div');
  div.className = 'bubble assistant thinking';
  div.innerHTML = '<span class="dots"><span></span><span></span><span></span></span>';
  els.messages.appendChild(div);
  scrollBottom();
  return div;
}

// --- Réunion : chaque agent répond à tour de rôle ----------------
function meetingSystemPrompt(agent, members) {
  const others = members.filter((m) => m.id !== agent.id)
    .map((m) => `${m.nom} (${m.role})`).join(', ');
  let extra = `

CONTEXTE DE RÉUNION :
Tu participes à une réunion d'équipe avec ${others || 'toi seul'}.
- Donne TON avis selon tes compétences de ${agent.role}, en 150 mots maximum.
- Sois concret et complémentaire : ne répète pas ce que les collègues ont déjà dit avant toi.
- Si le sujet ne relève pas de ton domaine, dis-le en une phrase et cède la parole.`;
  if (agent.id === 'nova') {
    extra += `
- Tu interviens en DERNIER : fais une synthèse courte des avis exprimés, tranche, et termine par les prochaines étapes concrètes.`;
  }
  return agent.systemPrompt + extra;
}

function meetingMessagesFor(agent, key) {
  const mapped = [];
  for (const m of history(key).slice(-MAX_TURNS)) {
    if (m.role === 'user' && !m.agentId) {
      mapped.push({ role: 'user', content: m.content });
    } else if (m.agentId === agent.id) {
      mapped.push({ role: 'assistant', content: m.content });
    } else if (m.agentId) {
      const a = getAgent(m.agentId);
      mapped.push({
        role: 'user',
        content: `💬 Intervention de ${a ? `${a.nom} (${a.role})` : 'un collègue'} :\n${m.content}`,
      });
    }
  }
  return mapped;
}

async function runMeetingRound(text) {
  const members = currentMeeting;
  const settings = prepareUserTurn(MEETING_KEY, text);
  if (!settings) return;

  // Nova (la directrice) parle toujours en dernier pour synthétiser
  const ordered = [
    ...members.filter((m) => m.id !== 'nova'),
    ...members.filter((m) => m.id === 'nova'),
  ];

  setBusy(true);
  let interrupted = false;

  for (const agent of ordered) {
    if (interrupted || !currentMeeting) break; // stop ou panneau fermé
    const bubble = appendAgentBubble(agent, null);
    scrollBottom();
    abortController = new AbortController();
    try {
      const full = await requestCompletion(settings, [
        { role: 'system', content: meetingSystemPrompt(agent, members) },
        ...meetingMessagesFor(agent, MEETING_KEY),
      ], bubble);
      const aborted = abortController.signal.aborted;
      if (full.trim()) {
        history(MEETING_KEY).push({ role: 'assistant', agentId: agent.id, content: full });
        persist();
      } else {
        bubble.remove();
      }
      if (aborted) {
        appendNotice('⏹️ Réunion interrompue.');
        interrupted = true;
      }
    } catch (err) {
      bubble.remove();
      appendNotice(`❌ ${agent.nom} n'a pas pu répondre : <code>${escapeHtml(String(err.message))}</code>`);
    }
  }

  const msgs = history(MEETING_KEY);
  if (msgs.length > MAX_TURNS) msgs.splice(0, msgs.length - MAX_TURNS);
  persist();
  setBusy(false);
  abortController = null;
  scrollBottom();
  if (isChatOpen()) focusInput();
}
