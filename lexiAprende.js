class LexiAprende {
        constructor() {
                // 🛡️ NÚCLEO: Textos de seguridad en Español (El Salvavidas)
                this.nucleoIU = {
                        "titulo": "LexiAprende",
                        "puntos": "Puntuación",
                        "aciertos": "Aciertos",
                        "btn-inicio": "Empezar",
                        "msg-carga": "Cargando léxico...",
                        "msg-error": "Error de conexión",
                        "msg-inicio": "Iniciando sistema...",
                        "inicio": "Empezar Juego",
                        "error": "Error de carga",
                        "ruleta": "¡Gira la Ruleta!",
                        "vida-extra": "¡Vida Extra!",
                        "comodin-menos": "Pierdes un comodín",
                        "tiempo-stop": "Tiempo Congelado",
                        "idioma-swap": "Idiomas Invertidos"
                };

                // 📊 ESTADO INICIAL DEL JUEGO
                this.vidas = 3;
                this.comodines = 3;
                this.puntos = 0;
                this.racha = 0;
                this.objetivoRacha = 5;
                this.numOpciones = 2; // Empezamos con 4 botones
                this.tiempoBase = 10; // Segundos para responder

                this.datos = null;    // para el léxico cargado 
                this.db = null;       // Conexión a IndexedDB (para récords)
        }
        // El mensajero de la bitácora
        bitacora(msj, pct) {//mensaje y porcentaje (0-100) de la barra
                const lista = document.getElementById('bitacora-lanzamiento');
                const barra = document.getElementById('barra-progreso');
                if (lista) {
                        const linea = document.createElement('div');
                        linea.className = 'linea-bitacora';
                        linea.innerText = `[${new Date().toLocaleTimeString()}] ${msj}`;
                        lista.appendChild(linea);
                        lista.scrollTop = lista.scrollHeight;
                }
                if (barra && pct !== undefined) barra.style.width = `${pct}%`;
        }

        esperar(ms) { return new Promise(res => setTimeout(res, ms)); }

        //Busca la clave en el JSON; si no existe, usa el Español.
        t(clave) {
                // Si hay datos, buscamos en su sección 'textos'. Si no, al núcleo.
                return this.datos?.config?.textos?.[clave] || this.nucleoIU[clave] || `{${clave}}`;
        }

        async lanzar(url) {
                this.bitacora(this.t('msg-inicio'), 10);
                await this.esperar(800);

                try {
                        this.bitacora(this.t('msg-carga') + `: ${url}`, 40);
                        const respuesta = await fetch(url);
                        if (!respuesta.ok) throw new Error();
                        this.datos = await respuesta.json();
                        await this.esperar(1000);

                        this.bitacora("¡Todo listo!", 100);
                        await this.esperar(600);

                        // Finalizar carga (Igual que en MotorEduca)
                        const pantalla = document.getElementById('pantalla-lanzamiento');
                        pantalla.style.opacity = "0";
                        setTimeout(() => {
                                pantalla.classList.add('oculto');
                                document.getElementById('app').classList.remove('oculto');
                                document.getElementById('titulo-juego').innerText = this.t('titulo');
                        }, 600);

                } catch (e) {
                        this.bitacora(this.t('msg-error'), 100);
                }
        }
        /**
  * 🗄️ Inicializa el Almacén con soporte para analítica de aprendizaje
  */
        conectarAlmacen() {
                return new Promise((resolver, rechazar) => {
                        // Abrimos la base de datos (Versión 1)
                        const peticion = indexedDB.open("LexiAprende_DB", 1);

                        // Solo ocurre la primera vez: Definimos el diseño de los compartimentos
                        peticion.onupgradeneeded = (e) => {
                                const db = e.target.result;

                                // 🥇 Estantería 1: RÉCORDS de Categorías
                                // Guarda: { id: "eu-familia", puntosMax: 500, rachaMax: 8, medallas: 1 }
                                if (!db.objectStoreNames.contains("records")) {
                                        db.createObjectStore("records", { keyPath: "id" });
                                }

                                // 🧠 Estantería 2: LÉXICO (El "Expediente" de cada palabra)
                                // Usamos el ID de la palabra como llave (ej: "ama")
                                // Aquí guardaremos los aciertos_A_B, aciertos_B_A y tiempos.
                                if (!db.objectStoreNames.contains("lexico")) {
                                        db.createObjectStore("lexico", { keyPath: "id" });
                                }

                                // ⚙️ Estantería 3: AJUSTES (Preferencias y Estado)
                                // Guarda cosas como: { id: "volumen", valor: 80 }
                                if (!db.objectStoreNames.contains("ajustes")) {
                                        db.createObjectStore("ajustes", { keyPath: "id" });
                                }

                                console.log("🏗️ Diseño de Almacén Triple completado.");
                        };

                        peticion.onsuccess = (e) => {
                                this.db = e.target.result;
                                resolver();
                        };

                        peticion.onerror = () => rechazar("Error crítico: Almacén inaccesible.");
                });
        }

}
