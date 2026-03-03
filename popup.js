// =====================================================
// POPUP.JS OPTIMIZADO V3
// IA PREGUNTA PRIMERO (SIN SCRAPER)
// SCRAPER SOLO PROCESA LO NECESARIO
// =====================================================

const chatDiv = document.getElementById('chat');
const entrada = document.getElementById('entrada');
const botonEnviar = document.getElementById('enviar');
const configModal = document.getElementById('configModal');
const configBtn = document.getElementById('configBtn');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveBtn = document.getElementById('saveBtn');
const deleteBtn = document.getElementById('deleteBtn');
const cancelBtn = document.getElementById('cancelBtn');
const apiStatus = document.getElementById('apiStatus');

let OPENAI_API_KEY = '';
let estadoConversacion = {
    paso: 'inicio', // inicio, esperando_categoria, esperando_detalles, procesando
    busquedaInicial: '',
    categoria: '',
    contexto: '',
    productos: [],
    paginaActual: ''
};

// =====================================================
// FUNCIONES DE CONFIGURACIÓN
// =====================================================

function cargarAPIKey() {
    chrome.storage.local.get(['openai_api_key'], (result) => {
        if (result.openai_api_key) {
            OPENAI_API_KEY = result.openai_api_key;
            console.log('✅ API Key cargada');
            actualizarEstadoAPI(true);
        } else {
            OPENAI_API_KEY = '';
            actualizarEstadoAPI(false);
        }
    });
}

function actualizarEstadoAPI(configurada) {
    if (configurada) {
        apiStatus.className = 'api-status configured';
        apiStatus.textContent = '✅ API Key configurada';
    } else {
        apiStatus.className = 'api-status not-configured';
        apiStatus.textContent = '❌ API Key no configurada';
    }
}

function guardarAPIKey() {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
        alert('Por favor ingresa tu API Key');
        return;
    }
    
    if (!apiKey.startsWith('sk-')) {
        alert('La API Key debe empezar con "sk-"');
        return;
    }
    
    chrome.storage.local.set({ 'openai_api_key': apiKey }, () => {
        OPENAI_API_KEY = apiKey;
        configModal.classList.remove('active');
        apiKeyInput.value = '';
        actualizarEstadoAPI(true);
        agregarMensaje('✅ API Key guardada correctamente', false);
    });
}

function eliminarAPIKey() {
    const confirmacion = confirm('¿Estás seguro de que deseas eliminar tu API Key?');
    
    if (confirmacion) {
        chrome.storage.local.remove(['openai_api_key'], () => {
            OPENAI_API_KEY = '';
            configModal.classList.remove('active');
            apiKeyInput.value = '';
            actualizarEstadoAPI(false);
            agregarMensaje('❌ API Key eliminada correctamente.', false);
        });
    }
}

configBtn.addEventListener('click', () => {
    configModal.classList.add('active');
});

cancelBtn.addEventListener('click', () => {
    configModal.classList.remove('active');
    apiKeyInput.value = '';
});

saveBtn.addEventListener('click', guardarAPIKey);
deleteBtn.addEventListener('click', eliminarAPIKey);

apiKeyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        guardarAPIKey();
    }
});

// =====================================================
// FUNCIONES DEL CHAT
// =====================================================

function agregarMensaje(texto, esUsuario = false) {
    const div = document.createElement('div');
    div.className = `mensaje ${esUsuario ? 'usuario' : 'ia'}`;
    div.textContent = texto;
    chatDiv.appendChild(div);
    chatDiv.scrollTop = chatDiv.scrollHeight;
}

function agregarRespuestaConProductos(recomendacion, productosOriginales) {
    // Contenedor principal del mensaje IA
    const wrapper = document.createElement('div');
    wrapper.className = 'mensaje ia';

    // Texto de la recomendación
    const textoDiv = document.createElement('div');
    textoDiv.className = 'recomendacion-texto';
    textoDiv.textContent = recomendacion.texto || '';
    wrapper.appendChild(textoDiv);

    // Tarjetas de productos
    if (recomendacion.productos && recomendacion.productos.length > 0) {
        const grid = document.createElement('div');
        grid.className = 'productos-grid';

        recomendacion.productos.forEach((item) => {
            // Buscar el producto original por índice o nombre
            const original = productosOriginales[item.indice] || 
                productosOriginales.find(p => p.nombre === item.nombre) || {};

            const enlace = original.enlace || item.enlace || '';
            const imagen = original.imagen || '';
            const precio = original.precio || item.precio || '';
            const nombre = item.nombre || original.nombre || '';

            const card = document.createElement('div');
            card.className = 'producto-card';

            // Imagen
            const imgWrap = document.createElement('div');
            imgWrap.className = 'producto-img-wrap';
            if (imagen) {
                const img = document.createElement('img');
                img.src = imagen;
                img.alt = nombre;
                img.className = 'producto-img';
                img.onerror = () => { imgWrap.innerHTML = '<div class="producto-img-placeholder">🛍️</div>'; };
                imgWrap.appendChild(img);
            } else {
                imgWrap.innerHTML = '<div class="producto-img-placeholder">🛍️</div>';
            }
            card.appendChild(imgWrap);

            // Info
            const info = document.createElement('div');
            info.className = 'producto-info';

            const nombreEl = document.createElement('p');
            nombreEl.className = 'producto-nombre';
            nombreEl.textContent = nombre.length > 60 ? nombre.substring(0, 57) + '...' : nombre;
            info.appendChild(nombreEl);

            if (item.razon) {
                const razonEl = document.createElement('p');
                razonEl.className = 'producto-razon';
                razonEl.textContent = item.razon;
                info.appendChild(razonEl);
            }

            if (precio && precio !== 'No especificado') {
                const precioEl = document.createElement('p');
                precioEl.className = 'producto-precio';
                precioEl.textContent = precio;
                info.appendChild(precioEl);
            }

            if (enlace) {
                const btn = document.createElement('a');
                btn.href = enlace;
                btn.target = '_blank';
                btn.rel = 'noopener noreferrer';
                btn.className = 'producto-btn';
                btn.textContent = 'Ver producto →';
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

function agregarCargando() {
    const div = document.createElement('div');
    div.className = 'mensaje ia';
    div.innerHTML = '<div class="cargando"><div class="punto"></div><div class="punto"></div><div class="punto"></div></div>';
    div.id = 'cargando';
    chatDiv.appendChild(div);
    chatDiv.scrollTop = chatDiv.scrollHeight;
}

function removerCargando() {
    const element = document.getElementById('cargando');
    if (element) {
        element.remove();
    }
}

// =====================================================
// DETECTAR BÚSQUEDA VAGA
// =====================================================

function esSearchMuyVago(busqueda) {
    const palabrasVagas = [
        'regalo', 'producto', 'cosa', 'item', 'comprar',
        'algo', 'busco', 'necesito', 'quiero', 'ayuda'
    ];
    
    const palabras = busqueda.split(' ');
    const palabrasSignificativas = palabras.filter(p => 
        p.length > 4 && 
        !['para', 'que', 'este', 'cual', 'cual'].includes(p.toLowerCase())
    );
    
    // Menos de 3 palabras significativas = vago
    return palabrasSignificativas.length < 3;
}

// =====================================================
// OBTENER CATEGORÍAS SUGERIDAS DE IA
// =====================================================

async function obtenerCategoriasDeIA(busqueda) {
    if (!OPENAI_API_KEY) {
        return null;
    }
    
    const prompt = `El usuario está buscando: "${busqueda}"

Sugiere MÁXIMO 3 categorías de productos que podrían ser relevantes.

Responde SOLO con las categorías, una por línea, SIN números ni explicaciones.

Ejemplos:
Electrónica
Ropa y accesorios
Deportes`;

    try {
        const respuesta = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 100
            })
        });

        const datos = await respuesta.json();
        
        if (datos.error) {
            return null;
        }
        
        const categorias = datos.choices[0].message.content
            .split('\n')
            .map(c => c.trim())
            .filter(c => c.length > 0 && !c.match(/^\d+\./))
            .slice(0, 3);
        
        return categorias;
    } catch (error) {
        console.error('Error obteniendo categorías:', error);
        return null;
    }
}

// =====================================================
// OBTENER PREGUNTAS ADICIONALES DE IA
// =====================================================

async function obtenerPreguntasDeIA(busqueda, categoria) {
    if (!OPENAI_API_KEY) {
        return null;
    }
    
    const prompt = `El usuario está buscando: "${busqueda}"
Ha elegido la categoría: "${categoria}"

Haz MÁXIMO 2 preguntas específicas para obtener más contexto.
Estas preguntas deben ser sobre: presupuesto, edad, marca, características especiales, etc.

Responde SOLO con las preguntas, una por línea.`;

    try {
        const respuesta = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 150
            })
        });

        const datos = await respuesta.json();
        
        if (datos.error) {
            return null;
        }
        
        const preguntas = datos.choices[0].message.content
            .split('\n')
            .filter(p => p.trim().length > 5);
        
        return preguntas;
    } catch (error) {
        console.error('Error obteniendo preguntas:', error);
        return null;
    }
}

// =====================================================
// ENVIAR A OPENAI CON CONTEXTO REDUCIDO
// =====================================================

async function enviarAOpenAI(busqueda, categoria, contexto, productos) {
    if (!OPENAI_API_KEY) {
        return null;
    }

    const listaProductos = productos.map((p, i) =>
        `${i}. "${p.nombre}" | Precio: ${p.precio}`
    ).join('\n');

    const prompt = `Eres un experto asesor de compras. Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional ni backticks.

BÚSQUEDA: "${busqueda}"
CATEGORÍA: "${categoria || 'General'}"${contexto ? `\nCONTEXTO: ${contexto}` : ''}

PRODUCTOS DISPONIBLES (índice. nombre | precio):
${listaProductos || 'Sin productos scrapeados'}

Devuelve este JSON exacto:
{
  "texto": "Breve análisis de 2-3 frases en español explicando tus recomendaciones",
  "productos": [
    {
      "indice": <número del índice>,
      "nombre": "<nombre del producto>",
      "precio": "<precio>",
      "razon": "<razón corta de 1 frase por qué recomendarlo>"
    }
  ]
}

Elige los 4 productos MÁS RELEVANTES. Si hay menos, incluye todos. Si no hay productos scrapeados, devuelve productos: [].`;

    try {
        console.log('📤 Enviando a OpenAI...');

        const respuesta = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: 1024
            })
        });

        const datos = await respuesta.json();

        if (datos.error) {
            agregarMensaje(`❌ Error OpenAI: ${datos.error.message}`, false);
            return null;
        }

        const raw = datos.choices[0].message.content.trim();
        console.log('✅ Respuesta recibida');

        // Limpiar posibles backticks que el modelo incluya a veces
        const clean = raw.replace(/^```json|^```|```$/g, '').trim();
        return JSON.parse(clean);
    } catch (error) {
        console.error('Error:', error);
        agregarMensaje(`❌ Error: ${error.message}`, false);
        return null;
    }
}

// =====================================================
// FLUJO PRINCIPAL OPTIMIZADO
// =====================================================

async function procesarInput() {
    const input = entrada.value.trim();
    
    if (!input) {
        alert('Por favor escribe algo');
        return;
    }
    
    agregarMensaje(input, true);
    entrada.value = '';
    botonEnviar.disabled = true;
    
    try {
        if (estadoConversacion.paso === 'inicio') {
            // PRIMER MENSAJE
            await procesarPrimeraMensaje(input);
        } else if (estadoConversacion.paso === 'esperando_categoria') {
            // USUARIO ELIGIÓ CATEGORÍA
            await procesarSeleccionCategoria(input);
        } else if (estadoConversacion.paso === 'esperando_detalles') {
            // USUARIO RESPONDIÓ PREGUNTAS ADICIONALES
            await procesarDetallesAdicionales(input);
        }
    } catch (error) {
        console.error('Error:', error);
        agregarMensaje(`❌ Error: ${error.message}`, false);
    } finally {
        botonEnviar.disabled = false;
    }
}

// =====================================================
// PASO 1: PRIMERA MENSAJE DEL USUARIO
// =====================================================

async function procesarPrimeraMensaje(busqueda) {
    estadoConversacion.busquedaInicial = busqueda;
    
    // Si búsqueda es específica, proceder directamente al scraping
    if (!esSearchMuyVago(busqueda)) {
        console.log('✅ Búsqueda específica, obteniendo productos...');
        await obtenerProductosYRecomendar(busqueda, '', '');
        estadoConversacion.paso = 'inicio';
        return;
    }
    
    // Si búsqueda es vaga, pedir categoría
    console.log('⚠️ Búsqueda vaga, pidiendo categoría...');
    
    agregarCargando();
    
    const categorias = await obtenerCategoriasDeIA(busqueda);
    
    removerCargando();
    
    if (categorias && categorias.length > 0) {
        agregarMensaje(
            '📂 Por favor, elige una categoría:\n\n' +
            categorias.map((c, i) => `${i + 1}. ${c}`).join('\n'),
            false
        );
        
        estadoConversacion.paso = 'esperando_categoria';
    } else {
        // Sin categorías, proceder directamente
        await obtenerProductosYRecomendar(busqueda, '', '');
        estadoConversacion.paso = 'inicio';
    }
}

// =====================================================
// PASO 2: USUARIO ELIGE CATEGORÍA
// =====================================================

async function procesarSeleccionCategoria(respuesta) {
    // Extraer número o texto de categoría
    const categoria = respuesta.trim();
    estadoConversacion.categoria = categoria;
    
    console.log(`📂 Categoría seleccionada: ${categoria}`);
    
    agregarCargando();
    
    // Obtener preguntas adicionales
    const preguntas = await obtenerPreguntasDeIA(
        estadoConversacion.busquedaInicial,
        categoria
    );
    
    removerCargando();
    
    if (preguntas && preguntas.length > 0) {
        agregarMensaje(
            '❓ Una última cosa. ' + preguntas.join('\n\n'),
            false
        );
        estadoConversacion.paso = 'esperando_detalles';
    } else {
        // Sin preguntas adicionales, proceder al scraping
        console.log('📦 Buscando productos...');
        await obtenerProductosYRecomendar(
            estadoConversacion.busquedaInicial,
            categoria,
            ''
        );
        estadoConversacion.paso = 'inicio';
    }
}

// =====================================================
// PASO 3: USUARIO RESPONDE DETALLES ADICIONALES
// =====================================================

async function procesarDetallesAdicionales(respuesta) {
    estadoConversacion.contexto = respuesta;
    
    console.log('📦 Buscando productos con contexto...');
    
    await obtenerProductosYRecomendar(
        estadoConversacion.busquedaInicial,
        estadoConversacion.categoria,
        respuesta
    );
    
    estadoConversacion.paso = 'inicio';
}

// =====================================================
// OBTENER PRODUCTOS Y RECOMENDAR
// =====================================================

async function obtenerProductosYRecomendar(busqueda, categoria, contexto) {
    agregarCargando();
    
    try {
        // Obtener la pestaña activa
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tabId = tabs[0].id;
        const paginaActual = tabs[0].title;
        
        console.log(`🔍 Explorando: ${paginaActual}`);
        
        // Hacer scraping (ahora con contexto de categoría)
        const respuesta = await chrome.tabs.sendMessage(tabId, {
            action: 'extraerProductos',
            categoria: categoria,
            palabrasClave: extraerPalabrasClave(busqueda + ' ' + contexto)
        });
        
        if (!respuesta.success) {
            removerCargando();
            agregarMensaje('❌ Error al acceder a la página. Intenta recargar (F5).', false);
            return;
        }
        
        console.log(`📦 Productos encontrados: ${respuesta.productos.length}`);
        
        // Enviar a OpenAI con contexto reducido
        const recomendacion = await enviarAOpenAI(
            busqueda,
            categoria,
            contexto,
            respuesta.productos
        );

        removerCargando();

        if (!OPENAI_API_KEY) {
            // Sin API Key: mostrar tarjetas igual, sin análisis de IA
            agregarRespuestaConProductos(
                { texto: `Se encontraron ${respuesta.productos.length} productos. Configura tu API Key para obtener recomendaciones personalizadas.`,
                  productos: respuesta.productos.slice(0, 4).map((p, i) => ({ indice: i, nombre: p.nombre, precio: p.precio })) },
                respuesta.productos
            );
        } else if (recomendacion) {
            agregarRespuestaConProductos(recomendacion, respuesta.productos);
        }
        
    } catch (error) {
        removerCargando();
        
        console.error('Error:', error);
        
        if (error.message.includes('Could not establish connection')) {
            agregarMensaje(
                '❌ No pude acceder a la página.\n\n' +
                'Soluciones:\n' +
                '1. Recarga (F5)\n' +
                '2. Asegúrate que no es página protegida (Gmail, Facebook)\n' +
                '3. Intenta en modo normal (no incógnito)',
                false
            );
        } else {
            agregarMensaje(`❌ Error: ${error.message}`, false);
        }
    }
}

// =====================================================
// FUNCIONES AUXILIARES
// =====================================================

function extraerPalabrasClave(texto) {
    // Extraer palabras clave del búsqueda y contexto
    const palabras = texto.toLowerCase().split(' ');
    const stopWords = ['el', 'la', 'de', 'que', 'y', 'o', 'es', 'en', 'por', 'para'];
    
    return palabras
        .filter(p => p.length > 3 && !stopWords.includes(p))
        .slice(0, 5)
        .join(' ');
}

// =====================================================
// EVENT LISTENERS
// =====================================================

botonEnviar.addEventListener('click', procesarInput);

entrada.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        procesarInput();
    }
});

// =====================================================
// INICIALIZACIÓN
// =====================================================

console.log('🚀 Popup.js V3 cargado - Flujo optimizado');
cargarAPIKey();