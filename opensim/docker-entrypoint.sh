#!/bin/sh
set -eu

cd /opt/opensim/bin

log() {
    echo "[entrypoint] $*"
}


# OpenSim reads these through ${Environment|...} in config/overrides.ini.

export OPENSIM_PUBLIC_HOST="${OPENSIM_PUBLIC_HOST:-127.0.0.1}"
export OPENSIM_PORT="${OPENSIM_PORT:-9000}"
export OPENSIM_GRID_NAME="${OPENSIM_GRID_NAME:-My OpenSim}"
export OPENSIM_GRID_NICK="${OPENSIM_GRID_NICK:-myopensim}"
export OPENSIM_WELCOME="${OPENSIM_WELCOME:-Welcome!}"
export OPENSIM_PHYSICS="${OPENSIM_PHYSICS:-BulletSim}"
export OPENSIM_ESTATE_NAME="${OPENSIM_ESTATE_NAME:-My Estate}"
export OPENSIM_OWNER_FIRSTNAME="${OPENSIM_OWNER_FIRSTNAME:-Admin}"
export OPENSIM_OWNER_LASTNAME="${OPENSIM_OWNER_LASTNAME:-Opensim}"
export OPENSIM_OWNER_EMAIL="${OPENSIM_OWNER_EMAIL:-admin@example.com}"
export MYSQL_HOST="${MYSQL_HOST:-db}"
export MYSQL_DATABASE="${MYSQL_DATABASE:-opensim}"
export MYSQL_USER="${MYSQL_USER:-opensim}"

if [ -z "${OPENSIM_OWNER_PASSWORD:-}" ] || [ -z "${MYSQL_PASSWORD:-}" ]; then
    log "ERROR: OPENSIM_OWNER_PASSWORD and MYSQL_PASSWORD are required" >&2
    exit 1
fi

log "OpenSim ${OPENSIM_VERSION:-?} ($(cut -c1-7 OPENSIM_COMMIT 2>/dev/null)) on .NET ${DOTNET_RUNTIME:-?}, port ${OPENSIM_PORT}"


# Architecture

if [ "${OPENSIM_HYPERGRID:-false}" = "true" ]; then
    ARCH="StandaloneHypergrid.ini"
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
log "Architecture: ${ARCH}"


# Regions
#
# Created once, on an empty volume. The RegionUUID must never change:
# it links the region to its objects in the database.

if ! ls Regions/*.ini >/dev/null 2>&1; then
    REGION_NAME="${OPENSIM_REGION_NAME:-My Region}"
    REGION_UUID="$(uuidgen)"

    cat > Regions/Regions.ini <<EOF
; One section per region. Each region needs its own InternalPort (UDP).

[${REGION_NAME}]
RegionUUID = ${REGION_UUID}
Location = ${OPENSIM_REGION_LOCATION:-1000,1000}
InternalAddress = 0.0.0.0
InternalPort = ${OPENSIM_PORT}
AllowAlternatePorts = False
ExternalHostName = ${OPENSIM_PUBLIC_HOST}
SizeX = ${OPENSIM_REGION_SIZE:-256}
SizeY = ${OPENSIM_REGION_SIZE:-256}
SizeZ = 4096
EOF

    log "Region created: ${REGION_NAME} (${REGION_UUID})"
else
    log "Regions kept: $(ls Regions/*.ini | tr '\n' ' ')"
fi

# OPENSIM_PUBLIC_HOST wins over whatever the region files say, so a host
# change only needs a restart.
sed -i "s|^\s*ExternalHostName\s*=.*|ExternalHostName = ${OPENSIM_PUBLIC_HOST}|" Regions/*.ini


exec "$@"
