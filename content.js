// =====================================================
// CONTENT.JS V4 - SCRAPER POR SITIO + DOM DINÁMICO
// Soporta: Amazon, MercadoLibre, eBay, AliExpress
// =====================================================

console.log('🚀 Content script V4 iniciando...');

// =====================================================
// SELECTORES ESPECÍFICOS POR SITIO
// =====================================================

const SITIOS = {
    amazon: {
        detectar: () => /amazon\.(com|es|com\.mx|com\.br|co\.uk|de|fr|it|ca|com\.au)/.test(location.hostname),
        contenedor: [
            '[data-component-type="s-search-result"]',
            '.s-result-item[data-asin]',
            '.sg-col-inner .s-widget-container'
        ],
        nombre: ['h2 .a-link-normal span', 'h2 span.a-text-normal', '.a-size-medium.a-color-base'],
        precio: ['.a-price .a-offscreen', '.a-price-whole', 'span.a-price'],
        imagen: ['img.s-image', '.s-product-image-container img'],
        enlace: ['h2 a.a-link-normal', 'a.a-link-normal[href*="/dp/"]'],
        baseURL: () => `https://www.amazon.${location.hostname.split('.').slice(1).join('.')}`
    },

    mercadolibre: {
        detectar: () => /mercadolibre\.|mercadopago\./.test(location.hostname),
        contenedor: [
            '.ui-search-result__wrapper',
            '.andes-card.poly-card',
            'li.ui-search-layout__item',
            '.ui-search-result'
        ],
        nombre: [
            '.poly-component__title',
            '.ui-search-item__title',
            'h3.ui-search-item__title',
            'a.poly-component__title'
        ],
        precio: [
            '.andes-money-amount__fraction',
            '.price-tag-fraction',
            '.ui-search-price__second-line .andes-money-amount__fraction',
            'span.andes-money-amount'
        ],
        imagen: [
            'img.poly-component__picture',
            'img.ui-search-result-image__element',
            '.ui-search-result-image img'
        ],
        enlace: ['a.poly-component__title', 'a.ui-search-link', '.ui-search-result__content a'],
        baseURL: () => ''
    },

    ebay: {
        detectar: () => /ebay\./.test(location.hostname),
        contenedor: [
            '.s-item:not(.s-item--placeholder)',
            '.srp-results .s-item'
        ],
        nombre: ['.s-item__title', 'h3.s-item__title'],
        precio: ['.s-item__price', '.notranslate'],
        imagen: ['.s-item__image-img', 'img.s-item__image-img'],
        enlace: ['.s-item__link', 'a.s-item__link'],
        baseURL: () => ''
    },

    aliexpress: {
        detectar: () => /aliexpress\./.test(location.hostname),
        contenedor: [
            'a.search-card-item',
            '.list--gallery--C2f2tvm > div',
            '[class*="search-card"]',
            '[class*="SearchCards"]'
        ],
        nombre: [
            'h3[class*="title"]',
            '[class*="title--wFj3A"]',
            'span[class*="title"]',
            'a > div > div:first-child'
        ],
        precio: [
            '[class*="price--"][class*="sale"]',
            'div[class*="price"] strong',
            '[class*="Manhattan--price"]'
        ],
        imagen: ['img[class*="images--item"]', 'img[src*="alicdn.com"]', 'img[lazy]'],
        enlace: ['a.search-card-item', 'a[href*="/item/"]'],
        baseURL: () => 'https://www.aliexpress.com'
    }
};

// =====================================================
// DETECTAR SITIO ACTUAL
// =====================================================

function detectarSitio() {
    for (const [nombre, config] of Object.entries(SITIOS)) {
        if (config.detectar()) {
            console.log(`🌐 Sitio detectado: ${nombre}`);
            return { nombre, config };
        }
    }
    console.log('🌐 Sitio genérico (usando scraper universal)');
    return null;
}

// =====================================================
// ESPERAR A QUE APAREZCAN ELEMENTOS EN EL DOM
// =====================================================

function esperarElementos(selectores, timeout = 8000) {
    return new Promise((resolve) => {
        const selectorString = Array.isArray(selectores) ? selectores.join(', ') : selectores;

        // Revisar si ya están presentes
        const existentes = document.querySelectorAll(selectorString);
        if (existentes.length > 0) {
            console.log(`✅ Elementos ya presentes: ${existentes.length}`);
            resolve(existentes);
            return;
        }

        console.log(`⏳ Esperando elementos: ${selectorString}`);

        const observer = new MutationObserver(() => {
            const elementos = document.querySelectorAll(selectorString);
            if (elementos.length > 0) {
                console.log(`✅ Elementos detectados tras mutación: ${elementos.length}`);
                observer.disconnect();
                clearTimeout(timer);
                resolve(elementos);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        const timer = setTimeout(() => {
            observer.disconnect();
            const elementos = document.querySelectorAll(selectorString);
            console.log(`⏰ Timeout. Elementos encontrados: ${elementos.length}`);
            resolve(elementos);
        }, timeout);
    });
}

// =====================================================
// OBTENER TEXTO CON MÚLTIPLES SELECTORES
// =====================================================

function obtenerTexto(elemento, selectores) {
    for (const sel of selectores) {
        const el = elemento.querySelector(sel);
        if (el) {
            const texto = (el.textContent || el.innerText || '').trim();
            if (texto.length > 1) return texto;
        }
    }
    return '';
}

function obtenerAtributo(elemento, selectores, atributo) {
    for (const sel of selectores) {
        const el = elemento.querySelector(sel);
        if (el) {
            const valor = el.getAttribute(atributo) || '';
            if (valor) return valor;
        }
    }
    return '';
}

function obtenerSrc(elemento, selectores) {
    for (const sel of selectores) {
        const el = elemento.querySelector(sel);
        if (el) {
            return el.src || el.getAttribute('data-src') || el.getAttribute('data-lazy-src') || '';
        }
    }
    return '';
}

function obtenerHref(elemento, selectores, baseURL = '') {
    // Si el contenedor mismo es un <a>
    if (elemento.tagName === 'A') {
        return elemento.href || '';
    }
    for (const sel of selectores) {
        const el = elemento.querySelector(sel);
        if (el) {
            const href = el.href || el.getAttribute('href') || '';
            if (href.startsWith('http')) return href;
            if (href.startsWith('/')) return baseURL + href;
        }
    }
    return '';
}

// =====================================================
// SCRAPER ESPECÍFICO POR SITIO
// =====================================================

async function scrapearSitioEspecifico(sitio, palabrasClave = '') {
    const { nombre: nombreSitio, config } = sitio;
    console.log(`🔍 Scrapeando ${nombreSitio}...`);

    // Esperar a que los contenedores de producto aparezcan
    const contenedores = await esperarElementos(config.contenedor);

    if (contenedores.length === 0) {
        console.log(`⚠️ No se encontraron contenedores en ${nombreSitio}`);
        return [];
    }

    const productos = [];
    const nombresVistos = new Set();
    const baseURL = config.baseURL();

    for (const contenedor of contenedores) {
        if (productos.length >= 25) break;

        try {
            // Ignorar placeholders o skeletons
            const clases = contenedor.className || '';
            if (clases.includes('placeholder') || clases.includes('skeleton') || clases.includes('ghost')) continue;

            const nombre = obtenerTexto(contenedor, config.nombre);
            if (!nombre || nombre.length < 5) continue;

            // Filtrar por palabras clave si las hay
            if (palabrasClave) {
                const palabras = palabrasClave.toLowerCase().split(' ').filter(p => p.length > 2);
                const textoLower = nombre.toLowerCase();
                const coincide = palabras.some(p => textoLower.includes(p));
                if (!coincide) continue;
            }

            const nombreNorm = nombre.toLowerCase().trim();
            if (nombresVistos.has(nombreNorm)) continue;
            nombresVistos.add(nombreNorm);

            const precio = obtenerTexto(contenedor, config.precio) || 'No especificado';
            const imagen = obtenerSrc(contenedor, config.imagen);
            const enlace = obtenerHref(contenedor, config.enlace, baseURL);

            productos.push({
                nombre,
                precio,
                imagen,
                enlace,
                url: window.location.href,
                sitio: nombreSitio
            });

            console.log(`  ✅ ${productos.length}: ${nombre.substring(0, 45)}`);
        } catch (e) {
            // ignorar elemento con error
        }
    }

    console.log(`📦 ${nombreSitio}: ${productos.length} productos extraídos`);
    return productos;
}

// =====================================================
// SCRAPER GENÉRICO (fallback para otros sitios)
// =====================================================

async function scrapearGenerico(palabrasClave = '') {
    console.log('🔍 Usando scraper genérico...');

    const candidatos = document.querySelectorAll('div, article, li, section');
    const productos = [];
    const nombresVistos = new Set();
    let contador = 0;

    for (const el of candidatos) {
        if (contador >= 25) break;

        try {
            const tieneImagen = el.querySelector('img') !== null;
            const tieneEnlace = el.querySelector('a') !== null;
            const texto = el.textContent || '';
            const tieneTexto = texto.length > 20;
            const esContenedor = el.children.length >= 2;
            const patronPrecio = /[\$€£S\/\.]?\s*\d[\d,.]+/;
            const tienePrecio = patronPrecio.test(texto);

            if (!(tieneImagen && tieneEnlace && tieneTexto && esContenedor)) continue;

            if (palabrasClave) {
                const palabras = palabrasClave.toLowerCase().split(' ').filter(p => p.length > 2);
                const textoLower = texto.toLowerCase();
                const coincide = palabras.some(p => textoLower.includes(p));
                if (!coincide) continue;
            }

            const heading = el.querySelector('h1,h2,h3,h4,h5,h6');
            let nombre = heading ? heading.textContent.trim() : '';

            if (!nombre) {
                for (const span of el.querySelectorAll('span,div')) {
                    const t = span.textContent.trim();
                    if (t.length > 10 && t.length < 200 && !t.includes('\n')) {
                        nombre = t;
                        break;
                    }
                }
            }

            if (!nombre || nombre.length < 5) continue;

            const nombreNorm = nombre.toLowerCase();
            if (nombresVistos.has(nombreNorm)) continue;
            nombresVistos.add(nombreNorm);

            const precioMatch = texto.match(/[\$€£S\/\.]\s*\d[\d,.]+/);
            const precio = precioMatch ? precioMatch[0] : 'No especificado';
            const img = el.querySelector('img');
            const imagen = img ? (img.src || img.getAttribute('data-src') || '') : '';
            const aEl = el.querySelector('a');
            const enlace = aEl ? aEl.href : '';

            productos.push({ nombre, precio, imagen, enlace, url: window.location.href, sitio: 'genérico' });
            contador++;
        } catch (e) { /* ignorar */ }
    }

    console.log(`📦 Genérico: ${productos.length} productos`);
    return productos;
}

// =====================================================
// FUNCIÓN PRINCIPAL
// =====================================================

async function extraerProductos(palabrasClave = '') {
    console.log(`🚀 Iniciando extracción | palabras: "${palabrasClave}"`);

    const sitio = detectarSitio();

    let productos = [];

    if (sitio) {
        productos = await scrapearSitioEspecifico(sitio, palabrasClave);
    }

    // Fallback al scraper genérico si el específico no encontró nada
    if (productos.length === 0) {
        console.log('⚠️ Scraper específico sin resultados, usando genérico...');
        productos = await scrapearGenerico(palabrasClave);
    }

    // Si aún sin resultados y había filtro, intentar sin filtro
    if (productos.length === 0 && palabrasClave) {
        console.log('⚠️ Sin resultados con filtro, reintentando sin palabras clave...');
        productos = sitio
            ? await scrapearSitioEspecifico(sitio, '')
            : await scrapearGenerico('');
    }

    console.log(`✅ Total final: ${productos.length} productos`);
    return productos;
}

// =====================================================
// ESCUCHAR MENSAJES DESDE POPUP
// =====================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extraerProductos') {
        const palabrasClave = request.palabrasClave || '';

        extraerProductos(palabrasClave)
            .then(productos => {
                sendResponse({
                    success: true,
                    productos,
                    paginaActual: document.title,
                    url: window.location.href
                });
            })
            .catch(error => {
                console.error('❌ Error extracción:', error);
                sendResponse({
                    success: false,
                    error: error.message,
                    productos: []
                });
            });

        return true; // Mantener canal abierto para respuesta async
    }
});

console.log('✅ Content script V4 cargado');