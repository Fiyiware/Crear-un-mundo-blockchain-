# Adaptadores de proveedores

Cada proveedor externo se integra detrás de una interfaz estable, de modo que
pasar de **simulado → sandbox real → producción** sólo cambia el adaptador,
no el orquestador.

| Capa | Interfaz | Simulado (hoy) | Sandbox real (siguiente paso) |
|------|----------|----------------|-------------------------------|
| KYC | `kyc` | `simulated/kyc.js` | SDK de verificación del partner EDE |
| Rampa de entrada UE | `onRamp` | `simulated/onRamp.js` (estilo Monerium) | Monerium Sandbox API (EURe) |
| Blockchain | `chain` | `simulated/chain.js` (libro mayor tipo EVM) | Polygon Amoy (ERC-20 EURe) |
| Rampa de salida LatAm | `offRamp` | `simulated/offRamp.js` (estilo Bitso) | Bitso Sandbox (conversión + payout) |

## Contratos

```text
kyc.startVerification(user)            -> { sessionId, sdkToken, provider }
kyc.getDecision(sessionId)             -> { status: APPROVED|REJECTED|PENDING, reason? }
kyc.screenName(fullName)               -> { hit: boolean, list? }

onRamp.createPaymentIntent({ transferId, amountMinor, method, user })
                                       -> { paymentId, method, instructions }
onRamp.mintToWallet({ paymentId, amountMinor, toAddress })
                                       -> { mintId, txHash, token, amountMinor }

chain.createWallet(label)              -> { address }
chain.balanceOf(token, address)        -> amountMinor
chain.transfer({ token, from, to, amountMinor }) -> { txHash, status }
chain.waitForConfirmation(txHash)      -> { txHash, blockNumber, confirmations, status }
chain.explorerUrl(txHash)              -> string

offRamp.getMidRate(token, currency)    -> number
offRamp.getDepositAddress(token)       -> address
offRamp.convert({ token, amountMinor, currency, reference }) -> { orderId, receivedMinor, rate }
offRamp.payout({ method, recipient, amountMinor, currency, reference }) -> { payoutId, status }
offRamp.getPayout(payoutId)            -> { payoutId, status, completedAt? }
```
