# Operations

On Coolify, the containers are named `opensim-<uuid>` and `db-<uuid>`: `docker ps` lists them. Locally, they are `opensim` and `opensim-db`.


## Console

```bash
docker attach opensim-<uuid>
```

Press Enter to get the prompt. Leave with Ctrl+P then Ctrl+Q: Ctrl+C stops the server.

Useful commands: `create user`, `reset user password`, `show users`, `alert <message>`, `shutdown`.


## Back up

The database:

```bash
docker exec db-<uuid> sh -c 'mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" opensim' | gzip > opensim-$(date +%F).sql.gz
```

Coolify can also schedule it, in the **Backups** of the `db` service.

A region, from the console: `save oar backups/region.oar`. Restore it with `load oar`.


## Roll back

Set `OPENSIM_IMAGE_TAG` to `stable-previous`, then **Pull Latest Images & Restart**. If the newer version had upgraded the database, restore the backup.


## Add a region

Append a section to `Regions/Regions.ini` in the container, with a new UUID from `uuidgen` and its own UDP port:

```ini
[Second Region]
RegionUUID = <uuid>
Location = 1001,1000
InternalAddress = 0.0.0.0
InternalPort = 9001
AllowAlternatePorts = False
ExternalHostName = world.example.com
```

Then add `"9001:9001/udp"` to the compose `ports`, open 9001/udp in the firewall, and redeploy.


## Load test

Test the RC instance from a separate VPS with Docker, `curl` and `jq`, so the bots do not share the server's CPU.

Create the bot accounts. This prints 20 commands to paste into the OpenSim console:

```bash
BOTPASS=$(openssl rand -hex 8)
echo "$BOTPASS"

for i in $(seq 0 19); do
  echo "create user Ima Bot$i $BOTPASS bot$i@example.com $(cat /proc/sys/kernel/random/uuid) ruth"
done
```

The names must be `Ima Bot0`, `Ima Bot1`..., without an underscore, whatever pCampBot's help says.

Start the bots on the VPS:

```bash
docker run --rm -it --entrypoint sh ghcr.io/mageas/opensim:rc -c \
  'cp pCampBot.ini.example pCampBot.ini && exec dotnet pCampBot.dll \
   -loginuri http://rc.world.example.com:9100/ -firstname Ima -lastname Bot \
   -password <BOTPASS> -botcount 20 -behaviours p'
```

In the pCampBot console, type `connect 1`, then `connect 4`, `connect 5`... every few minutes.

Watch the region from a second terminal:

```bash
watch -n 10 "curl -s http://rc.world.example.com:9100/jsonSimStats | jq -c '{bots: .RootAg, dilation: .Dilatn, fps: .SimFPS, frame_ms: .TotlFt}'"
```

At rest: dilation 1, about 55 fps, a frame time near 18 ms. The region reaches its limit when dilation drops under 0.9 or the frame time climbs.
