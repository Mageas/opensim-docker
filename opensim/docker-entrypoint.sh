#!/bin/sh
# Prépare la config OpenSim au démarrage du conteneur, puis lance la commande (CMD).
set -eu

cd /opt/opensim/bin

# --- 0. Valeurs par défaut (OpenSim lit ces variables via config/overrides.ini) ---
export OPENSIM_PUBLIC_HOST="${OPENSIM_PUBLIC_HOST:-127.0.0.1}"
export OPENSIM_PORT="${OPENSIM_PORT:-9000}"
export OPENSIM_GRID_NAME="${OPENSIM_GRID_NAME:-Mon OpenSim}"
export OPENSIM_GRID_NICK="${OPENSIM_GRID_NICK:-monopensim}"
export OPENSIM_WELCOME="${OPENSIM_WELCOME:-Bienvenue !}"
export OPENSIM_PHYSICS="${OPENSIM_PHYSICS:-BulletSim}"
export OPENSIM_ESTATE_NAME="${OPENSIM_ESTATE_NAME:-Mon Estate}"
export OPENSIM_OWNER_FIRSTNAME="${OPENSIM_OWNER_FIRSTNAME:-Admin}"
export OPENSIM_OWNER_LASTNAME="${OPENSIM_OWNER_LASTNAME:-Opensim}"
export OPENSIM_OWNER_EMAIL="${OPENSIM_OWNER_EMAIL:-admin@example.com}"
export MYSQL_HOST="${MYSQL_HOST:-db}" MYSQL_DATABASE="${MYSQL_DATABASE:-opensim}" MYSQL_USER="${MYSQL_USER:-opensim}"
if [ -z "${OPENSIM_OWNER_PASSWORD:-}" ] || [ -z "${MYSQL_PASSWORD:-}" ]; then
    echo "[entrypoint] ERREUR : OPENSIM_OWNER_PASSWORD et MYSQL_PASSWORD sont obligatoires" >&2
    exit 1
fi
echo "[entrypoint] OpenSim ${OPENSIM_VERSION:-?} ($(cat OPENSIM_COMMIT 2>/dev/null | cut -c1-7)) sur .NET ${DOTNET_RUNTIME:-?}, port ${OPENSIM_PORT}"

# --- 1. Architecture : standalone simple ou standalone + Hypergrid ---------------
if [ "${OPENSIM_HYPERGRID:-false}" = "true" ]; then
    ARCH="StandaloneHypergrid.ini"
    # Le Gatekeeper est la "porte d'entrée" Hypergrid de ce monde
    cat > config/hypergrid.ini <<'EOF'
[Hypergrid]
    HomeURI = "${Const|BaseURL}:${Const|PublicPort}"
    GatekeeperURI = "${Const|BaseURL}:${Const|PublicPort}"
EOF
else
    ARCH="Standalone.ini"
    rm -f config/hypergrid.ini
fi
sed -i "s|^\s*Include-Architecture\s*=.*|    Include-Architecture = \"config-include/${ARCH}\"|" OpenSim.ini
echo "[entrypoint] Architecture : ${ARCH}"

# --- 2. Région : générée une seule fois (le dossier Regions est un volume) -------
# Le RegionUUID doit rester stable : c'est lui qui relie la région à ses objets en base.
if ! ls Regions/*.ini >/dev/null 2>&1; then
    REGION_NAME="${OPENSIM_REGION_NAME:-Ma Region}"
    REGION_UUID="$(uuidgen)"
    cat > Regions/Regions.ini <<EOF
; Fichier généré au premier démarrage. Vous pouvez l'éditer (docker compose restart opensim ensuite).
; Une section [Nom] = une région. Chaque région a besoin de son propre InternalPort (UDP).
[${REGION_NAME}]
RegionUUID = ${REGION_UUID}
Location = ${OPENSIM_REGION_LOCATION:-1000,1000}
InternalAddress = 0.0.0.0
InternalPort = ${OPENSIM_PORT}
AllowAlternatePorts = False
; Adresse que les viewers utilisent pour joindre la région en UDP : IP publique / DNS du serveur
ExternalHostName = ${OPENSIM_PUBLIC_HOST:-127.0.0.1}
; Taille de la région (multiple de 256). 256 = classique, 512/1024 = var-region
SizeX = ${OPENSIM_REGION_SIZE:-256}
SizeY = ${OPENSIM_REGION_SIZE:-256}
SizeZ = 4096
; MaxPrims = 15000
; MaxAgents = 100
EOF
    echo "[entrypoint] Région créée : ${REGION_NAME} (${REGION_UUID})"
else
    echo "[entrypoint] Régions existantes conservées : $(ls Regions/*.ini | tr '\n' ' ')"
fi

# OPENSIM_PUBLIC_HOST fait foi : on le réapplique à toutes les régions à chaque démarrage
if [ -n "${OPENSIM_PUBLIC_HOST:-}" ]; then
    sed -i "s|^\s*ExternalHostName\s*=.*|ExternalHostName = ${OPENSIM_PUBLIC_HOST}|" Regions/*.ini
fi

exec "$@"
