# Preparación para el Sandbox Regulatorio (Banco de España / CNMV / Tesoro)

> Documento de trabajo técnico. No constituye asesoramiento legal: la
> estrategia regulatoria debe validarse con asesores especializados en
> servicios de pago, MiCA y prevención del blanqueo de capitales.

## Qué demuestra el prototipo

| Elemento a acreditar | Evidencia en el MVP |
|---|---|
| Innovación: liquidación en segundos con coste < 1 % | `npm run demo`: 200 € ➔ COP en Nequi, coste total 0,99 %, trazabilidad completa |
| Modelo sin custodia propia de fondos de clientes | Los euros entran por la EDE partner; la plataforma integra vía API |
| Trazabilidad extremo a extremo | Timeline por envío + hash de transacción verificable en el explorador |
| Controles AML/KYC | KYC previo obligatorio, screening de destinatarios, límites por envío y diarios, registro de auditoría |
| Protección del usuario | Tipo de cambio y comisiones mostrados antes de pagar, cotización bloqueada, reembolso automático ante fallo |
| Gestión de riesgos operativos | Máquina de estados estricta, webhooks firmados, idempotencia |

## Límites propuestos para el piloto

| Parámetro | Valor (configurable en `backend/src/config.js`) |
|---|---|
| Importe mínimo por envío | 10 € |
| Importe máximo por envío | 1.000 € |
| Volumen máximo diario por usuario | 3.000 € |
| Corredores | ES ➔ CO (principal), ES ➔ SV (secundario) |

## Pendiente antes de presentar la memoria

- [ ] Conectar sandbox reales (Monerium, Bitso) y repetir la demo con transacciones visibles en Polygon Amoy.
- [ ] Acuerdos de intención con partner EDE en la UE y proveedor de liquidez en LatAm.
- [ ] Manual de prevención de blanqueo (políticas KYC, umbrales de diligencia reforzada, reporte de operaciones sospechosas) junto al partner.
- [ ] Evaluación de impacto de protección de datos (RGPD) y flujo de datos transfronterizo.
- [ ] Plan de salida del sandbox: operación como agente de la EDE (Fase 2) o licencia propia.
- [ ] Métricas del piloto: nº usuarios, volumen, coste medio, tiempo medio de entrega, incidencias.
