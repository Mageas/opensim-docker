# Operations

On Coolify, the containers are named `opensim-<uuid>` and `db-<uuid>`: `docker ps` lists them. Locally, they are `opensim` and `opensim-db`.


## Console

```bash
docker attach opensim-<uuid>
```

Press Enter to get the prompt. Leave with Ctrl+P then Ctrl+Q: Ctrl+C stops the server.

Useful commands: `create user`, `reset user password`, `show users`, `alert <message>`, `shutdown`.


## Back up

Back up the database and the region files, and copy both off the server.

The database:

```bash
docker exec db-<uuid> sh -c 'mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" opensim' | gzip > opensim-$(date +%F).sql.gz
```

Coolify can also schedule it, in the **Backups** of the `db` service. It does not back up the volumes.

The region files and the script state:

```bash
docker exec opensim-<uuid> tar czf - -C /opt/opensim/bin Regions ScriptEngines > opensim-files-$(date +%F).tgz
```

Without `Regions/`, a region is recreated with a new UUID and no longer loads its terrain and objects from the database. Without `ScriptEngines/`, scripts start again with their variables reset.

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

Create the bot accounts on the server, then run the bots from a Windows PC: see [Load test from Windows](load-test.md). pCampBot fails on Linux and macOS with "Unable to connect to simulator".


### Create the bot accounts

On the server, write 200 `create user` commands to a file and copy it into the container:

```bash
BOTPASS=$(openssl rand -hex 8)
echo "$BOTPASS"

for i in $(seq 0 199); do
  echo "create user Ima Bot$i $BOTPASS bot$i@example.com $(cat /proc/sys/kernel/random/uuid) ruth"
done > bots.txt

docker cp bots.txt opensim-<uuid>:/opt/opensim/bin/bots.txt
```

In the OpenSim console, run `command-script bots.txt`, then check the last one with `show account Ima Bot199`.

The names must be `Ima Bot0`, `Ima Bot1`..., without an underscore, whatever pCampBot's help says. An account that already exists is skipped and keeps its old password.


### Compare .NET 8 and .NET 10

1. Run the [load test](load-test.md) on the current `rc` image (.NET 8) and keep its CSV.
2. Run **Build image** with `dotnet_runtime` set to `10.0`. It moves `rc` to .NET 10. Then **Pull Latest Images & Restart** the RC resource, unless the redeploy secrets are set.
3. Run the same test, with the same bots and steps.
4. Compare the two CSV step by step. To go back to .NET 8, run **Build image** with `8.0`.
