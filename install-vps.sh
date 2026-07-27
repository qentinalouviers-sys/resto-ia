#!/usr/bin/env bash
# ============================================================
#  Installation automatique de « Resto IA — Le Bureau » sur un VPS
#
#  Ce script fait tout à votre place :
#   1. Installe git + nginx (si absents)
#   2. Télécharge l'interface dans /var/www/resto-ia
#   3. Configure nginx : sert l'interface sur le port 80 et
#      relaie /v1 vers le serveur API d'Hermes Agent (127.0.0.1:8642)
#   4. Active le serveur API dans ~/.hermes/.env
#      (génère une clé API_SERVER_KEY si besoin)
#   5. Corrige le modèle par défaut du gateway si c'est kimi-k3
#      (clé invalide → 401) vers deepseek-v4-pro
#
#  Usage (en root, ou avec sudo) :
#    bash install-vps.sh
#  Relancez-le autant de fois que vous voulez : il est sans danger
#  et se contente de mettre à jour ce qui existe déjà.
# ============================================================
set -euo pipefail

REPO_URL="https://github.com/qentinalouviers-sys/resto-ia.git"
BRANCH="claude/hermes-agent-custom-ui-fagn0y"
WEB_DIR="/var/www/resto-ia"

bleu()  { printf '\n\033[1;34m%s\033[0m\n' "$*"; }
ok()    { printf '\033[1;32m  ✔ %s\033[0m\n' "$*"; }
warn()  { printf '\033[1;33m  ⚠ %s\033[0m\n' "$*"; }

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  if command -v sudo >/dev/null 2>&1; then SUDO="sudo";
  else echo "Merci de lancer ce script en root : su - puis bash install-vps.sh"; exit 1; fi
fi

# ------------------------------------------------------------
bleu "── Étape 1/5 · Outils nécessaires (git, nginx, openssl)"
if command -v apt-get >/dev/null 2>&1; then
  $SUDO apt-get update -qq || true
  $SUDO DEBIAN_FRONTEND=noninteractive apt-get install -y -qq git nginx openssl curl >/dev/null
elif command -v dnf >/dev/null 2>&1; then
  $SUDO dnf install -y -q git nginx openssl curl >/dev/null
elif command -v yum >/dev/null 2>&1; then
  $SUDO yum install -y -q git nginx openssl curl >/dev/null
else
  warn "Gestionnaire de paquets inconnu — je suppose que git et nginx sont déjà installés."
fi
ok "Outils prêts"

# ------------------------------------------------------------
bleu "── Étape 2/5 · Téléchargement de l'interface"
if [ -d "$WEB_DIR/.git" ]; then
  $SUDO git -C "$WEB_DIR" fetch origin "$BRANCH" --depth 1
  $SUDO git -C "$WEB_DIR" checkout "$BRANCH" >/dev/null 2>&1 || true
  $SUDO git -C "$WEB_DIR" reset --hard "origin/$BRANCH" >/dev/null
  ok "Interface mise à jour dans $WEB_DIR"
else
  $SUDO rm -rf "$WEB_DIR"
  $SUDO git clone --depth 1 -b "$BRANCH" "$REPO_URL" "$WEB_DIR"
  ok "Interface installée dans $WEB_DIR"
fi

# ------------------------------------------------------------
bleu "── Étape 3/5 · Configuration de nginx"
NGINX_CONF=$(cat <<'NGINX'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    root /var/www/resto-ia;
    index index.html;

    location /v1/ {
        # CORS : le navigateur envoie un preflight OPTIONS avant chaque POST
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;

        # Preflight → 204 sans passer par l'API Hermes
        if ($request_method = 'OPTIONS') {
            return 204;
        }

        # L'API Hermes rejette le header Origin : on le retire avant de relayer
        proxy_set_header Origin "";

        proxy_pass http://127.0.0.1:8642/v1/;
        proxy_http_version 1.1;
        proxy_buffering off;          # indispensable pour le streaming des réponses
        proxy_read_timeout 300s;
        proxy_set_header Host $host;
    }
}
NGINX
)
if [ -d /etc/nginx/sites-available ]; then
  printf '%s\n' "$NGINX_CONF" | $SUDO tee /etc/nginx/sites-available/resto-ia >/dev/null
  $SUDO rm -f /etc/nginx/sites-enabled/default
  $SUDO ln -sf /etc/nginx/sites-available/resto-ia /etc/nginx/sites-enabled/resto-ia
else
  printf '%s\n' "$NGINX_CONF" | $SUDO tee /etc/nginx/conf.d/resto-ia.conf >/dev/null
fi
if $SUDO nginx -t >/dev/null 2>&1; then
  $SUDO systemctl enable nginx >/dev/null 2>&1 || true
  $SUDO systemctl reload nginx 2>/dev/null || $SUDO systemctl restart nginx
  ok "nginx sert l'interface (port 80) et relaie /v1 vers Hermes"
else
  warn "La configuration nginx ne passe pas le test (un autre site occupe peut-être déjà le port 80)."
  warn "Détail : $($SUDO nginx -t 2>&1 | tail -1)"
fi

# ------------------------------------------------------------
bleu "── Étape 4/5 · Activation du serveur API d'Hermes Agent"
HERMES_ENV=""
for h in "$HOME" /root /home/*; do
  if [ -f "$h/.hermes/.env" ]; then HERMES_ENV="$h/.hermes/.env"; break; fi
done

API_KEY=""
if [ -n "$HERMES_ENV" ]; then
  $SUDO cp "$HERMES_ENV" "$HERMES_ENV.bak.$(date +%s)"
  if grep -q '^API_SERVER_ENABLED=' "$HERMES_ENV"; then
    $SUDO sed -i 's/^API_SERVER_ENABLED=.*/API_SERVER_ENABLED=true/' "$HERMES_ENV"
  else
    echo 'API_SERVER_ENABLED=true' | $SUDO tee -a "$HERMES_ENV" >/dev/null
  fi
  if grep -q '^API_SERVER_KEY=..*' "$HERMES_ENV"; then
    API_KEY=$(grep '^API_SERVER_KEY=' "$HERMES_ENV" | head -1 | cut -d= -f2-)
    ok "Serveur API activé dans $HERMES_ENV (clé existante conservée)"
  else
    API_KEY=$(openssl rand -hex 24)
    $SUDO sed -i '/^API_SERVER_KEY=/d' "$HERMES_ENV"
    echo "API_SERVER_KEY=$API_KEY" | $SUDO tee -a "$HERMES_ENV" >/dev/null
    ok "Serveur API activé dans $HERMES_ENV (nouvelle clé générée)"
  fi
else
  warn "Fichier ~/.hermes/.env introuvable sur cette machine."
  warn "Ajoutez-y vous-même :  API_SERVER_ENABLED=true  et  API_SERVER_KEY=<une-clé-secrète>"
fi

# ------------------------------------------------------------
bleu "── Étape 5/5 · Modèle par défaut du gateway Hermes"
# Correctif du 27/07/2026 : le modèle kimi-k3 (provider kimi-coding)
# a une clé invalide → 401 sur tous les appels. On bascule sur DeepSeek.
HERMES_CFG=""
for h in "$HOME" /root /home/*; do
  if [ -f "$h/.hermes/config.yaml" ]; then HERMES_CFG="$h/.hermes/config.yaml"; break; fi
done
if [ -n "$HERMES_CFG" ] && grep -q 'kimi-k3' "$HERMES_CFG"; then
  $SUDO cp "$HERMES_CFG" "$HERMES_CFG.bak.$(date +%s)"
  if command -v hermes >/dev/null 2>&1 \
    && hermes config set model.default deepseek-v4-pro >/dev/null 2>&1 \
    && hermes config set model.provider deepseek >/dev/null 2>&1; then
    ok "Modèle corrigé via hermes config : deepseek-v4-pro (kimi-k3 → clé invalide)"
  else
    $SUDO sed -i 's/^\(\s*default:\s*\)kimi-k3\s*$/\1deepseek-v4-pro/; s/^\(\s*provider:\s*\)kimi-coding\s*$/\1deepseek/' "$HERMES_CFG"
    ok "Modèle corrigé dans $HERMES_CFG : deepseek-v4-pro (kimi-k3 → clé invalide)"
  fi
  warn "Pensez à redémarrer le gateway Hermes pour appliquer le changement."
elif [ -n "$HERMES_CFG" ]; then
  ok "Modèle par défaut OK (pas de kimi-k3 dans config.yaml)"
else
  warn "~/.hermes/config.yaml introuvable — vérification du modèle ignorée."
fi

# ------------------------------------------------------------
IP=$(hostname -I 2>/dev/null | awk '{print $1}')
[ -z "$IP" ] && IP="<ip-de-votre-vps>"

printf '\n\033[1;35m════════════════════════════════════════════════════════════\033[0m\n'
printf '\033[1;35m  🎉 Installation terminée !\033[0m\n'
printf '\033[1;35m════════════════════════════════════════════════════════════\033[0m\n\n'
printf '  1. Redémarrez votre Hermes pour qu'"'"'il ouvre son serveur API :\n'
printf '     arrêtez-le (Ctrl+C, ou son service/screen/tmux) puis relancez :  \033[1mhermes gateway\033[0m\n\n'
printf '  2. Ouvrez votre bureau 3D :  \033[1mhttp://%s\033[0m\n\n' "$IP"
if [ -n "$API_KEY" ]; then
  printf '  3. Dans ⚙️ Réglages, collez cette clé API puis « Enregistrer » :\n'
  printf '     \033[1;33m%s\033[0m\n\n' "$API_KEY"
else
  printf '  3. Dans ⚙️ Réglages, collez votre API_SERVER_KEY puis « Enregistrer ».\n\n'
fi
printf '  Astuce : le bouton « 🔌 Tester la connexion » vérifie tout et remplit\n'
printf '  le nom du modèle automatiquement. Bonne discussion avec votre équipe ! 🚀\n\n'
