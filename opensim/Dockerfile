# syntax=docker/dockerfile:1
#
# Image OpenSimulator construite depuis le dépôt officiel (miroir GitHub de opensimulator.org).
#   Etape 1 : compilation avec le SDK .NET 8, toujours sur l'architecture de la machine de build
#             (le code compilé .NET est le même pour amd64 et arm64 : pas d'émulation lente)
#   Etape 2 : image d'exécution (runtime .NET + libgdiplus), une par architecture
#
# Arguments :
#   OPENSIM_VERSION  branche ou tag OpenSim (les versions publiées sont des branches : 0.9.3.0...)
#   OPENSIM_COMMIT   commit exact à compiler (rempli par la CI, optionnel en local)
#   DOTNET_RUNTIME   runtime d'exécution : 8.0 (cible officielle d'OpenSim) ou 10.0 (roll-forward)

ARG OPENSIM_VERSION=0.9.3.0
ARG OPENSIM_COMMIT=""
ARG DOTNET_RUNTIME=8.0

############################ build ############################
FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:11.0 AS build
ARG OPENSIM_VERSION
ARG OPENSIM_COMMIT

WORKDIR /src
# Le commit fait partie de la commande : nouveau commit amont = cache Docker invalidé
RUN git clone --depth 1 --branch "${OPENSIM_VERSION}" https://github.com/opensim/opensim.git . \
 && if [ -n "${OPENSIM_COMMIT}" ] && ! git rev-parse HEAD | grep -q "^${OPENSIM_COMMIT}"; then \
        git fetch --depth 1 origin "${OPENSIM_COMMIT}" && git checkout --quiet FETCH_HEAD; \
    fi \
 && git rev-parse HEAD > /src/OPENSIM_COMMIT \
 && echo "OpenSim ${OPENSIM_VERSION} @ $(cat /src/OPENSIM_COMMIT)"

# Génère OpenSim.sln (prebuild) puis compile en Release. Tout atterrit dans /src/bin
RUN ./runprebuild.sh \
 && dotnet build -c Release OpenSim.sln \
 && rm -rf bin/*.pdb bin/Tests* bin/*.Tests.dll

# Préparation de la config de base (les *.example deviennent les vrais fichiers) :
#  - OpenSim.ini        : copie de l'exemple, surchargé ensuite par config/*.ini
#  - StandaloneCommon   : copie de l'exemple SANS l'include SQLite (on utilise MariaDB)
RUN cd bin \
 && cp OpenSim.ini.example OpenSim.ini \
 && cp config-include/StandaloneCommon.ini.example config-include/StandaloneCommon.ini \
 && sed -i 's|^\(\s*\)Include-Storage = "config-include/storage/SQLiteStandalone.ini";|\1; Include-Storage disabled: MariaDB is configured in config/overrides.ini|' \
        config-include/StandaloneCommon.ini \
 && cp config-include/FlotsamCache.ini.example config-include/FlotsamCache.ini \
 && mkdir -p config backups ScriptEngines \
 && cp /src/OPENSIM_COMMIT /src/bin/OPENSIM_COMMIT

########################### runtime ###########################
FROM mcr.microsoft.com/dotnet/runtime:${DOTNET_RUNTIME}
ARG OPENSIM_VERSION
ARG DOTNET_RUNTIME
LABEL org.opencontainers.image.title="OpenSimulator" \
      org.opencontainers.image.description="OpenSimulator ${OPENSIM_VERSION} standalone, MariaDB" \
      org.opencontainers.image.version="${OPENSIM_VERSION}"

# libgdiplus : rendu des maptiles / textures. uuid-runtime : uuidgen. curl : healthcheck
RUN apt-get update \
 && apt-get install -y --no-install-recommends libgdiplus libc6-dev uuid-runtime curl \
 && rm -rf /var/lib/apt/lists/*

# DOTNET_ROLL_FORWARD=Major : OpenSim cible .NET 8 ; sur une image runtime 10.0 il tourne sur .NET 10
ENV LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    OPENSIM_VERSION=${OPENSIM_VERSION} \
    DOTNET_RUNTIME=${DOTNET_RUNTIME} \
    DOTNET_ROLL_FORWARD=Major \
    OPENSIM_PORT=9000

# Utilisateur non-root uid 1000 (les images Ubuntu de .NET 10 ont déjà un "ubuntu" en 1000 : on le retire)
RUN if id ubuntu >/dev/null 2>&1; then userdel --remove ubuntu; fi \
 && groupadd --system --gid 1000 opensim \
 && useradd --system --uid 1000 --gid opensim --home-dir /opt/opensim --shell /usr/sbin/nologin opensim

COPY --from=build --chown=opensim:opensim /src/bin /opt/opensim/bin
COPY --chmod=755 docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
# Surcharges de config intégrées à l'image (pratique pour Coolify : pas de fichier à monter).
# En local, le compose peut toujours monter une autre version par-dessus.
COPY --chown=opensim:opensim config/overrides.ini /opt/opensim/bin/config/overrides.ini

USER opensim
WORKDIR /opt/opensim/bin

# OPENSIM_PORT (9000 par défaut) : HTTP en TCP + 1re région en UDP
EXPOSE 9000/tcp 9000/udp

ENTRYPOINT ["docker-entrypoint.sh"]
# "healthy" quand le service HTTP répond (le 1er démarrage crée la base : marge de 3 min)
HEALTHCHECK --interval=30s --timeout=5s --start-period=180s --retries=3 \
  CMD curl -fs "http://127.0.0.1:${OPENSIM_PORT}/get_grid_info" > /dev/null || exit 1

CMD ["dotnet", "OpenSim.dll", "-console=basic"]
