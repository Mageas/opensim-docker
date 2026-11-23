# OpenSimulator auto-hébergé avec Docker Compose

OpenSimulator 0.9.3.0 (.NET 8) en mode **standalone**, avec MariaDB, compilé depuis les sources officielles.

```
opensim-docker/
├── docker-compose.yml          # usage local / serveur classique (avec .env)
├── docker-compose.coolify.yml  # Coolify : image GHCR (stable ou rc)
├── OPENSIM_REF                 # version OpenSim de référence des builds
├── .github/                    # workflows GitHub Actions + Dependabot
├── .env.example                # réglages pour docker-compose.yml
├── backups/                    # sauvegardes OAR / IAR (version locale)
└── opensim/
    ├── Dockerfile              # build multi-étapes .NET 8 depuis le tag officiel
    ├── docker-entrypoint.sh    # crée Regions.ini au 1er démarrage, active ou non l'Hypergrid
    └── config/overrides.ini    # surcharges de config OpenSim (intégrées à l'image)
```

## Démarrage

```bash
cp .env.example .env          # puis éditer : OPENSIM_PUBLIC_HOST, mots de passe, compte admin
mkdir -p backups && sudo chown 1000:1000 backups
docker compose up -d --build  # 1er build : quelques minutes (compilation)
docker compose logs -f opensim   # attendre "LOGINS ENABLED"
```

Vérification rapide : `curl http://<OPENSIM_PUBLIC_HOST>:9000/get_grid_info`

## Se connecter

1. Installer un viewer compatible OpenSim : **Firestorm (version OpenSim)**, Singularity, Cool VL Viewer...
2. Firestorm : Préférences > OpenSim > Grid Manager > ajouter `http://<OPENSIM_PUBLIC_HOST>:9000/`
3. Choisir la grille sur l'écran de login, se connecter avec `OPENSIM_OWNER_FIRSTNAME` `OPENSIM_OWNER_LASTNAME` / `OPENSIM_OWNER_PASSWORD`.

## Réseau

| Port | Proto | Rôle |
|------|-------|------|
| 9000 | TCP | HTTP : login, inventaire, assets, capabilities, map, Hypergrid |
| 9000 | UDP | Protocole client de la région (1 port UDP par région) |

`OPENSIM_PUBLIC_HOST` doit être l'adresse que **le viewer** utilise pour joindre le serveur.
Elle est écrite dans les URLs renvoyées au login et dans `ExternalHostName` de chaque région :
avec une mauvaise valeur, le login réussit puis le viewer reste bloqué ("connecting to region").

- même machine : `127.0.0.1`
- réseau local : IP LAN du serveur
- Internet : IP publique ou DNS, ports 9000 TCP **et** UDP redirigés sur la box. Si tu testes depuis
  ton LAN avec le DNS public, il faut que la box gère le NAT loopback (sinon entrée DNS locale).

Le port UDP ne passe pas par un reverse proxy HTTP classique (Traefik/Nginx) : il faut le publier directement.

## Console d'administration

```bash
docker attach opensim        # puis Entrée ; détacher avec Ctrl+P puis Ctrl+Q (pas Ctrl+C !)
```

Commandes utiles :

```
create user                      # nouveau compte (questions interactives)
reset user password              # changer un mot de passe
show users / show regions
save oar backups/ma-region.oar   # sauvegarde complète de la région (terrain + objets + assets)
load oar backups/ma-region.oar   # restauration (ou import d'une région téléchargée)
save iar Prenom Nom / backups/inv.iar   # sauvegarde d'un inventaire
alert Message pour tout le monde
shutdown                         # arrêt propre (le conteneur redémarre tout seul)
```

## Ajouter une région

```bash
UUID=$(docker compose exec -T opensim uuidgen)
docker compose exec -T opensim sh -c 'cat >> Regions/Regions.ini' <<EOF

[Deuxieme Region]
RegionUUID = $UUID
Location = 1001,1000
InternalAddress = 0.0.0.0
InternalPort = 9001
AllowAlternatePorts = False
ExternalHostName = 127.0.0.1
EOF
```

Puis ajouter `- "9001:9001/udp"` dans `ports:` du compose et `docker compose up -d`.
`Location` voisine (1001,1000) = régions collées, on passe de l'une à l'autre à pied.

## Sauvegardes

- Base : `docker compose exec db mariadb-dump -uroot -p"$MYSQL_ROOT_PASSWORD" opensim | gzip > backups/opensim.sql.gz`
- Régions : `save oar` (voir console), fichiers dans `./backups`
- Volume `regions` : contient les RegionUUID, à garder (ils relient la région à ses objets en base)

## Mise à jour

Changer `OPENSIM_VERSION` dans `.env` (tag du dépôt https://github.com/opensim/opensim), puis
`docker compose build --pull && docker compose up -d`. OpenSim migre lui-même le schéma de la base.
Faire un dump avant.

## ARM (Raspberry Pi, Oracle Ampere...)

BulletSim n'est pas fiable sur ARM : mettre `OPENSIM_PHYSICS=ubODE` (ou `basicphysics`).

## GitHub Actions + Coolify

Le dépôt contient trois workflows (`.github/workflows/`) :

| Workflow | Quand | Ce qu'il fait |
|---|---|---|
| **Build image** | bouton Run workflow, push sur `main`, appel de Check upstream | build + push `ghcr.io/<compte>/opensim:rc`, `:<version>-<commit>`, `:build-<n>` |
| **Check upstream** | tous les jours 04:17 UTC | nouvelle version ou nouveau commit OpenSim ? build RC + issue à valider |
| **Promote to stable** | à la main | `build-<n>` devient `:stable` et `:<version>` (ancienne stable en `:stable-previous`) |

Sur Coolify : ressource **Docker Compose Empty** avec `docker-compose.coolify.yml`
(production en `stable` sur 9000, instance de test en `rc` sur 9100).
Le tutoriel complet (setup GitHub, Coolify, secrets, validation des RC) est dans le doc qui accompagne ce dépôt.
