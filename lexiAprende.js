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
                this.tablaMutacionesInfernua = {
                        "a": ["e", "o"], "e": ["a", "i"], "i": ["e", "u"], "o": ["a", "u"], "u": ["i", "o"],
                        "s": ["z", "x"], "z": ["s", "x"], "x": ["s", "z"],
                        "ts": ["tz", "tx"], "tz": ["ts", "tx"], "tx": ["ts", "tz"],
                        "rr": ["r"], "r": ["rr"]
                };


                //  VARIABLES DE ESTADO Y ACOPLAMIENTO
                // -------------------------------------------------------------------------
                // 1. nivelDificultadSeleccionado: [String] "nvl-1", "nvl-2", "nvl-3"
                //    Modifica: gestionarDificultad() | Consume: evaluarRespuesta()
                this.nivelDificultadSeleccionado = "nvl-1";




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


                this.modoInfernuaActivo = false;
                this.modoTiempoCongelado = false;
                this.modoMareoActivo = false;
                this.idiomaInvertido = false;
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
                                case 'comprobar-respuesta':
                                        this.comprobarRespuesta(id);
                                        break;
                                case 'volver-menu':
                                        this.volverAlMenuPrincipal();
                                        break;
                                case 'frenar-ruleta':
                                        this.frenarRuleta();
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
                if (this.modoMareoActivo) {
                        this.idiomaInvertido = Math.random() > 0.5;
                        console.log("MAREA: Sentido de la pregunta invertido:", this.idiomaInvertido);
                }
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
        async generarOpcionesRespuesta(bolsaFiltrada) {
                const contenedor = document.getElementById('opciones-respuesta');
                if (!contenedor) return;
                contenedor.innerHTML = "";

                const correcta = this.preguntaActual;
                let opcionesFinales = [];

                // 👹 BIFURCACIÓN: MODO INFERNUA (Castellano -> Euskera Mutado)
                if (this.modoInfernuaActivo) {
                        opcionesFinales.push(correcta);

                        // 1. Obtenemos el texto base de la pregunta (p)
                        const textoParaMutar = Array.isArray(correcta.p) ? correcta.p[0] : correcta.p;

                        // 2. Creamos 3 clones con el ADN completo de la palabra original
                        for (let i = 0; i < 3; i++) {
                                const mutada = this.generarSombraInfernua(textoParaMutar);
                                opcionesFinales.push({
                                        ...correcta, // 🧬 HEREDAMOS TODO EL OBJETO (id, s, k, r, e...)
                                        id: `sombra-${i}-${Date.now()}`, // Pero le damos un ID único para el DOM
                                        p: [mutada] // Sobrescribimos solo el texto con la mutación
                                });
                        }
                }
                else {
                        // --- MODO NORMAL (Traducción Estándar) ---

                        // A. PREGUNTA (El texto grande de arriba)
                        // Si invertido es true: Preguntamos en Castellano (s.t)
                        // Si invertido es false: Preguntamos en Euskera (p)
                        const textoPregunta = this.idiomaInvertido ? correcta.s.t : correcta.p;
                        document.getElementById('palabra-objetivo').innerText = textoPregunta;

                        // B. RESPUESTAS (Los botones)
                        let posiblesDistractores = bolsaFiltrada.filter(item => String(item.id) !== String(correcta.id));

                        if (posiblesDistractores.length < (this.numOpciones - 1)) {
                                posiblesDistractores = this.datosCargados.filter(item => String(item.id) !== String(correcta.id));
                        }

                        this.mezclarArray(posiblesDistractores);
                        const seleccionados = posiblesDistractores.slice(0, this.numOpciones - 1);
                        opcionesFinales = [correcta, ...seleccionados];
                }


                // --- 🔄 PINTADO FINAL DE BOTONES ---
                this.mezclarArray(opcionesFinales);

                opcionesFinales.forEach(opcion => {
                        const btn = document.createElement('button');
                        btn.className = 'boton-opcion-examen-neon';

                        // Si estamos en el Averno, aplicamos la clase de pánico visual
                        if (this.modoInfernuaActivo) btn.classList.add('is-infierno-vibe');

                        btn.dataset.accion = 'comprobar-respuesta';
                        btn.dataset.id = String(opcion.id);

                        // 🎯 ACCESO POSICIONAL:
                        // Si idiomaInvertido es true (B->A): El botón muestra Euskera (p[0])
                        // Si idiomaInvertido es false (A->B): El botón muestra Castellano (s.t)

                        // En modo Infernua, como forzamos B->A, siempre entrará por opcion.p[0]
                        if (this.idiomaInvertido || this.modoInfernuaActivo) {
                                // Si p es un array, pillamos el índice 0. Si ya es un string, lo usamos tal cual.
                                btn.innerText = Array.isArray(opcion.p) ? opcion.p[0] : opcion.p;
                        } else {
                                // En modo normal A->B, mostramos la traducción del sentido
                                btn.innerText = opcion.s.t;
                        }

                        contenedor.appendChild(btn);
                });

                this.timestampInicioPregunta = Date.now();
                this.iniciarTemporizador();
        }




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
         * ⚖️ Evalúa el clic y revela la solución visualmente
         */
        comprobarRespuesta(idSeleccionado) {
                if (this.relojActivo) clearInterval(this.relojActivo);

                // Si es timeout (null), el tiempo es el máximo (this.tiempoBase)
                const tiempoReaccion = idSeleccionado ? (Date.now() - this.timestampInicioPregunta) : (this.tiempoBase * 1000);

                const idObjetivo = String(this.preguntaActual.id);
                const esExito = (String(idSeleccionado) === idObjetivo);

                // Feedback visual: revelamos la correcta aunque no haya pulsado nada
                const botones = document.querySelectorAll('.boton-opcion-examen-neon');
                botones.forEach(btn => {
                        btn.style.pointerEvents = "none";
                        if (btn.dataset.id === idObjetivo) btn.classList.add('revelar-correcta');
                        if (idSeleccionado && btn.dataset.id === idSeleccionado && !esExito) btn.classList.add('revelar-error');
                });

                // Enviamos a evaluación: idObjetivo NUNCA es null, así que la BD no fallará
                this.evaluarRespuesta(idSeleccionado, tiempoReaccion);

                if (esExito) {
                        this.gestionarAcierto(tiempoReaccion);
                } else {
                        this.gestionarFallo(idSeleccionado);
                }
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
                const esTimeout = (idSeleccionado === null);


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

                // 5. LÓGICA DE PENALIZACIÓN EXTRA (Timeout con 2 opciones)
                if (esTimeout && this.numOpciones === 2) {
                        // Buscamos cuál era la otra opción que estaba en pantalla
                        const botones = document.querySelectorAll('.boton-opcion-examen-neon');
                        botones.forEach(btn => {
                                const idOtra = btn.dataset.id;
                                if (idOtra !== idObjetivo) {
                                        console.log(`⚠️ Doble penalización por Timeout en 50/50: ${idOtra}`);
                                        this.actualizarExpedientePalabra(idOtra, "1", false, 0, -10);
                                }
                        });
                }

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

                // Si no hay ID de palabra (porque fue un timeout y estamos evaluando la 'confusión'), salimos
                if (!idPalabra) return; // evita registrar confusión de palabra con la nada

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
        /**
         * 🌟 GESTIÓN DE ACIERTO
         * Suma puntos, sube la racha y comprueba si toca Ruleta
         */
        gestionarAcierto(ms) {
                // 1. Sumamos puntos (Fórmula simple de momento)
                const puntosGanados = Math.round((this.numOpciones * 10) + (10000 / ms));
                if (this.tiempoBase === 5) puntosGanados *= 2;
                this.puntosTotales += puntosGanados;

                // 2. Subimos la racha
                this.indiceRachaActual++;

                console.log(`✅ ACIERTO: Racha ${this.indiceRachaActual} | Puntos +${puntosGanados}`);

                // 3. ¿Hemos llegado al objetivo de la Ruleta (5)?
                if (this.indiceRachaActual >= this.objetivoRacha) {
                        this.lanzarRuleta();
                } else {
                        // Si no hay ruleta, siguiente pregunta tras pequeña pausa
                        setTimeout(() => this.siguientePregunta(), 600);
                }
                document.getElementById('marcador-racha').innerText = `${this.indiceRachaActual}/${this.objetivoRacha}`;
        }

        /**
         * 💔 GESTIÓN DE FALLO
         * Resta vida, resetea racha y comprueba Game Over
         */
        gestionarFallo(idSeleccionado) {
                this.vidasRestantes--;
                this.indiceRachaActual = 0; // La racha se rompe cruelmente

                console.log(`❌ FALLO: Vidas restantes ${this.vidasRestantes}`);

                // Actualizamos visualmente los corazones (quitamos el que latía)
                this.actualizarCorazonesVisual(null);

                if (this.vidasRestantes <= 0) {
                        this.finalizarExamen();
                } else {
                        // Pausa un poco más larga para que el usuario asimile el error
                        setTimeout(() => this.siguientePregunta(), 1200);
                }
                document.getElementById('marcador-racha').innerText = `${this.indiceRachaActual}/${this.objetivoRacha}`;
        }

        /**
         * 🏁 FINALIZAR EXAMEN: Resumen de la partida y retorno al menú
         */
        finalizarExamen() {
                // limpieza ...
                this.modoInfernuaActivo = false;
                this.modoTiempoCongelado = false;
                this.modoMareoActivo = false;
                this.tiempoBase = 10;


                if (this.relojActivo) clearInterval(this.relojActivo);

                console.log("💀 GAME OVER. Procesando estadísticas finales...");

                const zonaJuego = document.getElementById('tablero-juego');

                // 1. Estructura de la pantalla de resultados
                const htmlResultados = `
            <div class="pantalla-resultados-neon">
                <h1 class="titulo-game-over">${this.t('game-over-titulo') || 'FIN DEL EXAMEN'}</h1>
                
                <div class="dato-resultado">
                    Puntos totales: <span class="valor-destacado">${this.puntosTotales}</span>
                </div>
                
                <div class="dato-resultado">
                    Máxima racha: <span class="valor-destacado">${this.rachaMaximaSesion || 0}</span>
                </div>

                <div class="lista-palabras-repaso">
                    <p style="color: #666; font-size: 0.8rem">Palabras a reforzar:</p>
                    <div id="contenedor-repaso-final"></div>
                </div>

                <button class="boton-lanzar-partida-neon" data-accion="volver-menu">
                    ${this.t('btn-volver') || 'VOLVER AL MENÚ'}
                </button>
            </div>
        `;

                zonaJuego.innerHTML = htmlResultados;

                // 2. Aquí podríamos pedir a IndexedDB las 3 palabras con más fallos de hoy
                this.mostrarSugerenciasRepaso();
        }

        /**
         * 🔄 Vuelve al estado inicial del menú de selección
         */
        volverAlMenuPrincipal() {
                // Reseteamos variables de partida para la próxima
                this.vidasRestantes = 3;
                this.puntosTotales = 0;
                this.indiceRachaActual = 0;
                this.numOpciones = 2;

                // Recargamos el menú (usando el catálogo que ya tenemos en memoria)
                this.mostrarMenu(this.datosCatalogoCache);
        }

        /**
         * 🕵️ Analiza IndexedDB y muestra las 3 palabras que más se le han atragantado al usuario
         */
        async mostrarSugerenciasRepaso() {
                const contenedor = document.getElementById('contenedor-repaso-final');
                if (!contenedor || !this.db) return;

                const transaccion = this.db.transaction(["lexico"], "readonly");
                const almacen = transaccion.objectStore("lexico");
                const todasLasPalabras = [];

                // 1. Recogemos todas las palabras del expediente para compararlas
                const peticion = almacen.openCursor();
                peticion.onsuccess = (e) => {
                        const cursor = e.target.result;
                        if (cursor) {
                                todasLasPalabras.push(cursor.value);
                                cursor.continue();
                        } else {
                                // 2. Cuando tenemos todo, ordenamos por mayor número de fallos (directo o inverso)
                                const sospechosas = todasLasPalabras
                                        .filter(p => (p.d.v > 0 || p.i.v > 0)) // Solo palabras que ha visto
                                        .sort((a, b) => {
                                                const fallosA = (a.d.fallos || 0) + (a.i.fallos || 0);
                                                const fallosB = (b.d.fallos || 0) + (b.i.fallos || 0);
                                                return fallosB - fallosA; // De más fallos a menos
                                        })
                                        .slice(0, 3); // Nos quedamos con el "Top 3"

                                // 3. Pintamos las sugerencias en el menú de Game Over
                                if (sospechosas.length > 0) {
                                        let html = "";
                                        sospechosas.forEach(p => {
                                                const fallos = (p.d.fallos || 0) + (p.i.fallos || 0);
                                                html += `<div class="item-repaso">⚠️ <b>${p.id.split('-').pop().toUpperCase()}</b>: fallo ${fallos} veces</div>`;
                                        });
                                        contenedor.innerHTML = html;
                                } else {
                                        contenedor.innerHTML = "<div class='item-repaso'>✨ ¡Partida perfecta! Sin errores.</div>";
                                }
                        }
                };
        }

        /**
 * 🎡 LANZAR RULETA: Genera el visor y los premios
 */
        lanzarRuleta() {
                if (this.relojActivo) clearInterval(this.relojActivo);
                this.modoInfernuaActivo = false;
                this.modoTiempoCongelado = false;
                this.idiomaInvertido = false;

                this.listaPremios = [
                        { id: 'bizia', t: '❤️ BIZIA (+1)', c: '#00ff88' },
                        { id: 'izoztuta', t: '❄️ IZOZTUTA', c: '#00ccff' },
                        { id: 'infernua', t: '🔥 INFERNUA', c: '#ff4400', m: true },
                        { id: 'marea', t: '🌪️ MAREA', c: '#ff00cc' },
                        { id: 'laster', t: '⚡ LASTER', c: '#ffff00' }
                ];

                const zonaJuego = document.getElementById('tablero-juego');
                // Clonamos la lista varias veces para el efecto visual de giro
                let htmlPremios = "";
                for (let i = 0; i < 30; i++) {
                        const p = this.listaPremios[i % this.listaPremios.length];
                        htmlPremios += `<div class="item-premio ${p.m ? 'maldito' : ''}">${p.t}</div>`;
                }

                zonaJuego.innerHTML = `
            <div class="capa-ruleta-sistema">
                <div class="visor-ruleta">
                    <div id="tira-premios" class="tira-premios" style="transform: translateY(0px);">${htmlPremios}</div>
                </div>
                <button class="boton-disparador-juego-neon" id="btn-frenar-ruleta" data-accion="frenar-ruleta" style="margin-top: 40px">
                    GELDI! / ¡PARAR!
                </button>
            </div>
        `;

                this.posicionRuletaY = 0;
                const tira = document.getElementById('tira-premios');

                // GIRO RÁPIDO INICIAL (Sin transición para que no de tirones)
                this.idGiroRuleta = setInterval(() => {
                        this.posicionRuletaY -= 40; // Velocidad de giro
                        // Si subimos demasiado, reseteamos al inicio del ciclo visual
                        if (Math.abs(this.posicionRuletaY) >= (this.listaPremios.length * 120 * 2)) {
                                this.posicionRuletaY = 0;
                        }
                        tira.style.transform = `translateY(${this.posicionRuletaY}px)`;
                }, 30);
        }


        frenarRuleta() {
                clearInterval(this.idGiroRuleta);
                const tira = document.getElementById('tira-premios');
                const btn = document.getElementById('btn-frenar-ruleta');
                if (btn) btn.style.display = 'none';

                // 1. Calculamos inercia (Avanza entre 5 y 8 posiciones más para realismo)
                const itemsExtra = Math.floor(Math.random() * 4) + 5;
                const destinoFinalY = this.posicionRuletaY - (itemsExtra * 120);

                // 2. Aplicamos la animación de frenado profesional
                tira.style.transition = "transform 2.5s cubic-bezier(0.1, 0.9, 0.2, 1)";
                tira.style.transform = `translateY(${destinoFinalY}px)`;

                // 3. Cálculo del premio basado en la posición final real
                // El Math.abs nos da la distancia total, dividimos por altura y usamos el módulo
                const indiceReal = Math.round(Math.abs(destinoFinalY) / 120) % this.listaPremios.length;
                const premio = this.listaPremios[indiceReal];

                setTimeout(() => {
                        this.aplicarPremio(premio);
                }, 2600);
        }

        generarSombraInfernua(palabra) {
                let mutada = palabra.toLowerCase();
                const azar = Math.random();

                // 1. LA H PILLINA: 40% de probabilidad de meter una H donde no va
                if (azar > 0.6) {
                        const pos = Math.floor(Math.random() * (mutada.length - 1)) + 1;
                        mutada = mutada.slice(0, pos) + "h" + mutada.slice(pos);
                }
                // 2. BAILE DE VOCALES O SIBILANTES: 60% probabilidad
                else {
                        // Buscamos si la palabra tiene alguna letra "mutante"
                        for (let letra in this.tablaMutacionesInfernua) {
                                if (mutada.includes(letra)) {
                                        const reemplazo = this.tablaMutacionesInfernua[letra][Math.floor(Math.random() * this.tablaMutacionesInfernua[letra].length)];
                                        mutada = mutada.replace(letra, reemplazo);
                                        break; // Solo una mutación por palabra para no hacerla ilegible
                                }
                        }
                }
                return mutada.charAt(0).toUpperCase() + mutada.slice(1); // Capitalizamos
        }

        aplicarPremio(premio) {
                console.log(`🎁 APLICANDO PREMIO: ${premio.t}`);

                // 1. Estados Booleanos (Se activan si el ID coincide, se apagan si no)
                this.modoInfernuaActivo = (premio.id === 'infernua');
                this.modoTiempoCongelado = (premio.id === 'izoztuta');
                this.modoMareoActivo = (premio.id === 'marea');

                // 2. Ajustes Numéricos (Tiempo y Vidas)
                // Si es 'laster' (rápido), bajamos el tiempo base a 5s, si no, vuelve a 10s
                this.tiempoBase = (premio.id === 'laster') ? 5 : 10;

                // Si es 'bizia', sumamos una vida (esto es un incremento, no un estado)
                if (premio.id === 'bizia') {
                        this.vidasRestantes = Math.min(5, this.vidasRestantes + 1);
                        this.actualizarCorazonesVisual(null);
                }

                // 3. Feedback visual y retorno al juego
                setTimeout(() => {
                        // Limpiamos la capa de la ruleta y volvemos al examen
                        const capa = document.querySelector('.capa-ruleta-sistema');
                        if (capa) capa.remove();
                        this.siguientePregunta();
                }, 2000);
        }




}
