#!/bin/sh
set -eu

cd /opt/opensim/bin

log() {
    echo "[entrypoint] $*"
}


# Money Server
#
# The same image runs the DTL/NSL Money Server when `money-server` is the command. It
# keeps balances and transfers in the OpenSim database, in tables it creates itself.

if [ "${1:-}" = "money-server" ]; then
    if [ -z "${MYSQL_PASSWORD:-}" ] || [ -z "${MONEY_SCRIPT_KEY:-}" ]; then
        log "ERROR: MYSQL_PASSWORD and MONEY_SCRIPT_KEY are required" >&2
        exit 1
    fi

    # No ServerCertFilename: plain HTTP, which only the Docker network carries.
    # The Money Server stops on a missing [Startup] section, even an empty one.
    cat > MoneyServer.ini <<EOF
[Startup]

[MySql]
hostname = "${MYSQL_HOST:-db}"
database = "${MYSQL_DATABASE:-opensim}"
username = "${MYSQL_USER:-opensim}"
password = "${MYSQL_PASSWORD}"
port = "3306"
pooling = "true"
MaxConnection = "10"

[MoneyServer]
ServerPort = "8008"
; Currency only comes from purchases.
DefaultBalance = "0"
HGAvatarDefaultBalance = "0"
GuestAvatarDefaultBalance = "0"
; UpdateBalance takes back whatever goes above this cap.
CurrencyMaximum = "2147483647"
EnableAmountZero = "true"
EnableForceTransfer = "true"
; The zero UUID would make every avatar a banker, who can create money.
BankerAvatar = "00000000-0000-0000-0000-000000000001"
; The portal credits purchases through SendMoney. The "IP address" is only a salt in the
; access code: a region forwards a caller's own address instead, so no caller from the
; Internet can match it through a region's public SendMoney or MoveMoney.
EnableScriptSendMoney = "true"
MoneyScriptAccessKey = "${MONEY_SCRIPT_KEY}"
MoneyScriptIPaddress = "opensim-web"
EOF

    log "Money Server on port 8008"
    exec dotnet MoneyServer.dll
fi


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


# Economy
#
# With OPENSIM_MONEY_SERVER, the DTL/NSL module replaces the default one, which keeps
# every balance at zero. Viewers buy currency at OPENSIM_ECONOMY_URL (the portal), never
# at the Money Server: its own buyCurrency hands out money without a payment.

if [ -n "${OPENSIM_MONEY_SERVER:-}" ]; then
    ECONOMY_URL="${OPENSIM_ECONOMY_URL:-}"
    # Viewers append "currency.php" to it.
    case "${ECONOMY_URL}" in
        ""|*/) ;;
        *) ECONOMY_URL="${ECONOMY_URL}/" ;;
    esac

    cat > config/money.ini <<EOF
[Economy]
    EconomyModule = DTLNSLMoneyModule
    CurrencyServer = "${OPENSIM_MONEY_SERVER}"
    SellEnabled = true

[GridInfoService]
    economy = "${ECONOMY_URL}"
EOF
    log "Economy: Money Server at ${OPENSIM_MONEY_SERVER}, viewers buy at ${ECONOMY_URL:-nowhere}"
else
    rm -f config/money.ini
    log "Economy: none, every balance stays at zero"
fi


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
