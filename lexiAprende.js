class LexiAprende {
        constructor() {
                // 🛡️ NÚCLEO: Textos de seguridad en Español (El Salvavidas)
                this.nucleoIU = {
                        "titulo": "LexiAprende",
                        "puntos": "Puntuación",
                        "inicio": "Empezar Juego",
                        "msg-inicio": "despertando...",
                        "msg-conectar-db": "Sincronizando expediente de aprendizaje...",
                        "msg-db-listo": "Almacén listo para analítica",
                        "msg-buscando-temas": "Buscando categorías de léxico...",
                        "msg-sistema-listo": "¡Sistema preparado! Selecciona tu reto",
                        "msg-error-red": "No se pudo conectar con el servidor",
                        "msg-error-critico": "ERROR CRÍTICO",
                        // Extras para el juego
                        "ruleta": "¡Gira la Ruleta!",
                        "vida-extra": "¡Vida Extra!",
                        "comodin-menos": "Pierdes un comodín",
                        "tiempo-stop": "Tiempo Congelado",
                        "idioma-swap": "Modo Mareo: Idiomas Invertidos",
                        "btn-categorias-todas": "Seleccionar Todo",
                        "btn-categorias-ninguna": "Deseleccionar Todo",
                        "nvl-1-pista": "BÁSICO",
                        "nvl-2-pista": "MEDIO",
                        "nvl-3-pista": "EXPERTO"
                };


                //  VARIABLES DE ESTADO Y ACOPLAMIENTO
                // -------------------------------------------------------------------------
                // 1. nivelDificultadSeleccionado: [String] "nvl-1", "nvl-2", "nvl-3"
                //    Modifica: gestionarDificultad() | Consume: evaluarRespuesta()
                this.nivelDificultadSeleccionado = "nvl-1";

                // 2. idiomaInvertido: [Boolean] Sentido de la pregunta
                //    Modifica: Ruleta / Lógica nivel | Consume: evaluarRespuesta(), actualizarExpedientePalabra()
                this.idiomaInvertido = false;

                // 3. numOpciones: [Number] Cantidad de botones de respuesta
                //    Modifica: gestionarRacha() / Ruleta | Consume: evaluarRespuesta(), generarOpcionesRespuesta()
                this.numOpciones = 2;

                // 4. modoTiempoCongelado: [Boolean] Flag de la Ruleta
                //    Modifica: Ruleta (Premio) | Consume: evaluarRespuesta(), Temporizador
                this.modoTiempoCongelado = false;

                // 5. tiempoBase: [Number] Segundos máximos por pregunta
                //    Modifica: gestionarRacha() (Dificultad) | Consume: evaluarRespuesta()
                this.tiempoBase = 10;

                // 6. preguntaActual: [Object] El item del JSON siendo evaluado
                //    Modifica: siguientePregunta() | Consume: evaluarRespuesta(), comprobarRespuesta()
                this.preguntaActual = null;

                // 7. timestampInicioPregunta: [Number] Marca temporal del inicio
                //    Modifica: generarOpcionesRespuesta() | Consume: comprobarRespuesta()
                this.timestampInicioPregunta = 0;


                // RECURSOS Y CONTADORES
                this.comodines = 3;
                this.vidasRestantes = 3;
                this.indiceRachaActual = 0;
                this.objetivoRacha = 5;
                this.puntosTotales = 0;

                this.listaTemasElegidos = [];
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

        async lanzar(urlCatalogo) {
                // 1. Iniciamos la bitácora con el nombre del motor
                this.bitacora(`${this.t('titulo')} ${this.t('msg-inicio')}`, 10);

                try {
                        // 2. Conectamos al Almacén Triple (IndexedDB)
                        this.bitacora(this.t('msg-conectar-db'), 30);
                        await this.conectarAlmacen();
                        await this.esperar(600);
                        this.bitacora("[OK] " + this.t('msg-db-listo'), 45);

                        // 3. Cargamos el catálogo de temas disponibles de GitHub
                        this.bitacora(this.t('msg-buscando-temas'), 60);
                        const respuesta = await fetch(urlCatalogo);

                        if (!respuesta.ok) throw new Error(this.t('msg-error-red'));
                        const temas = await respuesta.json();

                        // 4. Todo preparado para el Menú
                        this.bitacora(this.t('msg-sistema-listo'), 100);
                        await this.esperar(800);

                        // 🎬 TRANSICIÓN VISUAL
                        const capaCarga = document.getElementById('pantalla-lanzamiento');
                        const escenarioPrincipal = document.getElementById('app');

                        if (capaCarga && escenarioPrincipal) {
                                capaCarga.style.opacity = "0"; // Desvanecimiento neón

                                setTimeout(() => {
                                        capaCarga.classList.add('oculto'); // La quitamos del medio
                                        escenarioPrincipal.classList.remove('oculto'); // Mostramos el menú

                                        // Ahora que el escenario existe, dibujamos los botones
                                        this.mostrarMenu(temas);
                                        this.conectarEventos();
                                }, 600);
                        }

                        this.mostrarMenu(temas);

                } catch (error) {
                        // Si algo falla, el error también pasa por el traductor si es posible
                        this.bitacora(`${this.t('msg-error-critico')}: ${error.message || error}`, 100);
                        console.error("Fallo LexiAprende:", error);
                }
        }


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

        mostrarMenu(catalogoTemas) {
                const zonaListado = document.getElementById('tablero-juego');

                // 1. LIMPIEZA RADICAL: Borramos el listado y buscamos la cabecera vieja
                zonaListado.innerHTML = "";
                const cabeceraVieja = document.querySelector('.barra-herramientas-seleccion');
                if (cabeceraVieja) cabeceraVieja.remove(); // Si existe, la fulminamos antes de crear la nueva

                // 2. Definimos la cabecera (Tu código actual con t() y data-accion)
                const htmlCabecera = `
            <div class="barra-herramientas-seleccion">
                <button class="boton-disparador-juego-neon" data-accion="iniciar-partida">
                    ${this.t('inicio')}
                </button>
                <div class="grupo-selector-dificultad">
                    <button class="btn-dificultad" data-accion="cambiar-dificultad" data-id="nvl-1">
                        <span class="icono-nivel">🌱</span>
                        <span class="texto-pista-nivel">${this.t('nvl-1-pista')}</span>
                    </button>
                    <button class="btn-dificultad" data-accion="cambiar-dificultad" data-id="nvl-2">
                        <span class="icono-nivel">🌿</span>
                        <span class="texto-pista-nivel">${this.t('nvl-2-pista')}</span>
                    </button>
                    <button class="btn-dificultad" data-accion="cambiar-dificultad" data-id="nvl-3">
                        <span class="icono-nivel">🌳</span>
                        <span class="texto-pista-nivel">${this.t('nvl-3-pista')}</span>
                    </button>
                </div>
                <button class="boton-accion-masiva-categorias" data-accion="alternar-todos-temas" id="btn-masivo">
                    ${this.t('btn-categorias-ninguna')}
                </button>
            </div>`;

                // 3. Generamos las filas de temas
                let htmlFilas = "";
                this.listaTemasElegidos = [];
                catalogoTemas.forEach(tema => {
                        htmlFilas += `
                <div class="boton-fila-seleccion-tema estado-seleccionado" 
                     data-accion="seleccionar-tema" 
                     data-id="${tema.id}">
                    <span class="texto-nombre-categoria">${tema.titulo}</span>
                    <span class="icono-maestria-evolutiva">🌱</span>
                </div>`;
                        this.listaTemasElegidos.push(tema.id);
                });

                // 4. Inyectamos: Cabecera ANTES del listado, Filas DENTRO del listado
                zonaListado.insertAdjacentHTML('beforebegin', htmlCabecera);
                zonaListado.innerHTML = htmlFilas;

                // 5. Encendemos el neón del nivel inicial
                this.resaltaBotonDificultadSeleccionada();

        }


        conectarEventos() {
                document.addEventListener('click', (evento) => { //escucha global (Delegación de eventos)
                        // Buscamos el elemento con data-accion más cercano al clic
                        const objetivo = evento.target.closest('[data-accion]');
                        if (!objetivo) return;

                        // Extraemos la "pareja de datos" técnica
                        const accion = objetivo.dataset.accion;
                        const id = objetivo.dataset.id || null; // El ID es opcional pero lo capturamos ya

                        // El Cerebro que decide según la acción
                        switch (accion) {
                                case 'iniciar-partida':
                                        this.prepararPartida();
                                        break;
                                case 'seleccionar-tema':
                                        this.gestionarSeleccionFila(objetivo, id);
                                        break;
                                case 'alternar-todos-temas':
                                        this.ejecutarSeleccionMasiva();
                                        break;
                                case 'iniciar-partida':
                                        this.prepararPartida();
                                        break;
                                case 'cambiar-dificultad':
                                        this.gestionarDificultad(objetivo, id); // Aquí 'id' será el nivel (1, 2, 3)
                                        break;
                        }
                });
        }

        resaltaBotonDificultadSeleccionada() {
                // 1. Buscamos todos los botones de dificultad
                const botones = document.querySelectorAll('.btn-dificultad');

                // 2. Limpiamos el brillo de todos y encendemos solo el seleccionado
                botones.forEach(btn => {
                        btn.classList.remove('es-dificultad-seleccionada');
                        if (btn.dataset.id === this.nivelDificultadSeleccionado) {
                                btn.classList.add('es-dificultad-seleccionada');
                        }
                });
        }


        gestionarDificultad(elemento, idNivel) {
                this.nivelDificultadSeleccionado = idNivel; // Guardamos nvl-1, nvl-2 o nvl-3
                this.resaltaBotonDificultadSeleccionada();
                console.log(`[Dificultad] Cambiada a: ${idNivel}`);

                // Opcional: Podríamos guardar esto en IndexedDB aquí mismo
        }

        gestionarSeleccionFila(elemento, id) {
                // 1. Efecto visual (Neón)
                elemento.classList.toggle('estado-seleccionado');

                // 2. Lógica de datos: ¿Añadir o Quitar de la lista de juego?
                if (elemento.classList.contains('estado-seleccionado')) {
                        // Si no está ya, lo metemos
                        if (!this.listaTemasElegidos.includes(id)) {
                                this.listaTemasElegidos.push(id);
                        }
                } else {
                        // Si lo desmarca, lo sacamos del array
                        this.listaTemasElegidos = this.listaTemasElegidos.filter(item => item !== id);
                }

                console.log("Categorías activas:", this.listaTemasElegidos);
                this.sincronizarBotonMasivo();
        }

        sincronizarBotonMasivo() {
                const botonesTemas = document.querySelectorAll('.boton-fila-seleccion-tema');
                const btnMasivo = document.getElementById('btn-masivo');
                if (!btnMasivo || botonesTemas.length === 0) return;

                // Comprobamos si TODOS están encendidos
                const todosSeleccionados = Array.from(botonesTemas).every(b => b.classList.contains('estado-seleccionado'));

                // Si están todos, el botón invita a "Quitar Todo" (ninguna)
                // Si falta alguno, el botón invita a "Poner Todo" (todas)
                btnMasivo.innerText = todosSeleccionados ? this.t('btn-categorias-ninguna') : this.t('btn-categorias-todas');
        }

        ejecutarSeleccionMasiva() {
                const botonesTemas = document.querySelectorAll('.boton-fila-seleccion-tema');
                const btnMasivo = document.getElementById('btn-masivo');
                if (!btnMasivo) return;

                // Comprobamos si actualmente están todos marcados
                const todosSeleccionados = Array.from(botonesTemas).every(b => b.classList.contains('estado-seleccionado'));

                botonesTemas.forEach(boton => {
                        const idTema = boton.dataset.id;

                        if (todosSeleccionados) {
                                // DESACTIVAR TODO
                                boton.classList.remove('estado-seleccionado');
                                this.listaTemasElegidos = [];
                        } else {
                                // ACTIVAR TODO
                                boton.classList.add('estado-seleccionado');
                                if (!this.listaTemasElegidos.includes(idTema)) {
                                        this.listaTemasElegidos.push(idTema);
                                }
                        }
                });

                // Actualizamos el texto del botón usando el traductor
                btnMasivo.innerText = todosSeleccionados ? this.t('btn-categorias-todas') : this.t('btn-categorias-ninguna');

                console.log("Selección masiva:", this.listaTemasElegidos);
        }


        /**
    * 🏁 Descarga los JSON de los temas elegidos y los fusiona
    */
        async prepararPartida() {
                if (this.listaTemasElegidos.length === 0) {
                        alert(this.t('msg-error-seleccion'));
                        return;
                }

                try {
                        const promesas = this.listaTemasElegidos.map(id => {
                                // ⚠️ Fíjate bien en la ruta: 'datos/id.json'
                                return fetch(`datos/${id}.json`).then(res => {
                                        if (!res.ok) throw new Error(`No existe el archivo: datos/${id}.json`);
                                        return res.json();
                                });
                        });

                        const todosLosDatos = await Promise.all(promesas);

                        this.datosCargados = [];
                        todosLosDatos.forEach(json => {
                                // Unimos el vocabulario (usando el nombre que tú pusiste en el JSON)
                                this.datosCargados = [...this.datosCargados, ...json.vocabulario];
                        });

                        console.log(`✅ Fusión completa: ${this.datosCargados.length} palabras.`);
                        this.iniciarExamen();

                } catch (error) {
                        console.error("❌ Error al fusionar diccionarios:", error.message);
                        alert("Falta un archivo de datos. Revisa la consola.");
                }
        }

        iniciarExamen() {
                console.log("El examen comienza. Nivel:", this.nivelDificultadSeleccionado);

                // 1. Limpieza total de la interfaz de selección
                const zonaListado = document.getElementById('tablero-juego');
                const cabeceraSistemas = document.querySelector('.barra-herramientas-seleccion');

                if (zonaListado) zonaListado.innerHTML = "";
                if (cabeceraSistemas) cabeceraSistemas.remove();

                // 2. Dibujamos el esqueleto del examen (Marcador, Vidas, Pregunta)
                this.dibujarEscenarioExamen();

                // 3. Lanzamos la primera pregunta
                this.siguientePregunta();
        }
        dibujarEscenarioExamen() {
                const zonaJuego = document.getElementById('tablero-juego');

                // 1. Cabecera de Estado (Vidas y Racha)
                const htmlEstado = `
            <div class="interfaz-estado-examen">
                <div id="contenedor-vidas" class="marcador-vidas">❤️❤️❤️</div>
                <div id="marcador-racha" class="indicador-racha">0 / ${this.objetivoRacha}</div>
            </div>
        `;

                // 2. Barra de Tiempo y Palabra Objetivo
                const htmlPregunta = `
            <div class="contenedor-pregunta-examen">
                <div class="barra-tiempo-exterior">
                    <div id="progreso-tiempo" class="barra-tiempo-interior" style="width: 100%"></div>
                </div>
                <h2 id="palabra-objetivo" class="texto-pregunta-principal">---</h2>
            </div>
            <div id="opciones-respuesta" class="rejilla-opciones-examen"></div>
        `;

                zonaJuego.innerHTML = htmlEstado + htmlPregunta;
        }

        siguientePregunta() {
                // 1. Mapeamos tu nivel a número de rareza 'r'
                const rarezaMaxima = parseInt(this.nivelDificultadSeleccionado.split('-')[1]);

                // 2. Filtramos la "bolsa" para quedarnos solo con lo que toca
                const opcionesPosibles = this.datosCargados.filter(item => item.r <= rarezaMaxima);

                if (opcionesPosibles.length === 0) {
                        console.error("❌ No hay palabras con rareza", rarezaMaxima);
                        return;
                }

                // 3. Elegimos la Ganadora (al azar)
                const indiceAleatorio = Math.floor(Math.random() * opcionesPosibles.length);
                this.preguntaActual = opcionesPosibles[indiceAleatorio];

                // 4. Pintamos el texto en el H2 que creamos antes
                // Usamos [0] para la palabra y [1] para la traducción (o viceversa si está invertido)
                const textoPregunta = this.idiomaInvertido ? this.preguntaActual.p[1] : this.preguntaActual.p[0];
                document.getElementById('palabra-objetivo').innerText = textoPregunta;

                console.log("🎯 Palabra objetivo:", textoPregunta, "| Rareza:", this.preguntaActual.r);

                // 5.  generar los botones de respuesta
                this.generarOpcionesRespuesta(opcionesPosibles);
        }
        /**
 * 🧠 Genera los botones de respuesta consultando el expediente de aprendizaje
 */
        async generarOpcionesRespuesta(bolsaFiltrada) {
                const contenedor = document.getElementById('opciones-respuesta');
                contenedor.innerHTML = ""; // Limpiamos botones anteriores

                // 1. OBTENER LA RESPUESTA CORRECTA
                const correcta = this.preguntaActual;

                // 2. SELECCIONAR DISTRACTORES (Inteligencia de Datos)
                // Filtramos para no repetir la correcta y buscamos distractores del mismo nivel r
                let distractores = bolsaFiltrada.filter(item => item.id !== correcta.id);

                // Mezclamos los distractores y cogemos los necesarios según this.numOpciones
                this.mezclarArray(distractores);
                const seleccionados = distractores.slice(0, this.numOpciones - 1);

                // 3. LA MEZCLA FINAL (Correcta + Distractores)
                const opcionesFinales = [correcta, ...seleccionados];
                this.mezclarArray(opcionesFinales);

                // 4. PINTAR BOTONES NEÓN
                opcionesFinales.forEach(opcion => {
                        const btn = document.createElement('button');
                        btn.className = 'boton-opcion-examen-neon';
                        btn.dataset.accion = 'comprobar-respuesta';
                        btn.dataset.id = opcion.id;

                        // Si idiomaInvertido es true, mostramos el idioma B; si no, el A
                        btn.innerText = this.idiomaInvertido ? opcion.p[0] : opcion.p[1];

                        contenedor.appendChild(btn);
                });

                // 5. DISPARAR EL RELOJ
                this.iniciarTemporizador();
        }
        /**
 * ⏱️ Controla la barra de tiempo visual y el "Timeout" de la pregunta
 */
        /**
 * ⏱️ Controla la barra visual con discriminación de colores (Verde > Amarillo > Rojo)
 */
    /**
     * ⏱️ Gestiona el tiempo y sincroniza la alerta con las vidas
     */
        /**
     * ⏱️ Gestiona el tiempo y sincroniza la estética de alerta
     */
    iniciarTemporizador() {
        if (this.relojActivo) clearInterval(this.relojActivo);
        
        const barraInt = document.getElementById('progreso-tiempo');
        const barraExt = document.querySelector('.barra-tiempo-exterior');
        if (!barraInt || !barraExt) return;

        // Reset inicial de seguridad
        barraInt.className = 'barra-tiempo-interior fase-verde';
        barraExt.classList.remove('alerta-roja');
        this.actualizarCorazonesVisual(null); // Corazones normales al empezar

        const tiempoTotalMs = this.tiempoBase * 1000;
        this.timestampInicioPregunta = Date.now();

        this.relojActivo = setInterval(() => {
            const transcurrido = Date.now() - this.timestampInicioPregunta;
            const porcentaje = Math.max(0, 100 - (transcurrido / tiempoTotalMs * 100));
            
            // CAMBIO DE FASE SEGÚN RANGO
            if (porcentaje <= 25) {
                if (!barraInt.classList.contains('fase-rojo')) {
                    barraInt.className = 'barra-tiempo-interior fase-rojo';
                    barraExt.classList.add('alerta-roja');
                    this.actualizarCorazonesVisual('rojo');
                }
            } else if (porcentaje <= 50) {
                if (!barraInt.classList.contains('fase-amarillo')) {
                    barraInt.className = 'barra-tiempo-interior fase-amarillo';
                    this.actualizarCorazonesVisual('amarillo');
                }
            }

            barraInt.style.width = `${porcentaje}%`;

            if (transcurrido >= tiempoTotalMs) {
                clearInterval(this.relojActivo);
                this.comprobarRespuesta(null); 
            }
        }, 100);
    }

    /**
     * ❤️ Dibuja las vidas y aplica el latido al último corazón si hay alerta
     */
    actualizarCorazonesVisual(fase) {
        const contenedor = document.getElementById('contenedor-vidas');
        if (!contenedor) return;

        let html = "";
        for (let i = 0; i < this.vidasRestantes; i++) {
            const esUltimo = (i === this.vidasRestantes - 1);
            if (esUltimo && fase) {
                html += `<span class="corazon-alerta-lenta ${fase}">❤️</span>`;
            } else {
                html += `<span>❤️</span>`;
            }
        }
        contenedor.innerHTML = html;
    }




        /**
         * 🔀 Algoritmo de mezcla (Fisher-Yates) para que no haya patrones
         */
        mezclarArray(array) {
                for (let i = array.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [array[i], array[j]] = [array[j], array[i]];
                }
        }

        /**
 *  SISTEMA DE EVALUACIÓN NUCLEAR
 * Calcula el impacto de la respuesta en la maestría del usuario.
 * Intervienen: Tiempo, Densidad de opciones, Sentido y Modos especiales.
 */
        async evaluarRespuesta(idSeleccionado, tiempoReaccion) {
                const idObjetivo = this.preguntaActual.id;
                const idAcepcion = this.acepcionActualIndex || "1";
                const esExito = (idSeleccionado === idObjetivo);

                // 1. CÁLCULO DEL PESO ESPECÍFICO (Multiplicadores)
                // A mayor número de opciones, más mérito tiene el acierto
                const multiplicadorOpciones = this.numOpciones / 2; // 1..4

                // El modo inverso (B->A) siempre es un 30% más valioso
                // producir es más difícil que reconocer
                const multiplicadorSentido = this.idiomaInvertido ? 1.3 : 1.0;

                // 2. VALORACIÓN DEL TIEMPO (Eficiencia Cognitiva)
                // Si el tiempo está congelado, la valoración de velocidad es neutra (1.0)
                // Si no, premiamos responder en menos del 30% del tiempo disponible
                let factorVelocidad = 1.0;
                if (!this.modoTiempoCongelado) {
                        const ratioTiempo = tiempoReaccion / (this.tiempoBase * 1000);
                        factorVelocidad = ratioTiempo < 0.3 ? 1.5 : (ratioTiempo > 0.8 ? 0.7 : 1.0);
                }

                // 3. IMPACTO FINAL EN MAESTRÍA (Puntos de 0 a 100)
                // Un acierto perfecto puede subir hasta 10 puntos. Un fallo resta 15.
                const impactoMaestria = esExito
                        ? (5 * multiplicadorOpciones * multiplicadorSentido * factorVelocidad)
                        : -15;

                // 4. REGISTRO EN BASE DE DATOS (Involucrados)
                // Registramos la palabra objetivo (A)
                await this.actualizarExpedientePalabra(idObjetivo, idAcepcion, esExito, tiempoReaccion, impactoMaestria);

                // 🎯 ANALÍTICA DE CONFUSIÓN: Si falló, penalizamos levemente la palabra pulsada (B)
                if (!esExito && idSeleccionado) {
                        await this.actualizarExpedientePalabra(idSeleccionado, "1", false, 0, -5, idObjetivo);
                }
        }

        /**
         * PERSISTENCIA EN INDEXEDDB
         * Gestiona la lectura/escritura de los expedientes individuales.
         */
        async actualizarExpedientePalabra(idPalabra, idAcep, exito, ms, deltaM, idConfundidaCon = null) {
                const transaccion = this.db.transaction(["lexico"], "readwrite");
                const almacen = transaccion.objectStore("lexico");

                // Buscamos el registro actual o creamos la "Ficha Semilla"
                const solicitud = almacen.get(idPalabra);

                solicitud.onsuccess = () => {
                        let reg = solicitud.result || {
                                id: idPalabra,
                                m: 0, // Maestría (0-100)
                                s: {}, // Significados/Acepciones
                                c: {}  // Confusiones { id_enemigo: cantidad }
                        };

                        // Aseguramos que la acepción existe en el registro
                        if (!reg.s[idAcep]) {
                                reg.s[idAcep] = {
                                        d: { v: 0, a: 0, t: 0 }, // d: directo
                                        i: { v: 0, a: 0, t: 0 }  // i: inverso
                                };
                        }

                        const stats = this.idiomaInvertido ? reg.s[idAcep].i : reg.s[idAcep].d;

                        // Actualizamos Vistas y Aciertos
                        stats.v++;
                        if (exito) stats.a++;

                        // Actualizamos Tiempo Medio (Media Móvil Exponencial)
                        if (exito && ms > 0) {
                                stats.t = stats.t === 0 ? ms : Math.round((ms * 0.3) + (stats.t * 0.7));
                        }

                        // Actualizamos Maestría (Acotada entre 0 y 100)
                        reg.m = Math.max(0, Math.min(100, reg.m + deltaM));

                        // Si hay confusión, registramos el "enemigo"
                        if (idConfundidaCon) {
                                reg.c[idConfundidaCon] = (reg.c[idConfundidaCon] || 0) + 1;
                        }

                        almacen.put(reg);
                };
        }






}
