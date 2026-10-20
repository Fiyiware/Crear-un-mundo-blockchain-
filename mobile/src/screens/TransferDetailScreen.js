import { useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { api } from '../api';
import { Button, Card, ErrorText, Row, Screen } from '../components/ui';
import { date, isFinal, money } from '../format';
import { colors } from '../theme';

const STEPS = ['AWAITING_PAYMENT', 'FUNDS_RECEIVED', 'TOKEN_MINTED', 'ON_CHAIN_CONFIRMED', 'CONVERTED', 'PAYOUT_PROCESSING', 'COMPLETED'];

// Estado del envío en tiempo real (sondeo cada 1,5 s hasta estado final).
export default function TransferDetailScreen({ transferId }) {
  const [t, setT] = useState(null);
  const [error, setError] = useState(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    let alive = true;
    let timer;
    const tick = async () => {
      try {
        const data = await api.transfer(transferId);
        if (!alive) return;
        setT(data);
        if (!isFinal(data.status)) timer = setTimeout(tick, 1500);
      } catch (e) {
        if (alive) setError(e.message);
      }
    };
    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [transferId, paying]);

  if (!t) return <Screen title="Cargando…"><ErrorText>{error}</ErrorText></Screen>;

  const reached = new Set(t.timeline.map((e) => e.status));
  const instr = t.payment?.instructions;

  async function pay() {
    setPaying(true);
    try {
      await api.simulatePayment(t.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setPaying(false);
    }
  }

  return (
    <Screen title={t.statusLabel} subtitle={`${t.recipientSnapshot.fullName} recibe ${money(t.receiveAmountMinor, t.destinationCurrency)}`}>
      {t.status === 'AWAITING_PAYMENT' && instr && (
        <Card style={{ borderColor: colors.primary }}>
          <Text style={{ fontWeight: '700', marginBottom: 8, color: colors.text }}>Completa tu pago</Text>
          {instr.type === 'BIZUM' && <Row label="Bizum a" value={`${instr.phone} · concepto ${instr.concept}`} />}
          {instr.type === 'SEPA' && <Row label="IBAN" value={`${instr.iban} · concepto ${instr.concept}`} />}
          {instr.type === 'CARD' && <Row label="Tarjeta" value="Pasarela 3DS del partner" />}
          <Button title="Simular pago (sandbox)" onPress={pay} loading={paying} />
          <Button title="Cancelar envío" variant="secondary" onPress={() => api.cancelTransfer(t.id).then(setT, (e) => setError(e.message))} />
        </Card>
      )}

      <Card>
        {STEPS.map((s) => {
          const ev = t.timeline.find((e) => e.status === s);
          const done = reached.has(s);
          return (
            <View key={s} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
              <View style={{ width: 14, height: 14, borderRadius: 7, marginRight: 12, backgroundColor: done ? colors.success : colors.border }} />
              <Text style={{ flex: 1, color: done ? colors.text : colors.muted }}>{STEP_LABEL[s]}</Text>
              {ev && <Text style={{ color: colors.muted, fontSize: 12 }}>{date(ev.at)}</Text>}
            </View>
          );
        })}
        {t.status === 'REFUNDED' && <ErrorText>{`No se pudo abonar (${t.failureReason}). Te hemos devuelto ${money(t.sendAmountMinor, 'EUR')}.`}</ErrorText>}
      </Card>

      <Card>
        <Row label="Envías" value={money(t.sendAmountMinor, 'EUR')} />
        <Row label="Método de pago" value={t.paymentMethod} />
        <Row label="Cobro" value={t.payout?.rail ?? t.recipientSnapshot.payoutMethod} />
        <Row label="Liquidación" value={`${t.settlementToken} · ${t.settlementNetwork}`} />
        {t.onChain?.txHash && <Row label="Tx" value={`${t.onChain.txHash.slice(0, 10)}…${t.onChain.txHash.slice(-6)}`} />}
        {t.onChain?.explorerUrl && <Button variant="secondary" title="Ver en el explorador" onPress={() => Linking.openURL(t.onChain.explorerUrl)} />}
      </Card>
      <ErrorText>{error}</ErrorText>
    </Screen>
  );
}

const STEP_LABEL = {
  AWAITING_PAYMENT: 'Envío creado',
  FUNDS_RECEIVED: 'Pago en euros recibido',
  TOKEN_MINTED: 'Euros tokenizados (EURe)',
  ON_CHAIN_CONFIRMED: 'Liquidado en blockchain',
  CONVERTED: 'Convertido a moneda local',
  PAYOUT_PROCESSING: 'Abonando en destino',
  COMPLETED: 'Entregado',
};
