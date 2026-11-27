# 1. Publish the image

You need a server managed by Coolify, a domain name, and an OpenSim viewer such as [Firestorm](https://www.firestormviewer.org/).

Open [Build image](https://github.com/Mageas/opensim-docker/actions/workflows/build.yml) and click **Run workflow**. Then do the same with [Build web portal](https://github.com/Mageas/opensim-docker/actions/workflows/build-web.yml).

The images are published as `ghcr.io/mageas/opensim:rc` and `ghcr.io/mageas/opensim-web:rc`.

The repository is private, so the images are too. Either make them public in their package settings ([opensim](https://github.com/users/Mageas/packages/container/opensim/settings), [opensim-web](https://github.com/users/Mageas/packages/container/opensim-web/settings)), or log the server in to GHCR in the next step.

---

Next: [2. Prepare the server](02-prepare-the-server.md)
