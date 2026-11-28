# syntax=docker/dockerfile:1

ARG OPENSIM_VERSION=0.9.3.0
ARG OPENSIM_COMMIT=""
ARG DOTNET_RUNTIME=8.0
# DTL/NSL Money Server, .NET 8 fork for OpenSim 0.9.3 (MIT).
ARG MONEY_SERVER_COMMIT=a5f746bbd0d869760e08987529376a9626d655f4


# Build stage
#
# Runs on the build machine's own architecture: the compiled .NET assemblies
# are the same for amd64 and arm64, so there is no slow QEMU compile.

FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:8.0 AS build
ARG OPENSIM_VERSION
ARG OPENSIM_COMMIT

WORKDIR /src

# OpenSim releases are branches, not tags. The commit is part of the command
# so that a new upstream commit invalidates the layer cache.
RUN git clone --depth 1 --branch "${OPENSIM_VERSION}" https://github.com/opensim/opensim.git . \
 && if [ -n "${OPENSIM_COMMIT}" ] && ! git rev-parse HEAD | grep -q "^${OPENSIM_COMMIT}"; then \
        git fetch --depth 1 origin "${OPENSIM_COMMIT}" && git checkout --quiet FETCH_HEAD; \
    fi \
 && git rev-parse HEAD > /src/OPENSIM_COMMIT \
 && echo "OpenSim ${OPENSIM_VERSION} @ $(cat /src/OPENSIM_COMMIT)"

# runprebuild adds every addon module to the solution, so the same build makes the
# region module (OpenSim.Modules.Currency.dll) and MoneyServer.dll. The Money Server
# logs to the console only: its log file would grow in the image's bin/ forever.
ARG MONEY_SERVER_COMMIT
RUN git init --quiet /money \
 && git -C /money fetch --quiet --depth 1 \
        https://github.com/ManfredAabye/opensimcurrencyserver-dotnet.git "${MONEY_SERVER_COMMIT}" \
 && git -C /money checkout --quiet FETCH_HEAD \
 && cp -r /money/addon-modules/OpenSim-* addon-modules/ \
 && sed -e '/<appender-ref ref="LogFileAppender" \/>/d' -e 's|<level value="DEBUG" />|<level value="INFO" />|' \
        /money/bin/MoneyServer.dll.config > bin/MoneyServer.dll.config \
 && rm -rf /money

RUN ./runprebuild.sh \
 && dotnet build -c Release OpenSim.sln \
 && rm -rf bin/*.pdb bin/Tests* bin/*.Tests.dll

# The SQLite include is commented out: its per-service connection strings
# would override the MariaDB settings in config/overrides.ini.
RUN cd bin \
 && cp OpenSim.ini.example OpenSim.ini \
 && cp config-include/StandaloneCommon.ini.example config-include/StandaloneCommon.ini \
 && sed -i 's|^\(\s*\)Include-Storage = "config-include/storage/SQLiteStandalone.ini";|\1; Include-Storage disabled: MariaDB is configured in config/overrides.ini|' \
        config-include/StandaloneCommon.ini \
 && cp config-include/FlotsamCache.ini.example config-include/FlotsamCache.ini \
 && mkdir -p config backups ScriptEngines \
 && cp /src/OPENSIM_COMMIT /src/bin/OPENSIM_COMMIT


# Runtime stage

FROM mcr.microsoft.com/dotnet/runtime:${DOTNET_RUNTIME}
ARG OPENSIM_VERSION
ARG DOTNET_RUNTIME

LABEL org.opencontainers.image.title="OpenSimulator" \
      org.opencontainers.image.description="OpenSimulator ${OPENSIM_VERSION} standalone, MariaDB" \
      org.opencontainers.image.version="${OPENSIM_VERSION}"

# libgdiplus and libc6-dev are the runtime dependencies listed in OpenSim's README.
RUN apt-get update \
 && apt-get install -y --no-install-recommends libgdiplus libc6-dev uuid-runtime curl \
 && rm -rf /var/lib/apt/lists/*

# OpenSim targets .NET 8. Rolling forward lets the same build run on a .NET 10 runtime image.
ENV LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    OPENSIM_VERSION=${OPENSIM_VERSION} \
    DOTNET_RUNTIME=${DOTNET_RUNTIME} \
    DOTNET_ROLL_FORWARD=Major \
    OPENSIM_PORT=9000

# The .NET 10 images are based on Ubuntu and ship an "ubuntu" user on uid 1000.
RUN if id ubuntu >/dev/null 2>&1; then userdel --remove ubuntu; fi \
 && groupadd --system --gid 1000 opensim \
 && useradd --system --uid 1000 --gid opensim --home-dir /opt/opensim --shell /usr/sbin/nologin opensim

COPY --from=build --chown=opensim:opensim /src/bin /opt/opensim/bin
COPY --chmod=755 docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

# Baked in so that Coolify needs no file mount. The local compose file mounts its own copy on top.
COPY --chown=opensim:opensim config/overrides.ini /opt/opensim/bin/config/overrides.ini

USER opensim
WORKDIR /opt/opensim/bin

EXPOSE 9000/tcp 9000/udp

ENTRYPOINT ["docker-entrypoint.sh"]

# The first start creates the database schema, hence the long start period.
HEALTHCHECK --interval=30s --timeout=5s --start-period=180s --retries=3 \
  CMD curl -fs "http://127.0.0.1:${OPENSIM_PORT}/get_grid_info" > /dev/null || exit 1

CMD ["dotnet", "OpenSim.dll", "-console=basic"]
