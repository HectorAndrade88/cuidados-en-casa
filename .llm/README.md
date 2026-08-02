# Contexto para asistentes LLM · Cuida

Lee **solo lo que necesites**. Cada archivo es autónomo y está pensado para
evitar que tengas que abrir `index.html` (3.700 líneas, ~170 KB ≈ 45k tokens).

| Archivo | Léelo cuando… | Tokens aprox. |
|---|---|---|
| `ARQUITECTURA.md` | necesites entender módulos, arranque y modos de datos | ~900 |
| `MAPA.md` | busques dónde vive algo dentro de `index.html` | ~800 |
| `DATOS.md` | toques el estado, Firestore o el historial | ~700 |
| `UI.md` | cambies estilos, tokens, iconos o responsive | ~900 |
| `CONVENCIONES.md` | vayas a escribir código en este repo | ~600 |
| `TAREAS.md` | hagas un cambio típico (añadir vista, campo, acción) | ~700 |

## Reglas de oro (léelas siempre)

1. **Todo vive en `index.html`**: HTML + CSS + JS en un solo archivo. No hay
   build, ni bundler, ni framework. No propongas Vue/React/Tailwind.
2. **Usa `Grep` antes que `Read`**. Abrir el archivo entero desperdicia el
   presupuesto de contexto. Busca el símbolo y lee ±40 líneas.
3. **La CSP es estricta**: sin fuentes web, sin CDN, sin `fetch` a terceros.
   Solo se permiten dominios de Firebase/Google. Ver `UI.md`.
4. **Español en todo lo visible**: textos, comentarios y nombres de dominio
   (`cuidadores`, `rescates`, `sintomas`).
5. **Accesibilidad no es opcional**: contraste AA, `--tap:44px`, `aria-label`
   en controles de solo icono, `.sr-only` para etiquetas invisibles.

## Cómo navegar sin gastar tokens

```bash
# Encontrar una función/clase
grep -n "nombreDelMetodo" index.html

# Ver una vista concreta (todas terminan en HTML())
grep -n "HTML(){" index.html

# Ver el enrutador de acciones de la interfaz
grep -n "case '" index.html
```

## Mantenimiento de esta carpeta

Si cambias arquitectura, modelo de datos o convenciones, actualiza el archivo
correspondiente **en el mismo commit**. Documentación desactualizada es peor
que ninguna: induce a error al siguiente asistente.
