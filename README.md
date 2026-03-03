# 🔍 Commerce AI Navigator

> A Chrome extension that scrapes product listings from e-commerce pages and delivers AI-powered recommendations — directly inside your browser, in context.

![Status](https://img.shields.io/badge/status-beta-yellow)
![License](https://img.shields.io/badge/license-MIT-blue)
![Manifest](https://img.shields.io/badge/manifest-v3-green)

---

## ✨ What it does

Commerce AI Navigator adds an AI chat panel to any commercial page. You describe what you're looking for, and the extension:

1. Scrapes the current page for product listings (with support for Amazon, MercadoLibre, eBay and AliExpress)
2. Sends the results to OpenAI's API for analysis
3. Returns a curated set of recommendations with product previews, prices and direct links — all inside the popup

---

## 📸 Screenshots

> _Coming soon — demo GIF and screenshots will be added here once the beta stabilises._

---

## 🚀 Installation

This extension is not yet published to the Chrome Web Store. Install it manually in developer mode:

**1. Clone or download the repository**

```bash
git clone https://github.com/Stalkero7/Commerce_AI_Navigator.git
```

**2. Open Chrome extensions**

Go to `chrome://extensions` in your browser.

**3. Enable Developer Mode**

Toggle the switch in the top-right corner of the extensions page.

**4. Load the extension**

Click **"Load unpacked"** and select the folder where you cloned the repo.

**5. Pin it**

Click the puzzle icon in the Chrome toolbar and pin **Buscador Inteligente IA** for easy access.

---

## 🔑 How to get an OpenAI API Key

The extension uses OpenAI's `gpt-3.5-turbo` model to analyse scraped products and generate recommendations. You need your own API key.

1. Go to [platform.openai.com](https://platform.openai.com) and create an account
2. Navigate to **API Keys** → click **Create new secret key**
3. Copy the key (it starts with `sk-`)
4. Open the extension popup, click the **⚙️** icon and paste your key

> Your API key is stored locally in your browser using `chrome.storage.local`. It is never sent to any server other than OpenAI's API directly from your browser.

---

## 🌐 Supported sites

| Site | Status |
|---|---|
| MercadoLibre | ✅ Working |
| eBay | ✅ Working |
| AliExpress | ⚠️ Partial (dynamic content) |
| Amazon | ⚠️ Partial (anti-bot protections) |
| Generic pages | ✅ Fallback scraper |

---

## 🗂 Project structure

```
Commerce_AI_Navigator/
├── manifest.json      # Extension config (Manifest V3)
├── popup.html         # Chat UI
├── popup.js           # Chat logic, OpenAI calls, product card rendering
├── content.js         # Page scraper with site-specific selectors + MutationObserver
├── background.js      # Service worker
├── LICENSE
└── README.md
```

---

## ⚙️ How it works

The extension follows a three-stage flow:

**Stage 1 — Clarify:** If your search query is vague, the AI asks clarifying questions (category, budget, age, etc.) before scraping.

**Stage 2 — Scrape:** `content.js` waits for the page's JavaScript to finish rendering (via `MutationObserver`), then extracts product names, prices, images and links using site-specific CSS selectors.

**Stage 3 — Recommend:** The scraped products are sent to OpenAI, which selects the most relevant ones and returns a structured JSON response. The popup renders each recommendation as a card with image preview, price and a direct link.

---

## 🛠 Tech stack

- Chrome Extensions — Manifest V3
- Vanilla JavaScript (no build step required)
- OpenAI API — `gpt-3.5-turbo`
- MutationObserver for dynamic DOM handling

---

## ⚠️ Known limitations

- Amazon actively detects and blocks browser extensions. Results may be limited or absent on search pages.
- AliExpress uses obfuscated class names that change over time — selectors may need updating.
- The extension requires a paid OpenAI API key. Costs are minimal for personal use (typically under $0.01 per search).

---

## 📄 License

MIT © 2026 [Raul Azocar](https://github.com/Stalkero7) — Chile
