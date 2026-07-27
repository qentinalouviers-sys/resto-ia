# 🏢 Resto IA — Le Bureau

**Votre restaurant + votre startup d'agents IA, dans une salle 3D.**

Une web UI 100 % en français inspirée de l'esprit [Hermes Agent](https://hermes-agent.nousresearch.com).
La page d'accueil est une salle 3D en deux zones : devant, **le restaurant** — sol en
damier, tables de bistrot, cuisine ouverte et **four à pizza napolitain en dôme, couvert
de petite faïence or à joints noirs** — et derrière une cloison végétalisée, **l'open
space** où travaille le reste de l'équipe. Chaque membre est un personnage humain stylisé.
**Cliquez sur un collaborateur pour ouvrir le chat avec le bon profil.**

## 👥 L'équipe

| Agent | Rôle | Spécialités |
|---|---|---|
| 👑 **Anibal** | Le Boss | Il gère tout le monde : stratégie, décisions, coordination (orchestrateur) |
| 🍕 **Yohan** | Pizzaïolo | Pâte napolitaine, carte, coûts matière, HACCP — en cuisine devant le four |
| 🧮 **Justine** | Comptable | Compta, TVA, trésorerie, prévisionnels |
| ⚖️ **Eva** | Juriste | Contrats, RGPD, conformité, réglementation restauration |
| 📣 **Théo** | Marketing | Marque, réseaux sociaux, campagnes, growth |
| 📈 **Hugo** | Commercial | Prospection, argumentaires, négociation |
| 🛠️ **Sébastien** | Travaux & Rénovation | Chantiers, agencement, devis, normes ERP — casque sur la tête |
| 🐾 **Joy** | Mascotte | Labrador noir de l'équipe — décorative, elle remue la queue près d'Anibal |

Anibal joue le rôle de « chef d'orchestre » : posez-lui une question transverse et il
synthétise le point de vue de chaque spécialiste (esprit « sous-agents » de Hermes).
En réunion, il parle toujours en dernier pour trancher.

## 🚀 Lancement

Aucune installation, aucun build : c'est un site statique (Three.js est embarqué dans `vendor/`).

```bash
# Depuis le dossier du projet :
python3 -m http.server 8080
# puis ouvrez http://localhost:8080
```

> ⚠️ Ouvrir `index.html` directement en `file://` ne fonctionne pas (modules ES).
> Il faut un petit serveur local, ou un hébergement statique.

### Déployer sur GitHub Pages

Dépôt → **Settings → Pages → Source : Deploy from a branch** → choisissez la branche → dossier `/ (root)`.
Votre bureau 3D est en ligne quelques secondes plus tard.

## 🔌 Connexion à l'IA

Cliquez sur **⚙️ Réglages** dans l'interface. L'application parle à n'importe quelle API
compatible OpenAI (`POST /chat/completions`) :

| Fournisseur | URL de base | Remarques |
|---|---|---|
| **Mon Hermes Agent (VPS)** | `http://<ip-du-vps>:8642/v1` | Voir la section suivante 👇 |
| **Hermes — Nous Research** | `https://inference-api.nousresearch.com/v1` | Clé API sur [portal.nousresearch.com](https://portal.nousresearch.com) — modèles `Hermes-4-405B`, `Hermes-4-70B`… |
| **Open WebUI** (local) | `http://localhost:3000/api` | Clé : Paramètres → Compte → Clés API |
| **Ollama** (local) | `http://localhost:11434/v1` | `ollama pull hermes3` — aucune clé requise |
| **OpenAI** | `https://api.openai.com/v1` | `gpt-4o-mini`, `gpt-4o`… |

## 🖥️ Brancher votre propre Hermes Agent (VPS)

### ⚡ Installation automatique (recommandée)

Sur votre VPS, une seule commande fait tout (interface + nginx + activation de
l'API Hermes + génération de la clé) :

```bash
curl -fsSL https://raw.githubusercontent.com/qentinalouviers-sys/resto-ia/claude/hermes-agent-custom-ui-fagn0y/install-vps.sh | bash
```

> Le dépôt doit être accessible depuis le VPS (public, ou clonez-le d'abord à la main
> puis lancez `bash install-vps.sh` depuis le dossier). Le script est réexécutable sans
> danger : il met simplement à jour ce qui existe.

À la fin, il affiche l'adresse à ouvrir et la clé API à coller dans ⚙️ Réglages.

### Installation manuelle (si vous préférez comprendre chaque étape)

[Hermes Agent](https://hermes-agent.nousresearch.com) expose une API compatible OpenAI
(port `8642` par défaut, endpoint `/v1`). Dans `~/.hermes/.env` sur votre serveur :

```bash
API_SERVER_ENABLED=true
API_SERVER_KEY=une-clé-longue-et-secrète      # OBLIGATOIRE (l'API donne accès aux outils de l'agent !)
# API_SERVER_PORT=8642                        # port par défaut
```

Puis lancez `hermes gateway`. Deux façons d'y connecter l'interface :

**Option A — recommandée : tout servir depuis le VPS via nginx (même origine, pas de CORS)**

L'API Hermes reste liée à `127.0.0.1` (sa valeur par défaut, la plus sûre) et nginx sert
l'interface tout en relayant `/v1` vers l'agent :

```nginx
server {
    listen 80;
    root /var/www/resto-ia;          # les fichiers de ce dépôt
    index index.html;

    location /v1/ {
        # CORS : le navigateur envoie un preflight OPTIONS avant chaque POST
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
        if ($request_method = 'OPTIONS') { return 204; }

        proxy_set_header Origin "";  # l'API Hermes rejette le header Origin

        proxy_pass http://127.0.0.1:8642/v1/;
        proxy_http_version 1.1;
        proxy_buffering off;         # nécessaire pour le streaming SSE
        proxy_read_timeout 300s;
    }
}
```

> ℹ️ Le script vérifie aussi le modèle par défaut du gateway (`~/.hermes/config.yaml`) :
> s'il détecte `kimi-k3` (clé invalide → erreur 401), il bascule automatiquement sur
> `deepseek-v4-pro`.

Dans ⚙️ Réglages, l'URL de base devient alors `http://<ip-du-vps>/v1`.

**Option B — exposer directement le port 8642**

Dans `~/.hermes/.env`, ajoutez :

```bash
API_SERVER_HOST=0.0.0.0
API_SERVER_CORS_ORIGINS=http://<origine-de-l-interface>   # requis pour les appels navigateur
```

…et ouvrez le port 8642 dans le pare-feu. ⚠️ À réserver aux tests : l'API donne un accès
complet aux outils de l'agent (y compris le terminal), protégée uniquement par la clé, et
en HTTP la clé circule en clair. Préférez l'option A (ou ajoutez du TLS).

> ℹ️ Le bouton « 🔌 Tester la connexion » des réglages interroge `/v1/models` et affiche
> les noms de modèles annoncés par votre agent — pratique pour remplir le champ « Modèle ».
> Hermes gère aussi des **profils** : chaque profil lance son propre serveur API sur un
> port distinct et s'annonce sous son nom de profil comme modèle.

Les réglages et les conversations restent **dans votre navigateur** (localStorage) —
rien n'est envoyé ailleurs que vers l'API que vous configurez.

> 💡 Serveur local + page hébergée en HTTPS : pensez au CORS (Open WebUI et Ollama
> ont des options pour l'autoriser, ex. `OLLAMA_ORIGINS=*`).

## 🎨 Personnalisation

Tout se passe dans **`js/agents.js`** : ajoutez, retirez ou modifiez un agent
(nom, rôle, prompt système, suggestions, couleur, coiffure, tenue, accessoires,
position du bureau dans la pièce). Le personnage 3D et sa fiche de chat sont
générés automatiquement à partir de cette configuration.

```js
{
  id: 'ines',
  nom: 'Inès',
  role: 'Cheffe de projet',
  accent: '#60a5fa',
  emoji: '📋',
  pose: 'sit',
  desk: { x: 5.6, z: 2.2, ry: Math.PI / 2 },   // position + orientation
  screen: 'kanban',                             // code | graphique | tableur | kanban | document
  avatar: {
    skin: 0xe8b48a, hairColor: 0x2a2320, hairStyle: 'ponytail', // short|long|bun|afro|ponytail|messy|buzz
    top: 0x2563eb, bottom: 0x1f2430, shoes: 0x11131a,
    accessories: { glasses: true },             // glasses, headphones, tie, collar, badge, tablet
  },
  suggestions: ['…', '…', '…'],
  systemPrompt: `Tu es Inès… (toujours en français)`,
}
```

Le décor se modifie dans `js/office.js`, les personnages dans `js/characters.js`.

## 🗂️ Structure

```
├── index.html          # Page unique (scène 3D + chat + réglages)
├── css/style.css       # Thème sombre « startup »
├── js/
│   ├── agents.js       # ⭐ Configuration de votre équipe
│   ├── characters.js   # Personnages 3D procéduraux
│   ├── office.js       # L'open space (mobilier, lumières, néon…)
│   ├── chat.js         # Chat + streaming SSE compatible OpenAI
│   ├── settings.js     # Réglages API (localStorage)
│   └── main.js         # Caméra, interactions, boucle de rendu
└── vendor/             # Three.js embarqué (aucun CDN au runtime)
```

## ✨ Fonctionnalités

- 🍕 Restaurant 3D : four napolitain en dôme (petite faïence or, joints noirs, braises),
  cuisine ouverte, néon PIZZERIA, tables de bistrot, ardoise menu, sol en damier
- 🏢 Open space derrière la cloison végétalisée : bureaux, écrans animés par métier,
  néon, baies vitrées avec ville nocturne, borne d'arcade, machine à café, plantes…
- 🖱️ Survolez un personnage → il s'illumine ; cliquez → la caméra zoome et le chat s'ouvre
- 🤝 **Mode Réunion** : bouton « Réunion », sélectionnez plusieurs collaborateurs (anneau
  lumineux à leurs pieds), puis lancez la discussion groupée — chaque agent donne son avis
  à tour de rôle selon ses compétences, sans répéter les autres, et si Anibal participe il
  conclut par une synthèse et les prochaines étapes
- 💬 Streaming des réponses en direct, rendu Markdown (code, listes, titres)
- 🗂️ Une conversation mémorisée par agent (localStorage), bouton « nouvelle conversation »
- 📱 Responsive : barre d'équipe en bas de l'écran pour accès rapide (et secours sans WebGL)
- 🇫🇷 Interface et prompts 100 % français
