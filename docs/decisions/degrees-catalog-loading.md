# Lecturas paginadas de carreras

La página /degrees carga la interfaz sin esperar al catálogo completo.
No utiliza getStructuredCatalog: unir todas las asignaturas multiplicaba las
filas SQL y el volumen enviado al navegador aunque solo se vieran 12 tarjetas.

- GET /api/degrees/catalog?q=texto&university=UUID&page=1
  devuelve data (hasta 12 ofertas resumidas) y hasMore. Solicita 13 filas
  para detectar la siguiente página sin ejecutar un COUNT global.
  universities=1 añade las universidades para el selector inicial.
- GET /api/degrees/plans?offering=UUID devuelve data con los planes y
  asignaturas de una sola oferta, solicitado al seleccionarla para comparar.

Las consultas aditivas se mantienen en src/lib/catalog/degrees.ts y reutilizan
la conexión y las entidades comunes. Los endpoints anteriores no cambian.
No se modifica el esquema ni se aplican migraciones.

La búsqueda espera 300 ms al escribir y cancela las peticiones anteriores;
las respuestas obsoletas no sustituyen resultados nuevos. Las alternativas
seleccionadas se guardan separadas de los resultados paginados.

Comprobación manual: seleccionar una oferta, cambiar de página y de filtro,
seleccionar otra y comprobar que ambas siguen en el comparador. Comprobar
búsquedas sin resultados, error/reintento, límite de tres y planes bajo demanda.
La paginación usa orden estable y OFFSET; un catálogo mucho mayor o cambios
concurrentes frecuentes pueden justificar paginación por cursor más adelante.
