# 5. Automate deploys

Optional: let GitHub redeploy Coolify after each build and each promotion.

1. In Coolify, enable **Settings > Advanced > API Access**, then create a token in **Keys & Tokens > API Tokens** with `write` and `deploy`.
2. In GitHub, open [Actions secrets](https://github.com/Mageas/opensim-docker/settings/secrets/actions) and add:

   | Secret | Value |
   | --- | --- |
   | `COOLIFY_URL` | `https://app.coolify.io`, or the URL of your instance |
   | `COOLIFY_TOKEN` | the token |
   | `COOLIFY_RC_SERVICE_UUID` | the RC resource's UUID, the last part of its URL |
   | `COOLIFY_PROD_SERVICE_UUID` | the production resource's UUID |


## How releases work then

Every day, **Check upstream** looks for a new OpenSim version. When it finds one, it builds it, deploys it to the RC instance and opens an issue.

Test the RC instance, then run **Promote to stable**: production updates.

---

Previous: [4. Go live](04-go-live.md)
