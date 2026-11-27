# 4. Go live

Production runs the `stable` image, which only exists after a promotion.

1. Test the RC instance: login, region, objects, scripts, teleport.
2. Run [Promote to stable](https://github.com/Mageas/opensim-docker/actions/workflows/promote.yml) twice: image `opensim` with the `build-<n>` tag from the **Build image** summary, then image `opensim-web` with the one from the **Build web portal** summary.
3. Create a second Coolify resource as in [step 3](03-deploy-the-rc-instance.md), with the domain `https://account.world.example.com:3000` on `web` and:

   | Variable | Value |
   | --- | --- |
   | `OPENSIM_PUBLIC_HOST` | `world.example.com` |
   | `OPENSIM_IMAGE_TAG` | `stable` |
   | `OPENSIM_PORT` | `9000` |
   | `PORTAL_URL` | `https://account.world.example.com` |

4. Open port 9000 as in [step 2](02-prepare-the-server.md), then deploy.

Before each later promotion, [back up](../operations.md#back-up) the production database: OpenSim upgrades it on start and cannot downgrade it.

---

Previous: [3. Deploy the RC instance](03-deploy-the-rc-instance.md) · Next: [5. Automate deploys](05-automate-deploys.md)
