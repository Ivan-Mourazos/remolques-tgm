/**
 * La impresora del taller es monocroma, así que la conversión a gris la
 * hacemos nosotros: si mandásemos color a una impresora en blanco y negro, la
 * conversión la decidiría el driver y saldría peor que controlándola aquí.
 *
 * El dibujo está autorado por valor (ver `src/lib/geometry/tono.ts`), así que
 * el día que llegue una impresora en color basta con poner esto a `false` y el
 * mismo dibujo sale en color con el volumen intacto.
 *
 * No es una preferencia del usuario ni va en variable de entorno: es una
 * propiedad del taller, y hasta que cambie la impresora nadie debería poder
 * cambiarla por accidente.
 */
export const SALIDA_MONOCROMA = true;
