# Payments

Avatars buy currency from the viewer, as in Second Life. They save a card once on the portal; then the viewer's **Buy currency** window charges it, after asking for the avatar's password.

Stripe keeps the card. The `money` service (DTL/NSL Money Server) keeps the balances.

Payments stay off while `STRIPE_SECRET_KEY` is blank. The economy still runs: balances start at 0 and avatars can sell things for 0.


## Get Stripe test keys

1. Create an account on [dashboard.stripe.com/register](https://dashboard.stripe.com/register). A sandbox needs no business details and no bank account.
2. In the sandbox, **Developers**, **API keys**: copy the secret key, `sk_test_...`. The publishable key is not used.
3. Pick a price and a cap per purchase: `CURRENCY_PER_EURO` (Second Life sells about 250 L$ for a dollar) and `PURCHASE_MAX_EUROS`.

Nothing is charged in a sandbox, whatever the card.


## Test locally

Fill in `.env`:

```
OPENSIM_PUBLIC_HOST=<your LAN IP>
MONEY_SCRIPT_KEY=<a long random string>
STRIPE_SECRET_KEY=sk_test_...
CURRENCY_PER_EURO=...
PURCHASE_MAX_EUROS=...
```

The LAN IP matters: the Money Server pushes new balances to the region at that address, and `127.0.0.1` would point it at itself.

Get the webhook secret from the Stripe CLI, which runs in Docker, and add it to `.env` as `STRIPE_WEBHOOK_SECRET`. It stays the same from one run to the next.

```bash
docker compose run --rm stripe listen --print-secret
```

Start the grid, then the relay that forwards Stripe's events to the portal:

```bash
docker compose up -d --build
```

```bash
docker compose up -d stripe
```

The portal is on http://localhost:3000. Then [try it with Firestorm](#try-it-with-firestorm).

To stop everything, relay included:

```bash
docker compose --profile stripe down
```


## Set up on Coolify

This adds payments to an instance deployed as in [Deploy the RC instance](coolify/03-deploy-the-rc-instance.md), whose portal already answers on `https://account.rc.world.example.com`.


### 1. Images

The `rc` images must include payments. **Build image** and **Build web portal** make them on each push to `main` that touches `opensim/` or `web/`. Check that both runs passed in GitHub Actions.


### 2. Compose

In the Coolify resource, replace the compose with the current [docker-compose.coolify.yml](../docker-compose.coolify.yml). It adds the `money` service: leave its **Domains** empty. Coolify generates its key, `SERVICE_PASSWORD_MONEYSCRIPT`.


### 3. Stripe webhook

Stripe tells the portal about payments that a bank checked after the purchase. Create the endpoint with the test secret key, typed at the prompt so that it stays out of the shell history:

```bash
read -rs STRIPE_KEY
```

```bash
curl -s https://api.stripe.com/v1/webhook_endpoints -u "$STRIPE_KEY:" \
  -d url=https://account.rc.world.example.com/stripe/webhook \
  -d "enabled_events[]=payment_intent.succeeded" \
  -d "enabled_events[]=payment_intent.payment_failed" | grep '"secret"'
```

The answer is the webhook secret, `whsec_...`. The dashboard shows it again under **Developers**, **Webhooks**, where you can also create the endpoint by hand with the same URL and events.


### 4. Variables

In **Environment Variables**:

| Variable | Value |
| --- | --- |
| `STRIPE_SECRET_KEY` | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` from step 3 |
| `CURRENCY_PER_EURO` | Currency units one euro buys |
| `PURCHASE_MAX_EUROS` | The most one purchase charges |

`PORTAL_URL` is already set: the grid gives it to viewers as the place to buy currency.


### 5. Deploy

Click **Deploy**.


### Check

```bash
curl -s http://rc.world.example.com:9100/get_grid_info | grep economy
```

The answer should be `<economy>https://account.rc.world.example.com/</economy>`.

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'Content-Type: application/json' -d '{}' https://account.rc.world.example.com/stripe/webhook
```

`400` means payments are on and the webhook refuses posts that Stripe did not sign. `404` means `STRIPE_SECRET_KEY` is blank.

In the logs of `money`, look for `Starting HTTP server on port 8008`; in those of `opensim`, for `DTLNSLMoneyModule`.

The firewall needs nothing new: port 8008 stays on the Docker network. The Money Server calls the region at its public address, through the `ufw allow 9100/tcp` rule from [Prepare the server](coolify/02-prepare-the-server.md).


## Try it with Firestorm

1. In **Preferences**, **OpenSim**, select the grid and click **Refresh**: Firestorm reads the grid's `economy` address.
2. Log in and enter a region once. The Money Server only knows avatars that did.
3. On the portal: **My account**, **Payment method**, **Save a card**. Stripe asks for an e-mail address the first time.
4. In the viewer: click the balance at the top right, **Buy currency**, an amount, **Buy**, then the avatar's password.

| Test card | What happens |
| --- | --- |
| `4242 4242 4242 4242` | Paid: the balance goes up in the viewer |
| `4000 0027 6000 3184` | The bank asks for a check when the card is saved and at each purchase. The viewer gives a link to Stripe's test page: **Complete** pays, **Fail** cancels |
| `4000 0000 0000 0341` | Saved, then refused at each purchase |

Any future expiry date and any CVC work. **Use another card** on the portal switches to the next test card. `4000 0000 0000 9995` is refused as soon as it is saved, so it cannot test a refusal in the viewer.

Buying land with too little currency goes the same way: the **Buy land** window buys what is missing first.

The Stripe dashboard lists each purchase under **Payments**, and each webhook delivery under **Developers**, **Webhooks**.


## Go live

On the production resource only, once [Go live](coolify/04-go-live.md) is done:

1. Activate the Stripe account: legal identity, IBAN, and the public business name that Checkout shows to buyers.
2. In live mode, copy the secret key `sk_live_...` and create the webhook endpoint as in [step 3](#3-stripe-webhook), with `https://account.world.example.com/stripe/webhook`.
3. Set the four variables of [step 4](#4-variables) on the production resource, then deploy.

The RC keeps its test keys. The currency only goes one way: no sale back for euros.


## A purchase paid but not credited

The portal never credits a purchase twice, so when the Money Server fails or takes more than 10 seconds to answer, the purchase waits for you. The `web` logs say `is paid but not credited`.

```bash
docker exec -it <db container> mariadb -uroot -p opensim -e "SELECT id, user_id, amount, price_cents, updated_at FROM web_purchases WHERE status = 'credit_failed'"
```

A Money Server that answered late may have credited it anyway. Look for its `pi_...` id in the Money Server's transactions:

```bash
docker exec -it <db container> mariadb -uroot -p opensim -e "SELECT FROM_UNIXTIME(time), amount, status FROM transactions WHERE description LIKE 'Purchase pi_...%'"
```

Status `0` means it was credited: mark the purchase so, and refund nothing.

```bash
docker exec -it <db container> mariadb -uroot -p opensim -e "UPDATE web_purchases SET status = 'credited' WHERE id = 'pi_...'"
```

With no row, or another status, refund it from the Stripe dashboard, under **Payments**.


## Troubleshooting

| Symptom | Cause |
| --- | --- |
| The viewer says buying currency is not available | `STRIPE_SECRET_KEY` is blank on `web` |
| The Buy currency window cannot reach the server | Firestorm kept the old grid info: refresh the grid, then check `economy` in `get_grid_info` |
| Paid after the bank's check, but the balance stays the same | The webhook did not arrive: check its deliveries in the Stripe dashboard, and `STRIPE_WEBHOOK_SECRET` |
| The new balance only shows after a relog | The Money Server cannot reach the region at `OPENSIM_PUBLIC_HOST` and the instance's port |
