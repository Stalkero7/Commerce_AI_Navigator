// =====================================================
// CONTENT.JS - Commerce AI Navigator
// Site-aware scraper with dynamic DOM support
// Supports: Amazon, MercadoLibre, eBay, AliExpress + generic fallback
// =====================================================

console.log('🚀 Content script loading...');

// =====================================================
// SITE-SPECIFIC SELECTORS
// Each entry defines how to locate product containers
// and extract name, price, image and link on that site.
// =====================================================

const SITES = {
    amazon: {
        detect:    () => /amazon\.(com|es|com\.mx|com\.br|co\.uk|de|fr|it|ca|com\.au)/.test(location.hostname),
        container: ['[data-component-type="s-search-result"]', '.s-result-item[data-asin]', '.sg-col-inner .s-widget-container'],
        name:      ['h2 .a-link-normal span', 'h2 span.a-text-normal', '.a-size-medium.a-color-base'],
        price:     ['.a-price .a-offscreen', '.a-price-whole', 'span.a-price'],
        image:     ['img.s-image', '.s-product-image-container img'],
        link:      ['h2 a.a-link-normal', 'a.a-link-normal[href*="/dp/"]'],
        baseURL:   () => `https://www.amazon.${location.hostname.split('.').slice(1).join('.')}`
    },

    mercadolibre: {
        detect:    () => /mercadolibre\.|mercadopago\./.test(location.hostname),
        container: ['.ui-search-result__wrapper', '.andes-card.poly-card', 'li.ui-search-layout__item', '.ui-search-result'],
        name:      ['.poly-component__title', '.ui-search-item__title', 'h3.ui-search-item__title', 'a.poly-component__title'],
        price:     ['.andes-money-amount__fraction', '.price-tag-fraction', '.ui-search-price__second-line .andes-money-amount__fraction', 'span.andes-money-amount'],
        image:     ['img.poly-component__picture', 'img.ui-search-result-image__element', '.ui-search-result-image img'],
        link:      ['a.poly-component__title', 'a.ui-search-link', '.ui-search-result__content a'],
        baseURL:   () => ''
    },

    ebay: {
        detect:    () => /ebay\./.test(location.hostname),
        container: ['.s-item:not(.s-item--placeholder)', '.srp-results .s-item'],
        name:      ['.s-item__title', 'h3.s-item__title'],
        price:     ['.s-item__price', '.notranslate'],
        image:     ['.s-item__image-img', 'img.s-item__image-img'],
        link:      ['.s-item__link', 'a.s-item__link'],
        baseURL:   () => ''
    },

    aliexpress: {
        detect:    () => /aliexpress\./.test(location.hostname),
        container: ['a.search-card-item', '.list--gallery--C2f2tvm > div', '[class*="search-card"]', '[class*="SearchCards"]'],
        name:      ['h3[class*="title"]', '[class*="title--wFj3A"]', 'span[class*="title"]', 'a > div > div:first-child'],
        price:     ['[class*="price--"][class*="sale"]', 'div[class*="price"] strong', '[class*="Manhattan--price"]'],
        image:     ['img[class*="images--item"]', 'img[src*="alicdn.com"]', 'img[lazy]'],
        link:      ['a.search-card-item', 'a[href*="/item/"]'],
        baseURL:   () => 'https://www.aliexpress.com'
    }
};

// =====================================================
// SITE DETECTION
// =====================================================

function detectSite() {
    for (const [name, config] of Object.entries(SITES)) {
        if (config.detect()) {
            console.log(`🌐 Site detected: ${name}`);
            return { name, config };
        }
    }
    console.log('🌐 Generic site — using fallback scraper');
    return null;
}

// =====================================================
// DOM OBSERVER
// Waits for product container elements to appear after
// the page's JavaScript has finished rendering.
// =====================================================

function waitForElements(selectors, timeout = 8000) {
    return new Promise((resolve) => {
        const selectorStr = Array.isArray(selectors) ? selectors.join(', ') : selectors;

        // Elements may already be present
        const existing = document.querySelectorAll(selectorStr);
        if (existing.length > 0) {
            console.log(`✅ Elements already present: ${existing.length}`);
            resolve(existing);
            return;
        }

        console.log(`⏳ Waiting for elements: ${selectorStr}`);

        const observer = new MutationObserver(() => {
            const elements = document.querySelectorAll(selectorStr);
            if (elements.length > 0) {
                console.log(`✅ Elements found after DOM mutation: ${elements.length}`);
                observer.disconnect();
                clearTimeout(timer);
                resolve(elements);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        const timer = setTimeout(() => {
            observer.disconnect();
            const elements = document.querySelectorAll(selectorStr);
            console.log(`⏰ Timeout reached. Elements found: ${elements.length}`);
            resolve(elements);
        }, timeout);
    });
}

// =====================================================
// SELECTOR HELPERS
// =====================================================

function getText(el, selectors) {
    for (const sel of selectors) {
        const found = el.querySelector(sel);
        if (found) {
            const text = (found.textContent || found.innerText || '').trim();
            if (text.length > 1) return text;
        }
    }
    return '';
}

function getSrc(el, selectors) {
    for (const sel of selectors) {
        const found = el.querySelector(sel);
        if (found) return found.src || found.getAttribute('data-src') || found.getAttribute('data-lazy-src') || '';
    }
    return '';
}

function getHref(el, selectors, baseURL = '') {
    if (el.tagName === 'A') return el.href || '';
    for (const sel of selectors) {
        const found = el.querySelector(sel);
        if (found) {
            const href = found.href || found.getAttribute('href') || '';
            if (href.startsWith('http')) return href;
            if (href.startsWith('/')) return baseURL + href;
        }
    }
    return '';
}

// =====================================================
// SITE-SPECIFIC SCRAPER
// =====================================================

async function scrapeSite(site, keywords = '') {
    const { name, config } = site;
    console.log(`🔍 Scraping ${name}...`);

    const containers = await waitForElements(config.container);

    if (containers.length === 0) {
        console.log(`⚠️ No containers found on ${name}`);
        return [];
    }

    const products   = [];
    const seen       = new Set();
    const baseURL    = config.baseURL();

    for (const container of containers) {
        if (products.length >= 25) break;

        try {
            // Skip skeleton / placeholder elements
            const classes = container.className || '';
            if (/placeholder|skeleton|ghost/.test(classes)) continue;

            const name_ = getText(container, config.name);
            if (!name_ || name_.length < 5) continue;

            // Keyword filter
            if (keywords) {
                const words = keywords.toLowerCase().split(' ').filter(w => w.length > 2);
                if (!words.some(w => name_.toLowerCase().includes(w))) continue;
            }

            const key = name_.toLowerCase().trim();
            if (seen.has(key)) continue;
            seen.add(key);

            products.push({
                nombre: name_,
                precio: getText(container, config.price) || 'Not specified',
                imagen: getSrc(container, config.image),
                enlace: getHref(container, config.link, baseURL),
                url:    window.location.href,
                site:   name
            });

            console.log(`  ✅ ${products.length}: ${name_.substring(0, 45)}`);
        } catch (e) { /* skip malformed elements */ }
    }

    console.log(`📦 ${name}: ${products.length} products extracted`);
    return products;
}

// =====================================================
// GENERIC FALLBACK SCRAPER
// Used when no site-specific config matches.
// =====================================================

async function scrapeGeneric(keywords = '') {
    console.log('🔍 Using generic scraper...');

    const candidates = document.querySelectorAll('div, article, li, section');
    const products   = [];
    const seen       = new Set();
    let   count      = 0;

    for (const el of candidates) {
        if (count >= 25) break;

        try {
            const hasImage  = el.querySelector('img') !== null;
            const hasLink   = el.querySelector('a') !== null;
            const text      = el.textContent || '';
            const hasText   = text.length > 20;
            const isWrapper = el.children.length >= 2;

            if (!(hasImage && hasLink && hasText && isWrapper)) continue;

            if (keywords) {
                const words = keywords.toLowerCase().split(' ').filter(w => w.length > 2);
                if (!words.some(w => text.toLowerCase().includes(w))) continue;
            }

            const heading = el.querySelector('h1,h2,h3,h4,h5,h6');
            let name_ = heading ? heading.textContent.trim() : '';

            if (!name_) {
                for (const span of el.querySelectorAll('span,div')) {
                    const t = span.textContent.trim();
                    if (t.length > 10 && t.length < 200 && !t.includes('\n')) { name_ = t; break; }
                }
            }

            if (!name_ || name_.length < 5) continue;

            const key = name_.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);

            const priceMatch = text.match(/[\$€£S\/\.]\s*\d[\d,.]+/);
            const img        = el.querySelector('img');
            const anchor     = el.querySelector('a');

            products.push({
                nombre: name_,
                precio: priceMatch ? priceMatch[0] : 'Not specified',
                imagen: img    ? (img.src || img.getAttribute('data-src') || '') : '',
                enlace: anchor ? anchor.href : '',
                url:    window.location.href,
                site:   'generic'
            });
            count++;
        } catch (e) { /* ignore */ }
    }

    console.log(`📦 Generic scraper: ${products.length} products`);
    return products;
}

// =====================================================
// MAIN EXTRACTION FUNCTION
// =====================================================

async function extractProducts(keywords = '') {
    console.log(`🚀 Starting extraction | keywords: "${keywords}"`);

    const site = detectSite();
    let products = [];

    // Try site-specific scraper first
    if (site) products = await scrapeSite(site, keywords);

    // Fallback to generic scraper
    if (products.length === 0) {
        console.log('⚠️ Site-specific scraper returned nothing — trying generic...');
        products = await scrapeGeneric(keywords);
    }

    // Retry without keyword filter if still empty
    if (products.length === 0 && keywords) {
        console.log('⚠️ No results with keyword filter — retrying without filter...');
        products = site ? await scrapeSite(site, '') : await scrapeGeneric('');
    }

    console.log(`✅ Final total: ${products.length} products`);
    return products;
}

// =====================================================
// MESSAGE LISTENER
// Receives requests from popup.js via chrome.tabs.sendMessage
// =====================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extraerProductos') {
        const keywords = request.palabrasClave || '';

        extractProducts(keywords)
            .then(products => {
                sendResponse({
                    success:  true,
                    productos: products,
                    pageTitle: document.title,
                    url:       window.location.href
                });
            })
            .catch(error => {
                console.error('❌ Extraction error:', error);
                sendResponse({ success: false, error: error.message, productos: [] });
            });

        return true; // Keep the message channel open for async response
    }
});

console.log('✅ Content script loaded — Commerce AI Navigator');