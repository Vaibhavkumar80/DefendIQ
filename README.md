# DefendIQ

AI-assisted phishing & threat detection: **React + Vite** client, **Express** API, **MongoDB** database.
Everything uses free / open-source tooling - no paid APIs.

## Features
- **URL scanner**: 25+ explainable rules (brand impersonation, typosquatting, raw IPs, punycode, risky TLDs, shorteners, redirects, credential words, executable links) + a small local ML scorer + DNS / TLS certificate / RDAP domain-age checks + live threat feeds (OpenPhish, URLhaus).
- **Email analyzer**: headers (SPF/DKIM/DMARC), display-name spoofing, Reply-To mismatch, urgency/credential/money lures, risky attachments, link-text mismatch, every link scanned.
- Accounts (email + password, optional Google sign-in), password reset, history, alerts, dashboard analytics, protection score, reports (CSV / JSON / print-to-PDF), threat intelligence, awareness modules, quiz, phishing simulations, profile + badges, settings, data export and account deletion.
- Landscape DefendIQ intro as a site-wide background, with the complete original-color source frame and PixVerse watermark visible over soft blurred side-fill; a live URL scanner on the home page, scroll reveals, hover effects, light/dark themes, responsive layouts.
- Public scanning works without an account ("No registration required"); sign in to save history.

## Requirements
- Node.js 18.18+ (20+ recommended)
- MongoDB 6+ running locally, **or** a free MongoDB Atlas cluster

## Run it
```powershell
# 1. install dependencies
npm run install:all

# 2. configure the server
Copy-Item server/.env.example server/.env
#    edit server/.env -> set MONGODB_URI and a long random JWT_SECRET:
#    node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 3. (optional, local development only) generate 60 sample scans
$env:DEMO_EMAIL = 'demo@defendiq.local'
$env:DEMO_PASSWORD = '<choose-a-strong-local-password>'
npm run seed

# 4. start API (:5000) and web app (:5173) together
npm run dev
```
Open http://localhost:5173.

### Production (single server)
```powershell
npm run build         # builds client/dist
$env:NODE_ENV = 'production'
npm start             # Express serves API + built client on :5000
```
Set `CLIENT_ORIGIN` to your public URL, `TRUST_PROXY=1` behind a proxy, and serve over HTTPS.

## Try these
| Input | Expected |
|---|---|
| `https://example.com` | Safe |
| `https://bit.ly/abc123` | Suspicious (hidden destination) |
| `https://paypal-secure.com` | Suspicious / malicious (brand impersonation) |
| `http://paypa1-secure-login.xyz/verify/account` | Malicious |
| `https://testsafebrowsing.appspot.com/s/phishing.html` | Malicious (built-in threat-feed test entry) |
| Email tab -> "Load sample phishing email" | Malicious |

## Tests
```powershell
npm test      # detection and security regression tests (no database needed)
```

## Optional integrations (all free)
| Feature | How |
|---|---|
| Google sign-in | Create an OAuth *Web* client in Google Cloud Console, add your origin, set `GOOGLE_CLIENT_ID` (server/.env) and `VITE_GOOGLE_CLIENT_ID` (client/.env) |
| Local AI explanations | Install [Ollama](https://ollama.com), `ollama pull llama3.2`, set `OLLAMA_MODEL=llama3.2`. It only writes a plain-English summary; it never changes a score |
| Password-reset email | Configure `SMTP_*`; reset links and tokens are never written to server logs |
| Footer social icons | `VITE_SOCIAL_GITHUB` etc. in client/.env |

## Security notes
- bcrypt (cost 12), JWT in an `httpOnly` `SameSite=Lax` cookie, Helmet + CSP (production), CORS locked to `CLIENT_ORIGIN`, CSRF guard (custom header), rate limiting (global, auth, scans), zod validation on every input, NoSQL-injection hardening (`sanitizeFilter`), generic error messages, CSV formula-injection protection.
- Network checks are SSRF-safe: hosts resolving to private/internal IPs are never contacted; only a TLS handshake and a public RDAP lookup are made - no page content is fetched.
- Email bodies are analysed in memory and **not stored** (only sender, subject and findings are saved).

## Honest limitations
- Detection is heuristic. The "ML" scorer's weights are hand-tuned, not trained on a dataset, and no system catches everything. Treat results as one layer of defence.
- Threat feeds need internet access and have their own terms of use (OpenPhish's free feed is for non-commercial use); check before commercial deployment.
- Domain age depends on the public RDAP service being reachable; otherwise it shows "Unknown".
- The vector logo is a re-creation of your original so it can be animated; the original file is kept at `client/public/logo-original.jpg`.
- Alerts refresh periodically; dashboard activity is derived from saved scans. There is no Socket.IO push service or separate audit-log module in the current project.
- Demo seeding is disabled in production and requires explicit local credentials. Do not seed sample data into a production database.
- For a Vercel frontend with a Render API, proxy `/api` through Vercel or use a same-site custom domain. The current `SameSite=Lax` session cookie is not suitable for direct cross-site browser API calls.

## Project layout
```
client/   React + Vite app (src/pages, src/components, src/styles)
server/   Express API (src/routes, src/services, src/models), tests in server/tests
```
