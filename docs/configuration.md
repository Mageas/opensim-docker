# Configuration

| Variable | Default | Notes |
| --- | --- | --- |
| `OPENSIM_PUBLIC_HOST` | required | Address viewers use to reach the server |
| `OPENSIM_PORT` | `9000` | TCP and UDP port |
| `OPENSIM_IMAGE_TAG` | `stable` | Coolify only: `rc`, `stable`, `stable-previous` or `build-<n>` |
| `OPENSIM_GRID_NAME` | `My OpenSim` | |
| `OPENSIM_GRID_NICK` | `myopensim` | |
| `OPENSIM_WELCOME` | `Welcome!` | Login screen message |
| `OPENSIM_PHYSICS` | `BulletSim` | Use `ubODE` on ARM |
| `OPENSIM_HYPERGRID` | `false` | Allows teleports to other grids |
| `OPENSIM_REGION_NAME` | `My Region` | First start only |
| `OPENSIM_REGION_LOCATION` | `1000,1000` | First start only |
| `OPENSIM_REGION_SIZE` | `256` | First start only, a multiple of 256 |
| `OPENSIM_ESTATE_NAME` | `My Estate` | First start only |
| `OPENSIM_OWNER_FIRSTNAME` | `Admin` | First start only |
| `OPENSIM_OWNER_LASTNAME` | `Opensim` | First start only |
| `OPENSIM_OWNER_EMAIL` | `admin@example.com` | First start only |
| `MYSQL_BUFFER_POOL` | `512M` | MariaDB memory |
| `PORTAL_URL` | required | Coolify only: the account portal's address, e.g. `https://account.world.example.com` |

On Coolify the passwords are generated: `SERVICE_PASSWORD_OWNER` for the admin account, `SERVICE_PASSWORD_MYSQL` and `SERVICE_PASSWORD_MYSQLROOT` for the database, `SERVICE_PASSWORD_MYSQLWEB` for the portal's database account. Locally they come from `.env`.

Any other OpenSim setting goes in [opensim/config/overrides.ini](../opensim/config/overrides.ini).


## Build options

- **ARM**: add the repository variable `IMAGE_PLATFORMS` = `linux/amd64,linux/arm64`.
- **.NET 10**: run **Build image** with `dotnet_runtime` = `10.0`.
