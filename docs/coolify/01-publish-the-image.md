# 1. Publish the image

You need a server managed by Coolify, a domain name, and an OpenSim viewer such as [Firestorm](https://www.firestormviewer.org/).

Open [Build image](https://github.com/Mageas/opensim-docker/actions/workflows/build.yml) and click **Run workflow**.

The image is published as `ghcr.io/mageas/opensim:rc`.

The repository is private, so the image is too. Either make it public in its [package settings](https://github.com/users/Mageas/packages/container/opensim/settings), or log the server in to GHCR in the next step.

---

Next: [2. Prepare the server](02-prepare-the-server.md)
