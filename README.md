# Remesas LatAm — España ➔ Colombia / El Salvador

Prototipo (MVP, Fase 1 · sandbox) de una plataforma de remesas de bajo coste
que usa **stablecoins euro (EURe/EURC) como capa de liquidación** sobre
blockchain, con una experiencia **100 % fiat-to-fiat** para el usuario:
paga en euros (Bizum, tarjeta, SEPA) y el destinatario recibe pesos en Nequi,
Daviplata o banco (Colombia) o dólares (El Salvador).

```
[Usuario ES] --€ Bizum/Tarjeta/SEPA--> [Rampa UE · EDE (Monerium)] --emite EURe-->
[Polygon/Solana/Stellar] --transfer token--> [Rampa LatAm (Bitso)] --COP/USD--> [Nequi/Daviplata/Banco]
```

| Carpeta | Contenido |
|---------|-----------|
| [`backend/`](backend) | API Node.js: auth, KYC, cotizaciones, destinatarios, orquestador de liquidación, webhooks, tesorería y auditoría |
| [`mobile/`](mobile) | App React Native / Expo (iOS, Android y web) |
| [`docs/`](docs) | [Arquitectura](docs/arquitectura.md), [pack Sandbox Regulatorio](docs/sandbox-regulatorio.md), [Memoria Justificativa](docs/memoria-justificativa.md), [evidencias](docs/evidencias) (informe de pruebas, vídeo), [capturas](docs/capturas) |

## Arranque rápido

Requisitos: Node.js ≥ 20.

```bash
# 1. Backend (modo simulado, sin claves)
cd backend
npm install
npm test                 # 21 tests: dominio + flujo end-to-end
npm run demo             # demo en consola: 200 € ➔ COP en Nequi con trazabilidad completa
npm run plan-pruebas     # 100 operaciones simuladas ➔ docs/evidencias/plan-pruebas-informe.md
npm run verificar-sandbox  # conexión con los sandbox reales (requiere claves en backend/.env)
npm start                # API en http://localhost:4000

# 2. App móvil (en otra terminal)
cd mobile
npm install
npm run web       # o: npm run android / npm run ios (Expo Go)
```

En un móvil físico, crea `mobile/.env` con `EXPO_PUBLIC_API_URL=http://<IP-de-tu-ordenador>:4000`.

**Datos de prueba**: DNI `12345678Z`, Nequi `3001234567`, cédula `1020304050`,
DUI `00016297-5`. Nombre de destinatario `Juan Sancionado` ➔ bloqueo AML;
cédula `9999999999` ➔ fallo de abono con reembolso automático.

## Estado del MVP

| Requisito del briefing | Estado |
|---|---|
| Registro e inicio de sesión seguro | ✅ scrypt + token HMAC |
| Módulo KYC (documento + facial vía partner) | ✅ simulado; interfaz lista para el SDK del EDE |
| Calculadora de cambio en tiempo real | ✅ modos "envío" y "recepción", cotización bloqueada 120 s |
| Pasarela de pago de euros | ✅ Bizum / tarjeta / SEPA simulados + webhook firmado |
| Gestión de destinatarios (cédula, Nequi, cuenta local, DUI) | ✅ con validación por país |
| Historial y estado en tiempo real | ✅ timeline por etapas, sondeo desde la app |
| Integración rampa UE (Monerium) | 🟡 adaptador simulado; falta conectar Monerium Sandbox |
| Integración blockchain (testnet) | 🟡 libro mayor simulado tipo EVM; falta adaptador Polygon Amoy |
| Integración rampa LatAm (Bitso) | 🟡 adaptador simulado; falta conectar Bitso Sandbox |
| Cumplimiento: límites (300 €/op.), screening, auditoría | ✅ versión piloto |

Siguientes pasos detallados en [docs/arquitectura.md](docs/arquitectura.md#hoja-de-ruta-técnica).
