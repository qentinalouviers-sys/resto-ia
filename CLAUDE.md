# Resto IA — Le Bureau · Contexte projet pour Claude Code

## Vue d'ensemble

Web UI 3D **100 % en français** : un restaurant + open space en 3D (Three.js embarqué
dans `vendor/`, aucun build, site statique) où chaque agent IA est un personnage
cliquable qui ouvre un chat avec son prompt système. Mode Réunion pour interroger
plusieurs agents à tour de rôle.

- **Branche de travail : `claude/hermes-agent-custom-ui-fagn0y`** (tout se pousse là)
- **Déploiement : VPS OVH `145.239.73.53`** via `install-vps.sh`
  (une seule commande, réexécutable : elle sert aussi de mise à jour)
- Backend : **Hermes Agent** (gateway sur `127.0.0.1:8642`, endpoint compatible
  OpenAI `/v1`), relayé par nginx sur le port 80. L'interface appelle `/v1` en
  même origine.

## Règles du projet

- Interface, commentaires de code, README, messages de commit : **en français**.
- Pas de dépendance CDN au runtime, pas d'étape de build : tout doit marcher en
  statique derrière nginx (ou `python3 -m http.server`).
- `js/agents.js` est le fichier de personnalisation central (profils + avatars 3D).
- Ne jamais committer de clés ou l'`API_SERVER_KEY`.
- Tester avec Playwright + le Chromium préinstallé (`/opt/pw-browsers/chromium`,
  flags swiftshader) avant de pousser ; tester aussi le viewport mobile
  (390×844, `isMobile`, `hasTouch`).

## Architecture des fichiers

| Fichier | Rôle |
|---|---|
| `js/agents.js` | ⭐ Config des 9 agents (prompts FR, avatars, positions) : Anibal (boss, `boss: true`), Yohan (pizzaïolo), Justine (comptable), Eva (juriste), Théo (marketing), Hugo (commercial), Sébastien (travaux, `zone: 'chantier'`), Marie & Romain (RDF Énergie — vraie entreprise photovoltaïque de la famille, Cissac-Médoc/Gironde, RGE QualiPV, coin bureau dédié) |
| `js/characters.js` | Personnages 3D procéduraux (coiffures, accessoires : toque, casque de chantier, tablier…) + `createDog()` : Joy, le labrador noir décoratif |
| `js/office.js` | Décor : restaurant (four napolitain doré, comptoir, tables) + open space + coin chantier |
| `js/chat.js` | Chat solo + mode Réunion (tour de table, l'agent `boss: true` synthétise en dernier), streaming SSE |
| `js/settings.js` | Réglages API (localStorage), préréglages, test de connexion |
| `js/main.js` | Caméra, interactions souris/tactile, sélection réunion, boucle de rendu |
| `install-vps.sh` | Installation/mise à jour complète sur le VPS (5 étapes) |

## Correctifs appliqués le 27/07/2026 (intégrés dans install-vps.sh)

1. **Modèle par défaut Hermes** : `kimi-k3` (provider `kimi-coding`) avait une clé
   invalide → 401 sur tous les appels. Corrigé vers `deepseek-v4-pro` (provider
   `deepseek`) dans `~/.hermes/config.yaml`. L'étape 5/5 du script détecte
   `kimi-k3` et corrige automatiquement (via `hermes config set`, sinon `sed`).
2. **CORS + Origin dans nginx** : le preflight `OPTIONS` renvoyait 403 car l'API
   Hermes rejette le header `Origin`. Le template nginx du script inclut
   désormais : headers CORS (`always`), `OPTIONS` → 204, et
   `proxy_set_header Origin ""` (strip) avant le `proxy_pass`.

### Flux qui doit fonctionner
```
Navigateur → OPTIONS /v1/chat/completions → nginx → 204 + headers CORS
Navigateur → POST /v1/chat/completions (+ Authorization) → nginx (strip Origin)
           → 127.0.0.1:8642 → Hermes → DeepSeek → réponse (SSE)
```

### Réglages attendus côté interface (localStorage `restoia.settings.v1`)
- `baseUrl` : `/v1` (même origine via nginx)
- `apiKey` : `API_SERVER_KEY` du `~/.hermes/.env`
- `model` : `deepseek-v4-pro` ou `hermes-agent` (le bouton « Tester la
  connexion » lit `/v1/models` et préremplit)

## À savoir

- L'ancien web UI de l'utilisateur (Open WebUI ?) occupait le port 80 avant
  Resto IA ; il tourne probablement encore sur un autre port (3000 ?). En
  attente du `ss -tlnp` de l'utilisateur pour faire cohabiter les deux
  proprement dans nginx.
- L'utilisateur n'est pas technique : lui donner des commandes prêtes à coller
  et des explications simples, en français.
