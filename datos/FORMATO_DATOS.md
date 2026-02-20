# 📘 Especificación del Formato JSON: LexiAprende

Este documento define la arquitectura de los archivos de datos (vocabulario) situados en la carpeta `/datos`. Se utiliza una nomenclatura de claves de una sola letra para optimizar el peso del archivo y la velocidad de procesamiento.

---

## 🏗️ Estructura del Archivo
Cada archivo `.json` es un objeto con:
*   **`config`**: Metadatos de la categoría (ID, Título).
*   **`vocabulario`**: Array de objetos de palabra.

---

## 🔑 Diccionario de Claves (Atributos de Palabra)


| Clave | Nombre Real | Origen / Por qué esta letra |
| :---: | :--- | :--- |
| **`id`** | **ID** | Identificador único global (ej: `eu-etx-001`). |
| **`p`** | **Palabra** | Lo que se **P**inta en pantalla. Es un Array: `[Texto, Imagen, Audio]`. |
| **`k`** | **Kontzeptua** | La **K**ey o raíz semántica. Une palabras con la misma "esencia". |
| **`r`** | **Rareza** | **R**elevancia o dificultad (1: Básico, 2: Medio, 3: Experto). |
| **`e`** | **Especial** | **E**tiquetas o Metadatos con prefijos técnicos. |
| **`s`** | **Sentidos** | **S**ignificados o acepciones para gestionar la polisemia. |
| **`t`** | **Traducción** | El **T**exto de la respuesta correcta (dentro de `s`). |
| **`sin`** | **Sinónimos** | Array de IDs de palabras vinculadas por igualdad. |
| **`ant`** | **Antónimos** | Array de IDs de palabras vinculadas por oposición. |

---

## 🏷️ Sistema de Prefijos en Etiquetas (`e`)

Para que el motor filtre inteligentemente, las etiquetas especiales usan prefijos:

*   **`d:` (Dialecto):** `d:biz` (bizkaiera), `d:gip` (gipuzkoano), `d:bat` (batua).
*   **`t:` (Temporalidad):** `t:arc` (arcaísmo), `t:mod` (moderno).
*   **`r:` (Registro):** `r:col` (coloquial), `r:for` (formal), `r:hka` (hika).
*   **`u:` (Uso):** `u:tec` (técnico), `u:rur` (rural).
*   **`v:` (Vínculo):** `v:raiz` (etiqueta extra para agrupaciones manuales).

---

## ⚠️ Reglas de Oro de Sintaxis
1. **PROHIBIDO COMENTAR:** No uses `//` o `/* */` dentro del JSON o fallará el motor.
2. **MINÚSCULAS:** Los IDs y las etiquetas (`e`) siempre en minúsculas.
3. **COMA FINAL:** No dejes una coma suelta tras el último elemento de un array o un objeto.
4. **UNIDAD DE K:** Si dos palabras significan lo mismo (ej: "Aitona" y "Aitita"), deben compartir la misma **`k`** (`"abuelo"`).
