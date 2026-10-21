# Estrategia de catálogo CJ → base de datos → Shopify

Notas de octubre 2026. GazuPay queda fuera de esta etapa. La tienda pública es Shopify (plan Grow). El panel operativo corre en una EC2 de AWS y es el único que habla con la API de CJ. La tienda y el administrador leen la base de datos, no CJ, cuando alguien los usa.

## Tamaño del catálogo

Una búsqueda sola de `listV2` se corta en 6.000 productos (`totalRecords`). No sirve para contar ni para bajar el catálogo de un tirón.

La suma por categorías padre, partiendo la categoría que pegaba en ese tope, dio unos **37.000** productos. No son 50.000 confirmados. La importación tiene que ir por categoría (y por subcategoría cuando un padre llegue a 6.000). Si el total real fuera mayor, los días de abajo crecen en la misma proporción.

## Cupo de la API

Todas las cuentas, Free o de pago, parten de **50.000 puntos al día**. Se reponen a las 00:00 UTC. CJ no los entrega de golpe: los suelta durante el día (50.000 / 1.440 minutos, unos 35 puntos por minuto).

| Llamada | Puntos |
|---|---|
| `listV2` (hasta 100 productos por página) | 50 |
| `product/query` (ficha) | 10 |
| `freightCalculate` | 10 |
| `freightCalculateTip` | 10 |
| Stock por producto o por variante | 10 |

Documentación: [límites por nivel](https://developers.cjdropshipping.com/en/api/start/limit.html) y [puntos](https://developers.cjdropshipping.com/en/api/api2/standard/points.html).

Prime (4 consultas por segundo, unos US$20 al mes) es el plan a contratar para que precio, stock y envío no choquen con 1 llamada por segundo. No sube el cupo de 50.000. Advanced llega a 6 por segundo y tampoco sube el cupo.

Si la cuenta pasa 30 días sin ninguna compra en CJ, la API se suspende aunque el plan esté pago.

## Qué no hacer

No consultar ficha + envío de cada producto en el momento de usarlo. Con ficha (10) y las dos cotizaciones de envío (20), más la parte del listado, son unos **30,5 puntos por producto**. El día aguanta unos **1.600 productos** y después CJ responde 429. Publicar en Shopify no gasta puntos de CJ.

No cotizar el envío de los 37.000. El flete depende de la variante y de la ciudad. Se calcula cuando un producto se elige para publicarse.

No pedir el stock variante de todo el catálogo. Cuesta lo mismo que la ficha (10 puntos): otros 8 días.

## Orden de carga

1. **Listado completo a la base de datos.** Unas 370 páginas de 100. Cerca de 18.500 puntos, menos de medio día. Guarda id, nombre, precio, imagen de listado y el stock general `warehouseInventoryNum`. La ficha completa todavía no está.
2. **Fichas de a poco.** 10 puntos cada una. Unos 37.000 son cerca de **8 días** usando el cupo entero (unas 5.000 fichas por día). Esos días no se hacen otras cargas pesadas.
3. **Después, comparar.** Se vuelve a recorrer el listado (otros 18.500 puntos). Si el id no existe, se crea y se encola la ficha. Si existe, se comparan precio y stock del listado. No se vuelve a pagar la ficha.
4. **Shopify recibe solo lo elegido**, con el precio ya calculado. El catálogo completo se queda en la base de datos.

## Mes ya estable

El gasto fijo es un par de recorridos del listado y las fichas nuevas. El stock general sale de ese listado, así que un recuento de todo el catálogo cabe en medio día. La consulta de stock por variante se reserva para los productos publicados en Shopify.

El envío se cotiza al publicar, no en el barrido mensual.
