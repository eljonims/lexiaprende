class LexiAprende {
    constructor() {
        // 🛡️ NÚCLEO: Textos de seguridad en Español (El Salvavidas)
        this.nucleoIU = {
            "titulo": "LexiAprende",
            "puntos": "Puntuación",
            "aciertos": "Aciertos",
            "btn-inicio": "Empezar",
            "msg-carga": "Cargando léxico...",
            "msg-error": "Error de conexión"
        };

        this.datos = null; // Aquí caerá el JSON (Euskera, Inglés, etc.)
    }

    /**
     * 🌍 EL TRADUCTOR (i18n con Fallback)
     * Busca la clave en el JSON; si no existe, usa el Español.
     */
    t(clave) {
        // Si hay datos, buscamos en su sección 'textos'. Si no, al núcleo.
        return this.datos?.config?.textos?.[clave] || this.nucleoIU[clave] || `{${clave}}`;
    }

    // Método para arrancar el motor
    async lanzar(url) {
        console.log("🚀 Motor LexiAprende despertando...");
        try {
            const respuesta = await fetch(url);
            this.datos = await respuesta.json();
            console.log("✅ Datos cargados:", this.t('titulo'));
        } catch (error) {
            console.error(this.t('msg-error'), error);
        }
    }
}
