# Operation Amelie ♡

An entire interactive love-story website, lovingly made by Abhi for Amelie. It includes a talking kitten called **Abmelie**, a mischievous runaway "No" button, the *real* story of the Volksfest meeting, a gym quiz, a love potion game, dinner invitation, date booking, a private admin dashboard, a sweet name-meaning quiz, and a finale with an interactive cat.

**No dependencies, no build step, no API keys, no subscription required for local use.** Requires Node.js 20 or newer.

## Run locally

1. Install Node.js 20+ if needed.
2. Unzip the project. Open a terminal *inside* `operation-amelie`.
3. Start the server with your own admin password:

**macOS / Linux:**

```bash
ADMIN_PASSWORD='choose-a-long-private-password' npm start
```

**Windows PowerShell:**

```powershell
$env:ADMIN_PASSWORD = 'choose-a-long-private-password'
npm start
```

4. Open `http://localhost:3000` to see Amelie's adventure.
5. Open `http://localhost:3000/admin` to see your **private bookings dashboard**. Log in with the password you chose.

Do not double-click `public/index.html` or serve with a *static-only* host. The booking form sends requests to the Node server, which must be running to save dates.

## Where does her dinner date get saved?

Bookings are stored persistently in `data/bookings.json` on the **server**, not just in her browser. They appear at `/admin` after you log in. Each entry has a date, time, optional note, creation time, and status. You can mark bookings as completed/cancelled. The dashboard is private and uses a signed, HttpOnly session cookie. Keep the password to yourself.

This project deliberately does **not** send emails by default. The date is visible by visiting `/admin`. If you want notifications, add an email provider separately.

**Important for deployment:** Use a hosting provider with *persistent storage* (such as a VPS or persistent disk). On Render, add a Disk mounted at `/var/data`; the app automatically saves bookings to `/var/data/bookings.json` there. Platforms with ephemeral or read-only filesystems can **lose** bookings after restarts/deploys if no persistent disk is attached. You can choose another persistent location with `DATA_DIR=/absolute/persistent/path`. Back up this directory. The site needs a running Node process; a simple static Netlify/GitHub Pages deployment will **not** save bookings.

For a public deployment, use HTTPS and set `COOKIE_SECURE=true`. Keep `ADMIN_PASSWORD` in the host's environment variables. Do not put it in frontend JavaScript or a public Git repository. Consider access limits/CAPTCHA if you share the link widely; the date endpoint is intentionally public so Amelie can submit it.

## Personalize it

- **The true story:** The Volksfest chapter specifically says Abhi planned to attend with Amelie's friend, who said she was bringing a girl named Amelie. Find that section in `public/index.html` if you want to add more details.
- **Cat's name:** The baby kitten is `Abmelie` (Abhi + Amelie). Rename text and assets if you like.
- **Color palette:** Edit `:root` at the start of `public/styles.css`. Amelie's green is the main theme.
- **Name-meaning riddle:** In `public/app.js`, find `const accepted`. Currently it accepts “brave,” “fearless,” “bold,” and synonyms. Update those and the accompanying hints if you have a particular family meaning for Abhi's name. Name meanings vary by language and tradition.
- **Booking times:** Edit `<select id="timeInput">` in `public/index.html`.
- **Poem and love letter:** Edit the finale section in `public/index.html` to add personal references only the two of you will understand.
- **Kitten:** `public/cat.svg` is original vector artwork; you may edit its colors/shape.
- **Sound:** A small synthesized melody plays only if Amelie turns on the sound toggle. There is no autoplay.

## Project files

```text
operation-amelie/
  server.js            Node.js server and booking API
  package.json         Start/test scripts (no external packages)
  public/index.html    The interactive story
  public/styles.css    Design, illustrations, animations
  public/app.js        Games, cat, confetti, date form
  public/cat.svg       Custom kitten artwork
  public/favicon.svg   Love-heart icon
  public/admin.html    Private dashboard page
  public/admin.css     Dashboard design
  public/admin.js      Dashboard interface
  data/                Persistent bookings (private; never served)
  tests/               Backend tests
```

## Hosting notes

A standard Linux VPS running Node.js behind a reverse proxy such as Caddy (HTTPS) is a straightforward path. Set environment variables `ADMIN_PASSWORD`, optionally `PORT`, `DATA_DIR`, and `COOKIE_SECURE=true`. Point the domain at your server. Make sure the app's data directory is writable and included in backups. Share the homepage link with Amelie, **not** the admin password.

## Privacy and security

- User-submitted notes are displayed with `textContent`, not as HTML.
- Admin booking data is only available after login.
- No third-party trackers, photos, APIs, analytics, or external fonts are loaded.
- No sensitive information is required from Amelie.
- The app uses signed sessions that expire after 12 hours. Server restarts also log the admin out.

Made with love. ♡
