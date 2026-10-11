# Deploying couchandcraft.com

`.github/workflows/deploy.yml` builds the site and uploads `dist/` to Hostinger over FTP. There is no staging site. Every deploy goes to couchandcraft.com.

| Event | What happens |
| --- | --- |
| Pull request | Build, `npm run check` and the accessibility scan. Nothing is uploaded. |
| Push to `main` | Production build (`npm run build:prod`), then upload to the live site. |
| Manual run (Actions → Build and deploy → Run workflow) | Same as a push to `main`. |

The production build fails while any open value (`[JUSTIN TO SET]` and similar) is still rendered on a page, so placeholders can't reach the live site. Until those are filled in, every deploy stops at the build step and nothing is uploaded.

## One-time setup

In the repo: Settings → Environments → `production` → Environment secrets. Add:

| Secret | Value |
| --- | --- |
| `FTP_SERVER` | the FTP IP from hPanel → Files → FTP Accounts (without `ftp://`) |
| `FTP_USERNAME` | the FTP username from the same page |
| `FTP_PASSWORD` | the FTP password |
| `FTP_SERVER_DIR` | optional. Leave it out to upload into the FTP account's starting folder (`public_html` on Hostinger). |

If FTP over TLS doesn't connect, add a repository variable `FTP_PROTOCOL` set to `ftp`.

Optional: add yourself as a required reviewer on the `production` environment, so each deploy waits for your OK.

## Notes
- The upload only removes files it uploaded before, so it won't touch other files in `public_html`.
- The production `.htaccess` comes in Step 13.
- The form handler's mail settings (`contact-config.php`) live on the server, one level above the web folder. They're never deployed from the repo (Step 11).
