# HighVolt AI

A personal, local-first work assistant for high voltage management: safety &
compliance tracking, crew/job scheduling, technical calculators & reference
library, and general notes/drafts/search — all running on your own laptop,
reachable from your phone over your home Wi-Fi.

**$0 to run.** Everything is free. There are no paid APIs, no cloud hosting, and no
subscriptions. All data is stored locally in a SQLite file on your laptop
(`server/data/highvolt.db`). **Recording transcription runs on
[Google Gemini](https://aistudio.google.com) via your own free API key** (no credit card,
no billing account — just a free-tier key from Google AI Studio) — recording audio leaves
your laptop and goes to Google's servers for this step, unlike everything else in the app.
Summarizing a transcript into to-dos/events afterward stays fully local/free on Ollama (see
"Recordings" below), and "Search Notes" searches your own saved notes, reference library,
and a built-in formula glossary, with no AI involved at all.

## One-time setup

1. Install [Node.js](https://nodejs.org) (LTS version) if you don't already have it.
2. Install [Ollama](https://ollama.com) (free), then pull a model:
   ```
   ollama pull llama3.2:3b
   ```
   Ollama runs in the background automatically after install. This model summarizes a
   recording's transcript and extracts to-dos/events afterward (see "Recordings" below) —
   swap `OLLAMA_MODEL` in `.env` for a different model if you want to try a different
   speed/quality tradeoff. It is unrelated to Gemini, used only for the actual transcription
   step (see next step).
3. Get a free Gemini API key for recording transcription: go to
   [aistudio.google.com/apikey](https://aistudio.google.com/apikey), sign in with any
   Google account, and click "Create API key." **Do not enable billing/upgrade the
   project** — the free tier needs no payment method and this app is designed to stay
   within it. Paste the key into `.env` as `GEMINI_API_KEY` (see step 5).
4. From the `highvolt-ai` folder, install dependencies:
   ```
   npm run install:all
   ```
5. Set your PIN, session secret, and Gemini API key. Open `.env` (created for you
   already, copied from `.env.example`) and edit:
   ```
   PORT=4000
   HIGHVOLT_PIN=1988       <-- change this to your own PIN
   SESSION_SECRET=change-this-to-a-long-random-string   <-- change this too
   GEMINI_API_KEY=         <-- paste your free key from aistudio.google.com here
   ```
   The PIN is what you'll type on your phone/laptop to unlock the app.

## Starting and stopping the app

**Daily use (recommended):**
```
npm start
```
This builds the frontend and starts a single server on port 4000 that serves
everything. Leave the terminal window open while you use the app; press
`Ctrl+C` in that window to stop it.

**While actively making code changes** (auto-reloads on save):
```
npm run dev
```

Either way, once it's running, open **http://localhost:4000** (or
**http://localhost:5173** if using `npm run dev`) on your laptop's own
browser.

## Accessing it from your phone

Your phone and laptop must be on the **same home Wi-Fi network**.

### 1. Find your laptop's local IP address

On Windows, open PowerShell and run:
```
ipconfig
```
Look for the **IPv4 Address** under your active Wi-Fi adapter — it looks
like `192.168.x.x` (for example, `192.168.1.246`).

### 2. Allow the app through Windows Firewall (one-time)

The first time you run `npm start` or `npm run dev`, Windows may pop up a
firewall prompt asking to allow Node.js on private networks — click **Allow
access**. If you don't see the prompt (or dismissed it before), add the rule
manually:

1. Open **Windows Defender Firewall with Advanced Security**.
2. Click **Inbound Rules** → **New Rule...**
3. Choose **Port** → **TCP** → enter ports **4000, 4443** (or **5173** too if
   you use `npm run dev`) → **Allow the connection** → apply to all profiles
   → name it "HighVolt AI".

### 3. Open it on your phone

For most of the app, use plain HTTP:
```
http://<your-laptop-ip>:4000
```
For example: `http://192.168.1.246:4000`

**To record voice memos from your phone**, use HTTPS on port **4443**
instead — browsers only allow microphone access over a secure connection,
and a LAN address like your laptop's IP doesn't qualify unless it's HTTPS:
```
https://<your-laptop-ip>:4443
```
The server generates its own certificate since there's no public domain to
get a real one for — your phone's browser will show a "connection isn't
private" warning the first time. That's expected for a local-only app with
no internet-facing certificate authority; tap **Advanced → Proceed** (wording
varies by browser) to continue. You only need to do this on the HTTPS port;
everything else in the app works fine over plain HTTP on port 4000.

Enter your PIN and you're in. Bookmark whichever URL(s) you use, or add to
your phone's home screen for quick access.

> Your laptop's IP can change if you reconnect to Wi-Fi or restart your
> router. If the phone can no longer reach the app, re-check the IP with
> `ipconfig` and use the new address — the HTTPS certificate regenerates
> itself automatically to match on the next server restart.

## What's inside

- **Dashboard** — overdue inspections, open incidents, and jobs coming up in the next 7 days at a glance.
- **Safety & Compliance** — customizable inspection checklist templates, incident/near-miss logging, and a recurring compliance calendar that flags overdue items.
- **Scheduling** — crew roster with certifications/contact info, job/shift scheduling with list, week, and day calendar views, job completion notes, and (if connected) a read-only **Procore** tab showing the project schedule and today's daily log.
- **Technical Reference** — calculators for Ohm's Law, voltage drop, load calculations, transformer sizing, and power factor, plus a searchable reference library and a quick formula lookup.
- **Email** — a real inbox for your connected Outlook / Microsoft 365 account: read messages and compose/send new ones from inside HighVolt.
- **Assistant** (the app's landing screen) — a **To-Do** list (manual items plus items auto-extracted from recordings you record/upload), a **Recordings** tab to record or upload voice recordings for Gemini-powered transcription and local summarization (see below), **Run Command (Advanced)** (a raw command box for typing exact commands yourself, no AI involved), quick timestamped searchable notes, an email/message drafting tool (copy-and-send yourself — nothing is ever sent automatically), **Search Notes** (a plain local search over your notes, reference library, and formulas, no AI involved), and a **Teams** tab that surfaces recent @mentions from your Microsoft Teams chats.

### Recordings (record or upload → transcript, summary, to-dos, and events)

The **Recordings** tab defaults to recording via your device's own recording app — tap Record New Voice Memo, it
opens your phone's (or laptop's) native recorder, and when you save/finish there it comes straight back into
HighVolt. You can also choose an existing recording file instead (.mp3, .m4a, .wav, .ogg, .webm, .aac, .flac).
Either way it turns into a transcript, an AI summary, to-do items, and scheduled events, all for $0:

1. You record via your device's recorder, or choose a file, from the Recordings tab.
2. It's converted locally (via a bundled `ffmpeg`) to a small MP3, then sent to **Gemini** for transcription
   (long recordings are automatically split into chunks under the hood and stitched back into one transcript, so
   there's no practical length limit). Recording audio leaves your laptop and goes to Google's servers for this
   step.
3. The transcript is fed to your **local Ollama** model to generate a short summary, a list of action items (added
   straight to your To-Do list, tagged with which recording they came from), and any events with a clear date
   mentioned (added to your Jobs schedule, so they show up on the Scheduling calendar and Dashboard). This step
   stays fully local/free, unrelated to Gemini.
4. Click a recording on the Recordings tab to see its summary, the to-dos/events it created, and the full
   transcript.

### Calendar Integrations (Google Calendar & Outlook)

The To-Do screen can show your upcoming events from Google Calendar and/or Outlook (Microsoft 365 / outlook.com)
above your to-do list. There are two ways to connect each one — pick whichever you prefer per calendar.

#### Option A (easiest): a private calendar feed link — no coding, no app registration

Both Google and Microsoft let you generate a private, secret URL that always reflects your calendar — this is the
same mechanism used to subscribe to your calendar from another calendar app, and it's official/sanctioned, not a
workaround. Nothing to register, nothing to authorize in the app itself.

**Google Calendar:**
1. Open [Google Calendar](https://calendar.google.com) in your browser → gear icon → **Settings**.
2. Under "Settings for my calendars", click your calendar → **Integrate calendar**.
3. Copy the **Secret address in iCal format** (ends in `.ics`).
4. Paste it into `.env` as `GOOGLE_ICS_URL`.

**Outlook / Microsoft 365 Calendar:**
1. Open [Outlook Calendar](https://outlook.office.com/calendar) in your browser → gear icon → **View all Outlook
   settings** → **Calendar** → **Shared calendars**.
2. Under "Publish a calendar", pick your calendar, permission **Can view all details**, click **Publish**.
3. Copy the **ICS** link it gives you.
4. Paste it into `.env` as `MS_ICS_URL`.

Restart the server after either one — no further setup, no "Connect" button to click, no token to expire. Treat
these URLs like a password (anyone with the link can read your calendar), but they can't write/change anything,
and you can regenerate/revoke them any time from the same settings page if needed.

#### Option B: a real OAuth app (more setup, but revocable per-app and doesn't rely on a secret link)

Neither Google nor Microsoft allow logging in with just an email/password for API access — this
path means registering a free OAuth "app" with each of them yourself (a one-time, few-minutes setup), then pasting
the credentials it gives you into `.env`. HighVolt AI handles the rest (the sign-in flow, refreshing access
automatically, and pulling events).

**Google Calendar:**
1. Go to the [Google Cloud Console](https://console.cloud.google.com/), create a project (any name).
2. Enable the **Google Calendar API** (APIs & Services → Library → search "Google Calendar API" → Enable).
3. Go to APIs & Services → Credentials → **Create Credentials → OAuth client ID**.
   - If prompted, configure the OAuth consent screen first: choose **External**, fill in the required fields (app
     name, your email), and add your own Google account as a **test user** — you can leave it in "Testing" mode,
     no Google review needed for personal use.
   - Application type: **Web application**.
   - Authorized redirect URI: `http://localhost:4000/api/calendar/google/callback` (change the port if your
     `PORT` in `.env` isn't 4000).
4. Copy the generated **Client ID** and **Client secret** into `.env` as `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

**Outlook / Microsoft 365 Calendar:**
1. Go to the [Azure Portal](https://portal.azure.com/) → **App registrations** → **New registration**.
2. Name it anything. Under "Supported account types" choose **Accounts in any organizational directory and
   personal Microsoft accounts** (so it works with a plain outlook.com/hotmail account too).
3. Redirect URI: platform **Web**, value `http://localhost:4000/api/calendar/outlook/callback` (adjust the port
   to match `PORT` in `.env`).
4. After creating it, copy the **Application (client) ID** into `.env` as `MS_CLIENT_ID`.
5. Go to **Certificates & secrets → New client secret**, create one, and copy its **value** (not the secret ID)
   into `.env` as `MS_CLIENT_SECRET`.
6. Go to **API permissions → Add a permission → Microsoft Graph → Delegated permissions**, add `Calendars.Read`,
   `Mail.Read`, and `offline_access`, then click **Grant admin consent** (or just proceed — for a personal
   Microsoft account you'll grant consent yourself in the next step anyway). `Mail.Read` is what powers the
   Plaud-recordings-by-email feature below, even if you don't care about the Outlook calendar sync itself.

Once either (or both) are filled in, restart the server, open the app on your laptop's own browser, and click
**Connect Google Calendar** / **Connect Outlook** on the To-Do screen — you'll be sent to Google's/Microsoft's own
sign-in and consent page, then back to the app. Do this from the laptop itself (not your phone), since the
redirect URI is fixed to `localhost`. Tokens are stored locally in the SQLite database and refreshed
automatically; there's nothing further to run. If you'd already connected Outlook before adding the `Mail.Read`
permission above, click **Connect Outlook** again to re-consent — the old connection won't have mail access.

### Plaud Recordings by Email

If your Plaud app can email a recording to you, the Recordings tab can watch a connected Outlook inbox and
automatically pull in any email with **"plaud" in the subject and an audio attachment** — no manual upload needed.
It checks every 5 minutes (or tap "Check now" on the Recordings tab), downloads the attachment, and runs it
through the same pipeline as a manual upload (Gemini transcription, local summarization, to-dos/events).

Requires Outlook to be connected with the `Mail.Read` permission (see the Outlook setup above — steps 1-6, using
the *same* Azure app as the calendar integration if you already set one up, just add `Mail.Read` to it). The
subject match defaults to "plaud"; override it with `PLAUD_EMAIL_SUBJECT` in `.env` if you want something else.
Only emails already in the inbox when the check runs are picked up once each — reprocessing the same email twice
won't happen even if you leave it unread.

### Email Tab (read and send from your Outlook inbox)

The **Email** page shows your Outlook / Microsoft 365 inbox and lets you compose and send new messages — it uses
the same Azure OAuth app as the calendar/Plaud integrations above, plus two more delegated permissions:
`Mail.Read` (already needed for Plaud) and `Mail.Send`. If you connected Outlook before this feature existed,
open the Email tab and click **Connect Outlook** again to re-consent with the new permission. Sending is a plain
new message (not threaded replies) — reply context (quoting, "Re:" subject, etc.) isn't automatic, type it in
yourself. Message bodies are sanitized before display, since email HTML can otherwise carry scripts.

### Teams @Mentions

The **Teams** tab (inside Assistant) lists recent messages that mention you across your most-active Microsoft
Teams chats, so you don't have to keep Teams open to catch them. It reuses the same Outlook/Microsoft connection
with one more permission: `Chat.Read`. Re-connect via the Teams tab's **Connect Outlook** button if you connected
before this was added. Two things it does *not* do: surface channel (as opposed to chat) messages — those need
extra admin-consented Graph permissions most personal/work accounts don't have — or notify you proactively; it's
a pull, check-when-you-look feature, not a push notification.

### Procore Integration (read-only schedule & daily logs)

The Scheduling page's **Procore** tab shows your project's schedule tasks and today's daily log, read-only —
nothing is written back to Procore. Setup (free, but requires your own Procore account with API access):

1. Go to the [Procore Developer Portal](https://developers.procore.com), sign in with your Procore account, and
   register a new OAuth app (any name).
2. Set its redirect URI to `http://localhost:4000/api/procore/callback` (adjust the port if your `PORT` in `.env`
   isn't 4000).
3. Copy the generated **Client ID** and **Client Secret** into `.env` as `PROCORE_CLIENT_ID` / `PROCORE_CLIENT_SECRET`.
4. Find your company and project's numeric IDs (visible in the URL when viewing the project in Procore's web app,
   e.g. `.../companies/12345/projects/67890`) and paste them into `.env` as `PROCORE_COMPANY_ID` / `PROCORE_PROJECT_ID`.
5. Restart the server, open Scheduling > Procore, and click **Connect Procore**.

Procore's API varies by plan and account, and this was built without a live Procore account to test against, so
the schedule/daily-log endpoints in `server/lib/procore.js` may need small adjustments (field names, endpoint
paths) to match what your Procore instance actually returns — check the error message on the Procore tab if
nothing shows up, and compare against your Procore API access to see what needs tweaking.

## Data & backups

All data lives in `server/data/highvolt.db` (a single SQLite file). To back
up your data, just copy that file somewhere safe. To start fresh, stop the
app and delete it — a new empty database will be created automatically next
time you start the app.

## Security notes

- A PIN is required to use the app from any device on your network. Anyone
  on your home Wi-Fi who knows the PIN can access it — don't reuse a PIN you
  use elsewhere, and change it any time in `.env`.
- This app is designed for your home network only. Do not forward port 4000
  through your router to the public internet.
- **Command execution (important):** "Run Command (Advanced)" executes real
  shell commands on your laptop — immediately, with no confirmation step, no
  sandboxing, and no allowlist. This was built this way at explicit request.
  In practice this means **anyone who has your PIN has full remote control of
  this laptop**,
  from their phone or otherwise, for as long as the app is running. There is
  login rate-limiting (5 wrong PIN attempts locks that device out for 60
  seconds) to slow down guessing, but a weak/short PIN is still the only
  thing standing between "on your home Wi-Fi" and "runs anything on your
  computer." Use a longer PIN/passphrase than the default if you keep this
  feature enabled, and remember every command you run is logged (with its
  output) in `command_log` inside the SQLite database for your own review.
- **Email tab:** message bodies from your inbox are sanitized before display
  (scripts/handlers stripped) so a malicious email can't run code in the
  app's session. Sending uses your connected Outlook account directly —
  anyone with your PIN can send email as you while the app is running, same
  as the existing "anyone with your PIN controls this laptop" tradeoff above.
