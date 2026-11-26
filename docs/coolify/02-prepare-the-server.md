# 2. Prepare the server

OpenSim does not go through Coolify's proxy: the proxy only handles HTTP, and regions use UDP. Each instance opens its own port on the server.


## DNS

Point an A record to the server, e.g. `rc.world.example.com`. On Cloudflare, set it to **DNS only**.


## Firewall

Open the instance's port in TCP and UDP: 9100 for the RC instance, 9000 for production.

With ufw and ufw-docker:

```bash
ufw route allow proto tcp from any to any port 9100
ufw route allow proto udp from any to any port 9100
ufw allow 9100/tcp
```

The last rule lets OpenSim call its own public address, which avatar profiles need.

If your provider has its own firewall, open the same ports there.


## Log in to GHCR

Only for a private image. Create a classic GitHub token with the `read:packages` scope only (GHCR refuses fine-grained tokens), then use it as the password:

```bash
sudo docker login ghcr.io -u Mageas
```

---

Previous: [1. Publish the image](01-publish-the-image.md) · Next: [3. Deploy the RC instance](03-deploy-the-rc-instance.md)
