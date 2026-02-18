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

                this.listaCategoriasSeleccionadas = [];
                // 📊 ESTADO INICIAL DEL JUEGO
                this.nivelSeleccionado = "nvl-1"; // Empezamos en modo Semilla 🌱
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
                <button class="boton-accion-masiva-categorias" data-accion="alternar-todos-temas" id="btn-masivo">
                    ${this.t('btn-categorias-ninguna')}
                </button>
                <div class="grupo-selector-dificultad">
                    <button class="boton-nivel-dificultad" data-accion="cambiar-dificultad" data-id="nvl-1">
                        <span class="icono-nivel">🌱</span>
                        <span class="texto-pista-nivel">${this.t('nvl-1-pista')}</span>
                    </button>
                    <button class="boton-nivel-dificultad" data-accion="cambiar-dificultad" data-id="nvl-2">
                        <span class="icono-nivel">🌿</span>
                        <span class="texto-pista-nivel">${this.t('nvl-2-pista')}</span>
                    </button>
                    <button class="boton-nivel-dificultad" data-accion="cambiar-dificultad" data-id="nvl-3">
                        <span class="icono-nivel">🌳</span>
                        <span class="texto-pista-nivel">${this.t('nvl-3-pista')}</span>
                    </button>
                </div>
            </div>`;

                // 3. Generamos las filas de temas
                let htmlFilas = "";
                this.listaCategoriasSeleccionadas = [];
                catalogoTemas.forEach(tema => {
                        htmlFilas += `
                <div class="boton-fila-seleccion-tema estado-seleccionado" 
                     data-accion="seleccionar-tema" 
                     data-id="${tema.id}">
                    <span class="texto-nombre-categoria">${tema.titulo}</span>
                    <span class="icono-maestria-evolutiva">🌱</span>
                </div>`;
                this.listaCategoriasSeleccionadas.push(tema.id);
                });

                // 4. Inyectamos: Cabecera ANTES del listado, Filas DENTRO del listado
                zonaListado.insertAdjacentHTML('beforebegin', htmlCabecera);
                zonaListado.innerHTML = htmlFilas;

                // 5. Encendemos el neón del nivel inicial
                this.actualizarVisualDificultad();
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
                                case 'seleccionar-tema':
                                        this.gestionarSeleccionFila(objetivo, id);
                                        break;
                                case 'alternar-todos-temas':
                                        this.ejecutarSeleccionMasiva();
                                        break;
                                case 'lanzar-juego':
                                        this.prepararPartida();
                                        break;
                                case 'cambiar-dificultad':
                                        this.gestionarDificultad(objetivo, id); // Aquí 'id' será el nivel (1, 2, 3)
                                        break;
                        }
                });
        }
       
        actualizarVisualDificultad() {
                // 1. Buscamos todos los botones de dificultad
                const botones = document.querySelectorAll('.boton-nivel-dificultad');

                // 2. Limpiamos el brillo de todos y encendemos solo el seleccionado
                botones.forEach(btn => {
                        btn.classList.remove('estado-activo');
                        if (btn.dataset.id === this.nivelSeleccionado) {
                                btn.classList.add('estado-activo');
                        }
                });
        }

        
        gestionarDificultad(elemento, idNivel) {
                this.nivelSeleccionado = idNivel; // Guardamos nvl-1, nvl-2 o nvl-3
                this.actualizarVisualDificultad();
                console.log(`[Dificultad] Cambiada a: ${idNivel}`);

                // Opcional: Podríamos guardar esto en IndexedDB aquí mismo
        }
       
        gestionarSeleccionFila(elemento, id) {
                // 1. Efecto visual (Neón)
                elemento.classList.toggle('estado-seleccionado');

                // 2. Lógica de datos: ¿Añadir o Quitar de la lista de juego?
                if (elemento.classList.contains('estado-seleccionado')) {
                        // Si no está ya, lo metemos
                        if (!this.listaCategoriasSeleccionadas.includes(id)) {
                                this.listaCategoriasSeleccionadas.push(id);
                        }
                } else {
                        // Si lo desmarca, lo sacamos del array
                        this.listaCategoriasSeleccionadas = this.listaCategoriasSeleccionadas.filter(item => item !== id);
                }

                console.log("Categorías activas:", this.listaCategoriasSeleccionadas);
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
                                this.listaCategoriasSeleccionadas = [];
                        } else {
                                // ACTIVAR TODO
                                boton.classList.add('estado-seleccionado');
                                if (!this.listaCategoriasSeleccionadas.includes(idTema)) {
                                        this.listaCategoriasSeleccionadas.push(idTema);
                                }
                        }
                });

                // Actualizamos el texto del botón usando el traductor
                btnMasivo.innerText = todosSeleccionados ? this.t('btn-categorias-todas') : this.t('btn-categorias-ninguna');

                console.log("Selección masiva:", this.listaCategoriasSeleccionadas);
        }








}
