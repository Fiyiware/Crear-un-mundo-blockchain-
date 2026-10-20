# Pack de solicitud — Sandbox Regulatorio (Ley 7/2020)

> Documento de trabajo técnico. No constituye asesoramiento legal: la
> estrategia regulatoria debe validarse con asesores especializados en
> servicios de pago, MiCA y prevención del blanqueo de capitales.

La solicitud se presenta en la sede electrónica de la Secretaría General
del Tesoro y Financiación Internacional, en el periodo que se abra para
cada cohorte. La evalúan el Banco de España, la CNMV y/o la DGSFP según la
materia.

## Estado del pack

| Pieza | Estado | Dónde |
|---|---|---|
| 1. Memoria Justificativa | 🟡 Borrador técnico; faltan datos del promotor, mercado y partners | [memoria-justificativa.md](memoria-justificativa.md) |
| 2a. Vídeo de la demo de la app | 🟡 Grabado en entorno simulado; volver a grabar con testnet | [evidencias/demo-app.mp4](evidencias/demo-app.mp4) |
| 2b. Prueba de integración con sandbox de proveedor | 🟡 Script listo; faltan credenciales | `cd backend && npm run verificar-sandbox` |
| 2c. Plan de pruebas (100 operaciones) | ✅ Simulado · 🟡 repetir con sandbox reales | `npm run plan-pruebas` ➔ [informe](evidencias/plan-pruebas-informe.md) |
| 3. Esquema de cumplimiento (KYC/AML, límites, riesgos) | 🟡 Descrito en la memoria §7; falta manual AML con el partner | [memoria §7](memoria-justificativa.md#7-cumplimiento-normativo-y-gestión-de-riesgos) |

## Límites del piloto (implementados)

| Parámetro | Valor (configurable en `backend/src/config.js`) |
|---|---|
| Importe por operación | 10 € – 300 € |
| Volumen por usuario | 600 € / 24 h · 1.500 € / 30 días |
| Corredores | ES ➔ CO (principal), ES ➔ SV (secundario) |

## Pendiente antes de presentar

**Técnico**
- [ ] Credenciales de Monerium Sandbox (o Bit2Me) y Bitso Sandbox; ejecutar `npm run verificar-sandbox` y guardar el informe generado.
- [ ] Adaptador real de Polygon Amoy; repetir `npm run plan-pruebas` y volver a grabar el vídeo con transacciones visibles en el explorador.
- [ ] Custodia de claves de tesorería (HSM/MPC) y plan de seguridad.

**Documental**
- [ ] Datos de mercado con fuente oficial: coste medio del Banco Mundial (*Remittance Prices Worldwide*) para ES ➔ CO y ES ➔ SV; población residente (INE); volumen de remesas (Banco de España).
- [ ] Confirmar licencias y cobertura de los partners (Monerium, Bit2Me, Bitso, Buda.com) y si Bitso puede abonar en Nequi/Daviplata.
- [ ] Decidir el modelo de precio definitivo: con 0,99 € fijos el coste supera el 1,5 % en envíos menores de unos 100 €.
- [ ] Cartas de intención de los partners.

**Legal y cumplimiento**
- [ ] Revisión por asesor de la normativa afectada (RDL 19/2018, Ley 10/2010, MiCA, Reglamento 2023/1113, RGPD).
- [ ] Manual de prevención del blanqueo con el partner (diligencia reforzada, comunicación de operaciones sospechosas).
- [ ] Consentimiento informado de los participantes y garantía para cubrir la responsabilidad del promotor (seguro, aval o fondo).
- [ ] Evaluación de impacto en protección de datos y transferencias internacionales de datos.
- [ ] Plan de salida: agente de una entidad autorizada o licencia propia.

**Administrativo**
- [ ] Certificado digital del firmante (persona física o representante de la sociedad).
- [ ] Exportar la memoria a PDF y presentar en la convocatoria abierta.
