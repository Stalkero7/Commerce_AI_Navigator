// =====================================================
// BACKGROUND.JS - Service Worker de la extensión
// =====================================================

// Este archivo se ejecuta en el fondo y realiza tareas de la extensión

// Se ejecuta cuando la extensión se instala
chrome.runtime.onInstalled.addListener(() => {
    console.log('✅ Extensión Buscador IA instalada correctamente');
    
    // Aquí podrías:
    // - Abrir una página de bienvenida
    // - Inicializar configuración
    // - Crear contexto del menú derecho
});

// Escuchar cambios en pestañas
chrome.tabs.onActivated.addListener((activeInfo) => {
    console.log(`Pestaña activa: ${activeInfo.tabId}`);
});

// Funciona con permisos y mensajes entre componentes de la extensión