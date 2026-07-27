# 🏢 Resto IA — Le Bureau

**Votre startup d'agents IA, dans un open space 3D.**

Une web UI 100 % en français inspirée de l'esprit [Hermes Agent](https://hermes-agent.nousresearch.com) :
la page d'accueil est un bureau moderne « geek » en 3D dans lequel chaque membre de
votre équipe virtuelle est un personnage humain stylisé, assis à son poste de travail.
**Cliquez sur un collaborateur pour ouvrir le chat avec le bon profil.**

## 👥 L'équipe

| Agent | Rôle | Spécialités |
|---|---|---|
| 👩‍💼 **Nova** | Directrice Générale | Stratégie, priorisation, coordination de l'équipe (orchestratrice) |
| 🧮 **Marc** | Comptable | Compta, TVA, trésorerie, prévisionnels |
| ⚖️ **Camille** | Avocate | Contrats, propriété intellectuelle, contentieux |
| 📚 **Sofia** | Juriste | RGPD, conformité, mentions légales, réglementation restauration |
| 💻 **Théo** | Développeur Web | Sites, apps, APIs, automatisations |
| 📣 **Léa** | Marketing | Marque, réseaux sociaux, campagnes, growth |
| 🤝 **Yasmine** | Ressources Humaines | Recrutement, contrats de travail, convention HCR |
| 📈 **Hugo** | Commercial | Prospection, argumentaires, négociation |

Nova joue le rôle de « cheffe d'orchestre » : posez-lui une question transverse et elle
synthétise le point de vue de chaque spécialiste (esprit « sous-agents » de Hermes).

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
| **Hermes — Nous Research** | `https://inference-api.nousresearch.com/v1` | Clé API sur [portal.nousresearch.com](https://portal.nousresearch.com) — modèles `Hermes-4-405B`, `Hermes-4-70B`… |
| **Open WebUI** (local) | `http://localhost:3000/api` | Clé : Paramètres → Compte → Clés API |
| **Ollama** (local) | `http://localhost:11434/v1` | `ollama pull hermes3` — aucune clé requise |
| **OpenAI** | `https://api.openai.com/v1` | `gpt-4o-mini`, `gpt-4o`… |

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

- 🏢 Open space 3D : bureaux, écrans animés par métier, néon, baies vitrées avec
  ville nocturne, canapé, borne d'arcade, machine à café, plantes…
- 🖱️ Survolez un personnage → il s'illumine ; cliquez → la caméra zoome et le chat s'ouvre
- 💬 Streaming des réponses en direct, rendu Markdown (code, listes, titres)
- 🗂️ Une conversation mémorisée par agent (localStorage), bouton « nouvelle conversation »
- 📱 Responsive : barre d'équipe en bas de l'écran pour accès rapide (et secours sans WebGL)
- 🇫🇷 Interface et prompts 100 % français
