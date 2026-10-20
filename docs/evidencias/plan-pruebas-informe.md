# Informe del plan de pruebas (entorno simulado)

Generado: 2026-10-20T16:56:08.547Z · Red: polygon-amoy (simulada) · Token: EURe · Node v22.22.0

> Las cifras de tiempo miden el procesamiento interno del orquestador sin
> latencia de red real. Deben repetirse con los sandbox reales de los
> proveedores (Monerium, Bitso, Polygon Amoy) antes de presentarlas como
> tiempos de liquidación.

## Resumen

| Indicador | Resultado |
|---|---|
| Operaciones ejecutadas | 100 |
| Resultado conforme a lo esperado | 100 / 100 (100 %) |
| Envíos completados | 75 |
| Tiempo de procesamiento interno (media / p95 / máx.) | 2.3 ms / 3.5 ms / 6.2 ms |
| Coste total para el usuario (media / mín. / máx.) | 1.72 % / 0.83 % / 10.30 % |
| Volumen enviado (completados) | 11.677,00 € |
| Coste para los usuarios con esta solución | 132,15 € |
| Coste con la referencia de mercado (6 %) | 700,62 € |
| Ahorro estimado para las familias | **568,47 €** |

La referencia de mercado (6 %) es un parámetro: sustitúyase por el coste medio oficial del corredor España ➔ Colombia / El Salvador publicado por el Banco Mundial (*Remittance Prices Worldwide*) y cítese la fuente en la memoria.

> **Comisión fija:** con 0,99 € por envío, el coste porcentual es mayor en los envíos pequeños (10.30 % en el mínimo de 10 €) y baja hacia el 0,8 % en los grandes. Si se quiere comunicar un coste máximo del 1–1,5 %, hay que revisar la comisión fija o fijar un importe mínimo más alto.

## Resultados por escenario

| Escenario | Operaciones | Resultado esperado | Conformes |
|---|---|---|---|
| Envío estándar | 70 | `COMPLETED` | 70 / 70 |
| Abono rechazado en destino | 10 | `REFUNDED` | 10 / 10 |
| Destinatario en lista de sanciones | 5 | `REJECTED:COMPLIANCE_REVIEW` | 5 / 5 |
| Importe superior al límite | 5 | `REJECTED:AMOUNT_OUT_OF_RANGE` | 5 / 5 |
| Notificación de pago duplicada | 5 | `COMPLETED` | 5 / 5 |
| Cancelación antes del pago | 5 | `CANCELLED` | 5 / 5 |

## Envíos completados por método de cobro

| Método | Completados | Coste medio |
|---|---|---|
| NEQUI | 15 | 1.96 % |
| DAVIPLATA | 15 | 1.63 % |
| BANK_CO | 15 | 1.37 % |
| BANK_SV | 15 | 2.14 % |
| WALLET_SV | 15 | 1.50 % |

## Controles verificados

| Control | Resultado |
|---|---|
| Todas las operaciones obtienen el resultado esperado | ✅ Cumple |
| Trazabilidad completa (8 estados + hash de emisión y de transferencia) en el 100 % de las completadas | ✅ Cumple |
| Sin doble emisión de tokens ante webhooks duplicados | ✅ Cumple |
| Conciliación de tesorería on-chain (saldo = comisiones cobradas) | ✅ Cumple |
| Reembolso íntegro en el 100 % de los abonos fallidos | ✅ Cumple |
| Sin margen FX negativo | ✅ Cumple |
| Ninguna operación supera el límite por operación del piloto | ✅ Cumple |

## Conciliación

- Saldo de la wallet de tesorería: 84,15 € · comisiones esperadas: 84,15 €
- Euros recibidos de usuarios: 13.215,74 € · reembolsados: 1482,89 €

## Límites aplicados

10,00 € – 300,00 € por operación · 600,00 € / 24 h · 1500,00 € / 30 días por usuario.

El detalle de cada operación (importes, hash de transacción y resultado) está en `plan-pruebas-resultados.json`.
