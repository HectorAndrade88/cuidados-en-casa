# Convenciones de código

## Idioma

- Interfaz, comentarios y mensajes: **español**.
- Nombres de dominio en español: `cuidadores`, `rescates`, `sintomas`,
  `medicamentos`, `historial`.
- API del navegador y utilidades genéricas en inglés: `escapeHtml`, `isoDate`,
  `render`, `bind`. Convive con lo anterior; no lo "unifiques".

## Estilo

- Indentación de 2 espacios.
- Llaves en la misma línea; métodos de una línea permitidos cuando son triviales.
- Plantillas literales para el HTML.
- Comentarios que explican **por qué**, no qué. Los bloques importantes llevan
  cabecera con `/* ===== TÍTULO ===== */`.

## Seguridad

- **Todo dato variable pasa por `escapeHtml()`** al interpolarlo en HTML. Sin
  excepciones: los nombres de medicamentos y las notas los escribe el usuario.
- No introduzcas `innerHTML` con datos sin escapar.
- No añadas dominios externos: rompería la CSP.
- No toques `Vault`, `PinLock` ni las reglas de Firestore sin que te lo pidan.

## Interfaz

- Vistas: métodos que **devuelven cadena**, con sufijo `HTML()`.
- Eventos: **delegación** con `data-action` + `case` en `action(e)`.
  Nunca `onclick` inline en el marcado.
- Dentro de modales, `data-action` no funciona (están fuera de `#main`):
  asigna el manejador por `id`.
- Tras mutar el estado: `this.save()` y luego `render()` o el repintado parcial.
- Diálogos: usa `Modal.open`, `confirmDialog` o `promptDialog`, que ya
  gestionan foco, `Esc` y `[data-close]`. No crees modales a mano.
- Avisos al usuario: `toast(mensaje, 'good' | 'bad')`.
- Cambios de contenido dinámico: `this.announce(...)`.

## Patrón de paginación

Ya existe y es reutilizable. Para paginar una lista nueva:

```js
maquetaBodyHTML(){
  const PER = 5;
  const list = this.state.loQueSea;
  const paginas = Math.max(1, Math.ceil(list.length / PER));
  this.miPage = Math.min(Math.max(this.miPage || 0, 0), paginas - 1); // clamp
  const desde = this.miPage * PER;
  const trozo = list.slice(desde, desde + PER);
  const rows = trozo.map(/* … */).join('') || '<li class="empty">Sin datos.</li>';
  return `<ul class="list">${rows}</ul>` + this.pagerHTML({
    page:this.miPage, paginas, desde, mostrados:trozo.length,
    total:list.length, per:PER, accion:'mi', que:'de los elementos' });
}
```

Luego añade `case 'miPrev'` / `case 'miNext'` en `action()`.

El **clamp es obligatorio**: si un filtro reduce los resultados mientras estás
en la última página, sin él la lista aparece vacía.

## Buscadores sobre listas paginadas

El input debe quedar **fuera** del bloque que se repinta (si no, pierde el
foco al escribir) y el filtro debe aplicarse **al conjunto completo**, no
ocultando filas ya pintadas: si no, solo buscaría dentro de la página visible.
Ver `historyHTML()` / `historyBodyHTML()`.

## Git

- Mensajes en imperativo y en inglés (coherente con el historial existente).
- No hagas commit ni push salvo petición explícita.
