# Deploying couchandcraft.com

`.github/workflows/deploy.yml` builds the site and uploads `dist/` to Hostinger over FTP.

| Event | What happens |
| --- | --- |
| Pull request | Build, `npm run check` and the accessibility scan. Nothing is uploaded. |
| Push to `main` | Dev build, locked behind a password, uploaded to staging. |
| Manual run, target `production` | Production build (`npm run build:prod`), uploaded to the live site. Fails while any `[JUSTIN TO SET]` value is still rendered. |

## One-time setup

### 1. Staging subdomain on Hostinger
Create `staging.couchandcraft.com` in hPanel. Note the folder it points to and the full server path of that folder (the File Manager shows it, something like `/home/u123456789/domains/couchandcraft.com/public_html/staging`).

### 2. FTP accounts
Use the FTP details from hPanel. One account can serve both targets if its root is `public_html`. The server directory secret then picks the folder.

### 3. GitHub environments and secrets
In the repo: Settings → Environments. Create `staging` and `production`, and add these secrets to each:

| Secret | Staging | Production |
| --- | --- | --- |
| `FTP_SERVER` | FTP host from hPanel | same |
| `FTP_USERNAME` | FTP user | FTP user |
| `FTP_PASSWORD` | FTP password | FTP password |
| `FTP_SERVER_DIR` | folder for staging, ending in `/` (for example `staging/`) | folder for the live site, ending in `/` (for example `./`) |
| `STAGING_USER` | login name for the staging password prompt | not used |
| `STAGING_PASSWORD` | password for the staging prompt | not used |
| `STAGING_HTPASSWD_PATH` | full server path to the staging folder plus `/.htpasswd` | not used |

Optional: add yourself as a required reviewer on the `production` environment, so a production run waits for your OK.

If FTP over TLS doesn't connect, add a repository variable `FTP_PROTOCOL` set to `ftp`.

### 4. First deploy
Push to `main` (or run the workflow by hand with target `staging`). Then open `https://staging.couchandcraft.com/`. It should ask for the staging login, and send `X-Robots-Tag: noindex, nofollow`.

## Notes
- The upload only removes files it uploaded before, so it won't touch other folders on the server.
- Staging writes its own `.htaccess`, `.htpasswd` and `robots.txt` into `dist/` before uploading. The production `.htaccess` comes in Step 13.
- The form handler's mail settings (`contact-config.php`) live on the server, one level above the web folder. They're never deployed from the repo (Step 11).
