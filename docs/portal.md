# Account portal

A small website next to the grid. Visitors create an avatar, log in, see their account, change their password and delete their account.

It runs as the `web` service and works directly on OpenSim's tables, so a change applies to the viewer at the next login.


## Pages

| Page | What it does |
| --- | --- |
| `/signup` | Creates the avatar as the console's `create user` does, inventory and default outfit included |
| `/login` | Avatar name and password, as in the viewer |
| `/account` | Status in the grid, creation date, last login, UUID |
| `/account/password` | Sets a new password, at least 15 characters |
| `/account/delete` | Deletes the avatar, after asking for the password |

Deleting removes the account, its inventory, appearance, friends, profile, group memberships and offline messages. Objects left in the regions stay.

The portal refuses to delete an avatar that is in the grid, an estate owner, or an administrator. Do those from the console.

To close account creation, set `PORTAL_SIGNUP_ENABLED` to `false` and redeploy. The signup links disappear, and avatars made before keep their access.


## Develop

In `web/`, with Docker running (the tests start MariaDB with OpenSim's schema):

```bash
pnpm install
```

```bash
pnpm exec playwright install chromium
```

```bash
pnpm test
```

To run it against a database, copy `web/.env.example` to `web/.env`, fill it in, then:

```bash
pnpm setup-db
```

```bash
pnpm dev
```
