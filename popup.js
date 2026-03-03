// =====================================================
// POPUP.JS - Commerce AI Navigator
// Locale-aware chat with product card rendering
// =====================================================

const chatDiv       = document.getElementById('chat');
const inputField    = document.getElementById('entrada');
const sendBtn       = document.getElementById('enviar');
const configModal   = document.getElementById('configModal');
const configBtn     = document.getElementById('configBtn');
const apiKeyInput   = document.getElementById('apiKeyInput');
const saveBtn       = document.getElementById('saveBtn');
const deleteBtn     = document.getElementById('deleteBtn');
const cancelBtn     = document.getElementById('cancelBtn');
const apiStatus     = document.getElementById('apiStatus');

let OPENAI_API_KEY = '';

// Conversation state machine
let conversation = {
    step: 'idle',   // idle | awaiting_category | awaiting_details
    query: '',
    category: '',
    context: '',
    lang: 'English' // human-readable language name derived from browser locale
};

// =====================================================
// LOCALE DETECTION
// Reads navigator.language (e.g. "es-CL", "en-US")
// and maps it to a language name injected into every
// AI prompt. The first welcome message uses this locale;
// all subsequent replies follow whatever the user types.
// =====================================================

const LOCALE_MAP = {
    es: 'Spanish',  en: 'English',  pt: 'Portuguese',
    fr: 'French',   de: 'German',   it: 'Italian',
    zh: 'Chinese',  ja: 'Japanese', ko: 'Korean',
    ar: 'Arabic',   ru: 'Russian',  nl: 'Dutch',
    pl: 'Polish',   tr: 'Turkish',  hi: 'Hindi'
};

function detectLocale() {
    const raw = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
    const tag = raw.split('-')[0];
    return LOCALE_MAP[tag] || 'English';
}

// =====================================================
// WELCOME MESSAGES PER LANGUAGE
// =====================================================

const WELCOME = {
    Spanish:    '👋 ¡Hola! Escribe qué producto buscas y exploraré la página para darte las mejores recomendaciones.',
    English:    "👋 Hi! Tell me what product you're looking for and I'll scan this page to find the best options for you.",
    Portuguese: '👋 Olá! Diga-me o que você está procurando e vou analisar a página para as melhores recomendações.',
    French:     "👋 Bonjour ! Dites-moi quel produit vous cherchez et j'analyserai cette page pour vous.",
    German:     '👋 Hallo! Sagen Sie mir, wonach Sie suchen, und ich durchsuche diese Seite für Sie.',
    Italian:    '👋 Ciao! Dimmi cosa stai cercando e analizzerò questa pagina per te.',
    Chinese:    '👋 你好！告诉我您在寻找什么产品，我将扫描此页面为您提供最佳建议。',
    Japanese:   '👋 こんにちは！探している商品を教えていただければ、このページをスキャンして最適な商品をご提案します。',
    Korean:     '👋 안녕하세요! 찾으시는 상품을 알려주시면 이 페이지에서 최적의 상품을 찾아드리겠습니다。',
    Arabic:     '👋 مرحباً! أخبرني بما تبحث عنه وسأقوم بمسح هذه الصفحة لإيجاد أفضل التوصيات.',
    Russian:    '👋 Привет! Скажите мне, что вы ищете, и я просмотрю эту страницу для лучших рекомендаций.',
    Dutch:      '👋 Hallo! Vertel me wat je zoekt en ik scan deze pagina voor de beste aanbevelingen.',
    Polish:     '👋 Cześć! Powiedz mi, czego szukasz, a przeskanuję tę stronę w poszukiwaniu najlepszych rekomendacji.',
    Turkish:    '👋 Merhaba! Ne aradığınızı söyleyin, bu sayfayı sizin için en iyi önerileri bulmak üzere tarayacağım.',
    Hindi:      '👋 नमस्ते! मुझे बताएं आप क्या खोज रहे हैं और मैं इस पेज को स्कैन करके आपके लिए सर्वोत्तम सुझाव दूंगा।'
};

function getWelcomeMessage(lang) {
    return WELCOME[lang] || WELCOME['English'];
}

// =====================================================
// API KEY MANAGEMENT
// =====================================================

function loadApiKey() {
    chrome.storage.local.get(['openai_api_key'], (result) => {
        if (result.openai_api_key) {
            OPENAI_API_KEY = result.openai_api_key;
            console.log('✅ API key loaded');
            setApiStatus(true);
        } else {
            OPENAI_API_KEY = '';
            setApiStatus(false);
        }
    });
}

function setApiStatus(configured) {
    if (configured) {
        apiStatus.className = 'api-status configured';
        apiStatus.textContent = '✅ API Key configured';
    } else {
        apiStatus.className = 'api-status not-configured';
        apiStatus.textContent = '❌ API Key not configured';
    }
}

function saveApiKey() {
    const key = apiKeyInput.value.trim();
    if (!key)                    { alert('Please enter your API Key'); return; }
    if (!key.startsWith('sk-')) { alert('API Key must start with "sk-"'); return; }

    chrome.storage.local.set({ openai_api_key: key }, () => {
        OPENAI_API_KEY = key;
        configModal.classList.remove('active');
        apiKeyInput.value = '';
        setApiStatus(true);
        addMessage('✅ API Key saved successfully.');
    });
}

function removeApiKey() {
    if (!confirm('Are you sure you want to remove your API Key?')) return;
    chrome.storage.local.remove(['openai_api_key'], () => {
        OPENAI_API_KEY = '';
        configModal.classList.remove('active');
        apiKeyInput.value = '';
        setApiStatus(false);
        addMessage('🗑️ API Key removed.');
    });
}

configBtn.addEventListener('click', () => configModal.classList.add('active'));
cancelBtn.addEventListener('click', () => { configModal.classList.remove('active'); apiKeyInput.value = ''; });
saveBtn.addEventListener('click', saveApiKey);
deleteBtn.addEventListener('click', removeApiKey);
apiKeyInput.addEventListener('keypress', e => { if (e.key === 'Enter') saveApiKey(); });

// =====================================================
// CHAT RENDERING
// =====================================================

function addMessage(text, isUser = false) {
    const div = document.createElement('div');
    div.className = `mensaje ${isUser ? 'usuario' : 'ia'}`;
    div.textContent = text;
    chatDiv.appendChild(div);
    chatDiv.scrollTop = chatDiv.scrollHeight;
}

function renderProductCards(recommendation, originalProducts) {
    const wrapper = document.createElement('div');
    wrapper.className = 'mensaje ia';

    // AI analysis text
    if (recommendation.texto) {
        const textDiv = document.createElement('div');
        textDiv.className = 'recomendacion-texto';
        textDiv.textContent = recommendation.texto;
        wrapper.appendChild(textDiv);
    }

    // Product cards grid
    if (recommendation.productos && recommendation.productos.length > 0) {
        const grid = document.createElement('div');
        grid.className = 'productos-grid';

        recommendation.productos.forEach((item) => {
            // Match back to the scraped product by index or name
            const original = originalProducts[item.indice] ||
                originalProducts.find(p => p.nombre === item.nombre) || {};

            const link  = original.enlace || item.enlace || '';
            const image = original.imagen || '';
            const price = original.precio || item.precio || '';
            const name  = item.nombre   || original.nombre || '';

            const card = document.createElement('div');
            card.className = 'producto-card';

            // Thumbnail
            const imgWrap = document.createElement('div');
            imgWrap.className = 'producto-img-wrap';
            if (image) {
                const img = document.createElement('img');
                img.src   = image;
                img.alt   = name;
                img.className = 'producto-img';
                img.onerror = () => { imgWrap.innerHTML = '<div class="producto-img-placeholder">🛍️</div>'; };
                imgWrap.appendChild(img);
            } else {
                imgWrap.innerHTML = '<div class="producto-img-placeholder">🛍️</div>';
            }
            card.appendChild(imgWrap);

            // Details
            const info = document.createElement('div');
            info.className = 'producto-info';

            const nameEl = document.createElement('p');
            nameEl.className = 'producto-nombre';
            nameEl.textContent = name.length > 60 ? name.substring(0, 57) + '...' : name;
            info.appendChild(nameEl);

            if (item.razon) {
                const reasonEl = document.createElement('p');
                reasonEl.className = 'producto-razon';
                reasonEl.textContent = item.razon;
                info.appendChild(reasonEl);
            }

            if (price && price !== 'No especificado' && price !== 'Not specified') {
                const priceEl = document.createElement('p');
                priceEl.className = 'producto-precio';
                priceEl.textContent = price;
                info.appendChild(priceEl);
            }

            if (link) {
                const btn = document.createElement('a');
                btn.href   = link;
                btn.target = '_blank';
                btn.rel    = 'noopener noreferrer';
                btn.className  = 'producto-btn';
                btn.textContent = 'View product →';
                info.appendChild(btn);
            }

            card.appendChild(info);
            grid.appendChild(card);
        });

        wrapper.appendChild(grid);
    }

    chatDiv.appendChild(wrapper);
    chatDiv.scrollTop = chatDiv.scrollHeight;
}

function showLoading() {
    const div = document.createElement('div');
    div.className = 'mensaje ia';
    div.id = 'loading';
    div.innerHTML = '<div class="cargando"><div class="punto"></div><div class="punto"></div><div class="punto"></div></div>';
    chatDiv.appendChild(div);
    chatDiv.scrollTop = chatDiv.scrollHeight;
}

function hideLoading() {
    const el = document.getElementById('loading');
    if (el) el.remove();
}

// =====================================================
// QUERY ANALYSIS
// =====================================================

function isVagueQuery(query) {
    // Common vague terms across Spanish, English, French, Portuguese, German
    const vagueTerms = [
        'gift', 'product', 'thing', 'item', 'buy', 'something', 'help', 'need', 'want',
        'regalo', 'producto', 'cosa', 'comprar', 'algo', 'busco', 'necesito', 'quiero',
        'cadeau', 'acheter', 'geschenk', 'kaufen', 'presente', 'coisa'
    ];
    const words = query.toLowerCase().split(' ');
    const meaningful = words.filter(w =>
        w.length > 4 &&
        !['para', 'that', 'this', 'what', 'with', 'from', 'pour', 'avec', 'para', 'sobre'].includes(w)
    );
    return meaningful.length < 3;
}

function extractKeywords(text) {
    const stopWords = [
        'el', 'la', 'de', 'que', 'y', 'o', 'es', 'en', 'por', 'para',
        'the', 'and', 'for', 'with', 'from', 'that', 'this', 'are', 'have',
        'le', 'les', 'des', 'une', 'pour', 'avec'
    ];
    return text.toLowerCase().split(' ')
        .filter(w => w.length > 3 && !stopWords.includes(w))
        .slice(0, 5)
        .join(' ');
}

// =====================================================
// OPENAI API CALLS
// Every prompt explicitly states the user's language so
// the model always replies in the right locale.
// =====================================================

async function getSuggestedCategories(query) {
    if (!OPENAI_API_KEY) return null;

    const prompt =
`The user is searching for: "${query}"
Their preferred language is: ${conversation.lang}

Suggest UP TO 3 relevant product categories.
Reply in ${conversation.lang}.
Respond ONLY with the category names, one per line, NO numbers or explanations.`;

    try {
        const res = await callOpenAI(prompt, 100, 0.7);
        if (!res) return null;
        return res.split('\n').map(c => c.trim()).filter(c => c.length > 0 && !/^\d+\./.test(c)).slice(0, 3);
    } catch (e) {
        console.error('Error fetching categories:', e);
        return null;
    }
}

async function getClarifyingQuestions(query, category) {
    if (!OPENAI_API_KEY) return null;

    const prompt =
`The user is searching for: "${query}"
They selected the category: "${category}"
Their preferred language is: ${conversation.lang}

Ask UP TO 2 specific follow-up questions to refine the search (budget, age, brand, special features, etc.).
Reply in ${conversation.lang}.
Respond ONLY with the questions, one per line.`;

    try {
        const res = await callOpenAI(prompt, 150, 0.7);
        if (!res) return null;
        return res.split('\n').filter(q => q.trim().length > 5);
    } catch (e) {
        console.error('Error fetching clarifying questions:', e);
        return null;
    }
}

async function getRecommendations(query, category, context, products) {
    if (!OPENAI_API_KEY) return null;

    const productList = products.map((p, i) =>
        `${i}. "${p.nombre}" | Price: ${p.precio}`
    ).join('\n');

    const prompt =
`You are an expert shopping advisor.
Respond ONLY with a valid JSON object — no extra text, no markdown backticks.

SEARCH: "${query}"
CATEGORY: "${category || 'General'}"${context ? `\nCONTEXT: ${context}` : ''}
USER LANGUAGE: ${conversation.lang}

AVAILABLE PRODUCTS (index. name | price):
${productList || 'No products scraped from this page'}

Return this exact JSON:
{
  "texto": "2–3 sentence analysis written in ${conversation.lang}",
  "productos": [
    {
      "indice": <product index number>,
      "nombre": "<product name>",
      "precio": "<price>",
      "razon": "<one sentence in ${conversation.lang} explaining why this product fits the search>"
    }
  ]
}

Choose the 4 MOST RELEVANT products. If fewer are available, include them all. If no products were scraped, return productos: [].`;

    try {
        const raw = await callOpenAI(prompt, 1024, 0.3);
        if (!raw) return null;
        const clean = raw.replace(/^```json|^```|```$/g, '').trim();
        return JSON.parse(clean);
    } catch (e) {
        console.error('Error parsing AI recommendation:', e);
        addMessage('❌ Could not parse the AI response. Please try again.');
        return null;
    }
}

// Shared OpenAI fetch helper
async function callOpenAI(prompt, maxTokens = 512, temperature = 0.5) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            temperature,
            max_tokens: maxTokens
        })
    });

    const data = await res.json();
    if (data.error) { addMessage(`❌ OpenAI error: ${data.error.message}`); return null; }
    return data.choices[0].message.content.trim();
}

// =====================================================
// MAIN CONVERSATION FLOW
// =====================================================

async function handleInput() {
    const input = inputField.value.trim();
    if (!input) { alert('Please type something first.'); return; }

    addMessage(input, true);
    inputField.value   = '';
    sendBtn.disabled   = true;

    try {
        if      (conversation.step === 'idle')              await handleFirstMessage(input);
        else if (conversation.step === 'awaiting_category') await handleCategorySelection(input);
        else if (conversation.step === 'awaiting_details')  await handleAdditionalDetails(input);
    } catch (err) {
        console.error('Flow error:', err);
        addMessage(`❌ Unexpected error: ${err.message}`);
    } finally {
        sendBtn.disabled = false;
    }
}

// Step 1 — First user message
async function handleFirstMessage(query) {
    conversation.query = query;

    if (!isVagueQuery(query)) {
        console.log('✅ Specific query — scraping now...');
        await scrapeAndRecommend(query, '', '');
        conversation.step = 'idle';
        return;
    }

    console.log('⚠️ Vague query — requesting category...');
    showLoading();
    const categories = await getSuggestedCategories(query);
    hideLoading();

    if (categories && categories.length > 0) {
        addMessage('📂 Please choose a category:\n\n' + categories.map((c, i) => `${i + 1}. ${c}`).join('\n'));
        conversation.step = 'awaiting_category';
    } else {
        await scrapeAndRecommend(query, '', '');
        conversation.step = 'idle';
    }
}

// Step 2 — User picks a category
async function handleCategorySelection(input) {
    conversation.category = input.trim();
    console.log(`📂 Category: ${conversation.category}`);

    showLoading();
    const questions = await getClarifyingQuestions(conversation.query, conversation.category);
    hideLoading();

    if (questions && questions.length > 0) {
        addMessage('❓ One last thing — \n\n' + questions.join('\n\n'));
        conversation.step = 'awaiting_details';
    } else {
        await scrapeAndRecommend(conversation.query, conversation.category, '');
        conversation.step = 'idle';
    }
}

// Step 3 — User answers follow-up questions
async function handleAdditionalDetails(input) {
    conversation.context = input;
    console.log('📦 Searching with full context...');
    await scrapeAndRecommend(conversation.query, conversation.category, input);
    conversation.step = 'idle';
}

// =====================================================
// SCRAPE + RECOMMEND
// =====================================================

async function scrapeAndRecommend(query, category, context) {
    showLoading();

    try {
        const tabs  = await chrome.tabs.query({ active: true, currentWindow: true });
        const tabId = tabs[0].id;
        console.log(`🔍 Scanning: ${tabs[0].title}`);

        const response = await chrome.tabs.sendMessage(tabId, {
            action: 'extraerProductos',
            category,
            palabrasClave: extractKeywords(query + ' ' + context)
        });

        if (!response.success) {
            hideLoading();
            addMessage('❌ Could not access the page. Try reloading it (F5).');
            return;
        }

        console.log(`📦 Products found: ${response.productos.length}`);
        const recommendation = await getRecommendations(query, category, context, response.productos);
        hideLoading();

        if (!OPENAI_API_KEY) {
            // No API key — show raw cards without AI analysis
            renderProductCards({
                texto: `Found ${response.productos.length} product(s). Set up your API Key for personalised AI recommendations.`,
                productos: response.productos.slice(0, 4).map((p, i) => ({
                    indice: i, nombre: p.nombre, precio: p.precio
                }))
            }, response.productos);
        } else if (recommendation) {
            renderProductCards(recommendation, response.productos);
        }

    } catch (err) {
        hideLoading();
        console.error('Scrape error:', err);

        if (err.message.includes('Could not establish connection')) {
            addMessage(
                '❌ Could not connect to the page.\n\n' +
                'Try:\n' +
                '1. Reload the tab (F5)\n' +
                '2. Make sure it is not a protected page (Gmail, Chrome settings…)\n' +
                '3. Use a regular (non-incognito) window'
            );
        } else {
            addMessage(`❌ Error: ${err.message}`);
        }
    }
}

// =====================================================
// EVENT LISTENERS
// =====================================================

sendBtn.addEventListener('click', handleInput);
inputField.addEventListener('keypress', e => { if (e.key === 'Enter') handleInput(); });

// =====================================================
// INITIALISATION
// =====================================================

console.log('🚀 Commerce AI Navigator — popup loaded');
loadApiKey();

// Detect locale → set language for AI prompts → show welcome message
conversation.lang = detectLocale();
console.log(`🌐 Detected language: ${conversation.lang}`);
addMessage(getWelcomeMessage(conversation.lang));