# OpenSim Docker

OpenSimulator (standalone, MariaDB) in a Docker image built by GitHub Actions and deployed with Coolify.

Each build is published as `rc` and runs on a test instance. Once you have checked it, **Promote to stable** turns it into the `stable` image that production runs.


## Deploy on Coolify

1. [Publish the image](docs/coolify/01-publish-the-image.md)
2. [Prepare the server](docs/coolify/02-prepare-the-server.md)
3. [Deploy the RC instance](docs/coolify/03-deploy-the-rc-instance.md)
4. [Go live](docs/coolify/04-go-live.md)
5. [Automate deploys](docs/coolify/05-automate-deploys.md)

Then: [Configuration](docs/configuration.md), [Operations](docs/operations.md) and [Load test from Windows](docs/load-test.md).


## Run locally

Copy the settings, then set `OPENSIM_PUBLIC_HOST` and the passwords:

```bash
cp .env.example .env
```

The container runs as uid 1000 and writes its backups to `./backups`:

```bash
mkdir -p backups
sudo chown 1000:1000 backups
```

Build and start. The first build takes a few minutes:

```bash
docker compose up -d --build
```

When `docker compose logs opensim` shows `LOGINS ENABLED`, connect a viewer to `http://127.0.0.1:9000/`.
