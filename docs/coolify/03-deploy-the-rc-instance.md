# 3. Deploy the RC instance

1. In Coolify, create a **Docker Compose Empty** resource and paste [docker-compose.coolify.yml](../../docker-compose.coolify.yml).
2. Leave the **Domains** of `db` and `opensim` empty. Set the domain of `web` to `https://account.rc.world.example.com:3000`.
3. In **Environment Variables**, set:

   | Variable | Value |
   | --- | --- |
   | `OPENSIM_PUBLIC_HOST` | `rc.world.example.com` |
   | `OPENSIM_IMAGE_TAG` | `rc` |
   | `OPENSIM_PORT` | `9100` |
   | `PORTAL_URL` | `https://account.rc.world.example.com` |

4. Click **Deploy**. The first start takes up to three minutes.


## Check

```bash
curl http://rc.world.example.com:9100/get_grid_info
```

The answer should contain `http://rc.world.example.com:9100/`.

```bash
curl https://account.rc.world.example.com/health
```

The answer should be `ok`. `web-setup` shows as exited: it prepares the portal's database account at each deploy, then stops.


## Connect

In Firestorm, open **Preferences > OpenSim > Grid Manager** and add `http://rc.world.example.com:9100/`.

Log in as `Admin Opensim`. The password is `SERVICE_PASSWORD_OWNER`, in the **Environment Variables** tab.

If the login works but the viewer gets stuck on "Connecting to region", either `OPENSIM_PUBLIC_HOST` is wrong or the UDP port is closed.


## Update

Use **Advanced > Pull Latest Images & Restart**. A plain Restart keeps the old image.

---

Previous: [2. Prepare the server](02-prepare-the-server.md) · Next: [4. Go live](04-go-live.md)
