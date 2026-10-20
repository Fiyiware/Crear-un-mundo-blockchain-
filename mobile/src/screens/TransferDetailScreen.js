import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Linking, View } from 'react-native';
import { api } from '../api';
import { Button, Card, ErrorText, Flag, Header, Icon, Notice, Row, Screen, T } from '../components/ui';
import { firstName, isFinal, money, moneyShort, time } from '../format';
import { C, R } from '../theme';

const STEPS = ['AWAITING_PAYMENT', 'FUNDS_RECEIVED', 'TOKEN_MINTED', 'ON_CHAIN_CONFIRMED', 'CONVERTED', 'PAYOUT_PROCESSING', 'COMPLETED'];
const STEP_LABEL = {
  AWAITING_PAYMENT: 'Envío creado',
  FUNDS_RECEIVED: 'Pago en euros recibido',
  TOKEN_MINTED: 'Euros tokenizados (EURe)',
  ON_CHAIN_CONFIRMED: 'Liquidado en blockchain',
  CONVERTED: 'Convertido a moneda local',
  PAYOUT_PROCESSING: 'Abonando en destino',
  COMPLETED: 'Entregado',
};
const NETWORK_LABEL = { 'polygon-amoy': 'Polygon (pruebas)', 'solana-devnet': 'Solana (pruebas)', 'stellar-testnet': 'Stellar (pruebas)' };

function usePulse() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 700, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return v;
}

function StepDot({ state, pulse }) {
  if (state === 'done') {
    return (
      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="check" size={13} color="#fff" />
      </View>
    );
  }
  if (state === 'current') {
    return (
      <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{ position: 'absolute', width: 34, height: 34, borderRadius: 17, backgroundColor: C.accent, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.45] }) }} />
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.ink }} />
        </View>
      </View>
    );
  }
  return <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#D5DBE7' }} />;
}

/** Seguimiento del envío en tiempo real (sondeo cada 1,5 s hasta un estado final). */
export default function TransferDetailScreen({ transferId, onBack }) {
  const [t, setT] = useState(null);
  const [error, setError] = useState(null);
  const [paying, setPaying] = useState(false);
  const [tick, setTick] = useState(0);
  const pulse = usePulse();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let alive = true;
    let timer;
    const load = async () => {
      try {
        const data = await api.transfer(transferId);
        if (!alive) return;
        setT(data);
        if (!isFinal(data.status) && data.status !== 'AWAITING_PAYMENT') timer = setTimeout(load, 1500);
      } catch (e) {
        if (alive) setError(e.message);
      }
    };
    load();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [transferId, tick]);

  const reached = new Set(t?.timeline.map((e) => e.status) ?? []);
  const doneIdx = STEPS.reduce((acc, s, i) => (reached.has(s) ? i : acc), 0);
  const completed = t?.status === 'COMPLETED';

  useEffect(() => {
    Animated.timing(progress, { toValue: completed ? 1 : doneIdx / 6, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [doneIdx, completed, progress]);

  if (!t) {
    return (
      <Screen>
        <Header title="Envío" onBack={onBack} />
        <ErrorText>{error}</ErrorText>
      </Screen>
    );
  }

  const name = firstName(t.recipientSnapshot.fullName);
  const current = completed || isFinal(t.status) ? -1 : doneIdx + 1;
  const awaiting = t.status === 'AWAITING_PAYMENT';
  const refunded = t.status === 'REFUNDED';
  const cancelled = t.status === 'CANCELLED';
  const instr = t.payment?.instructions;

  const headline = completed ? '¡Entregado!' : awaiting ? 'Completa tu pago' : refunded ? 'Reembolsado' : cancelled ? 'Cancelado' : 'En camino';
  const subline = completed
    ? `${name} ya tiene su dinero en ${t.payout?.rail ?? 'destino'}`
    : awaiting
      ? 'Tu envío empieza en cuanto recibamos el pago'
      : refunded
        ? 'Te hemos devuelto el dinero'
        : cancelled
          ? 'No se ha cobrado nada'
          : `${STEP_LABEL[STEPS[current]]} · paso ${current + 1} de 7`;

  async function pay() {
    setPaying(true);
    setError(null);
    try {
      await api.simulatePayment(t.id);
      setTick((n) => n + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setPaying(false);
    }
  }

  const headIcon = completed ? ['check', C.success, '#fff'] : refunded || cancelled ? ['rotate-ccw', C.muted, '#fff'] : awaiting ? ['credit-card', C.ink, C.accent] : ['send', C.ink, C.accent];

  return (
    <Screen>
      <Header title={`Envío a ${name}`} onBack={onBack} />

      <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: headIcon[1], alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={headIcon[0]} size={24} color={headIcon[2]} />
        </View>
        <View style={{ flex: 1 }}>
          <T v="display" size={28} style={{ letterSpacing: -0.6 }}>
            {headline}
          </T>
          <T size={14} color={C.muted2}>
            {subline}
          </T>
        </View>
      </View>

      <Card dark style={{ marginTop: 16, borderRadius: R.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Flag country="ES" size={30} />
          <View style={{ flex: 1, height: 8, borderRadius: R.pill, backgroundColor: 'rgba(255,255,255,0.16)', justifyContent: 'center' }}>
            <Animated.View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: R.pill, backgroundColor: refunded ? C.onInkFaint : C.accent, width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
          </View>
          <Flag country={t.recipientSnapshot.country} size={30} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
          <T size={13} color={C.onInkMuted} num>
            Enviaste <T v="bold" size={13} color={C.onInk}>{money(t.sendAmountMinor, 'EUR')}</T>
          </T>
          <T size={13} color={C.onInkMuted} num>
            Recibe <T v="bold" size={13} color={C.onInk}>{moneyShort(t.receiveAmountMinor, t.destinationCurrency)}</T>
          </T>
        </View>
      </Card>

      {awaiting && instr && (
        <Card style={{ marginTop: 14, borderWidth: 2, borderColor: C.ink }}>
          <T v="display" size={16} style={{ marginBottom: 8 }}>
            {instr.type === 'BIZUM' ? 'Paga con Bizum' : instr.type === 'SEPA' ? 'Haz la transferencia' : 'Paga con tarjeta'}
          </T>
          {instr.type === 'BIZUM' && (
            <>
              <Row label="Teléfono" value={instr.phone} />
              <Row label="Concepto" value={instr.concept} strong />
            </>
          )}
          {instr.type === 'SEPA' && (
            <>
              <Row label="IBAN" value={instr.iban} />
              <Row label="Concepto" value={instr.concept} strong />
            </>
          )}
          {instr.type === 'CARD' && <Row label="Pasarela" value="3D Secure del partner" />}
          <Row label="Importe" value={money(t.totalChargeMinor ?? t.sendAmountMinor, 'EUR')} strong />
          <Button title="Simular pago (sandbox)" icon="zap" onPress={pay} loading={paying} style={{ marginTop: 12 }} />
          <Button title="Cancelar envío" variant="soft" small style={{ marginTop: 8 }} onPress={() => api.cancelTransfer(t.id).then(setT, (e) => setError(e.message))} />
        </Card>
      )}

      {refunded && (
        <View style={{ marginTop: 14 }}>
          <Notice tone="danger" icon="alert-circle">{`No se pudo abonar (${t.failureReason}). Te hemos devuelto ${money(t.sendAmountMinor, 'EUR')} a tu método de pago.`}</Notice>
        </View>
      )}

      <Card style={{ marginTop: 14, paddingVertical: 12 }}>
        {STEPS.map((s, i) => {
          const ev = t.timeline.find((e) => e.status === s);
          const state = reached.has(s) ? 'done' : i === current ? 'current' : 'pending';
          const last = i === STEPS.length - 1;
          return (
            <View key={s} style={{ flexDirection: 'row', gap: 12, minHeight: 42 }}>
              <View style={{ alignItems: 'center', width: 24 }}>
                <StepDot state={state} pulse={pulse} />
                {!last && <View style={{ flex: 1, width: 2, minHeight: 14, marginVertical: 2, backgroundColor: reached.has(STEPS[i + 1]) ? C.ink : C.line }} />}
              </View>
              <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', paddingTop: 2 }}>
                <T v={state === 'current' ? 'bold' : 'semi'} size={14} color={state === 'pending' ? C.muted : C.ink}>
                  {s === 'PAYOUT_PROCESSING' && t.payout?.rail ? `Abonando en ${t.payout.rail}` : STEP_LABEL[s]}
                </T>
                {ev ? (
                  <T size={12} color={C.muted} num>
                    {time(ev.at)}
                  </T>
                ) : null}
              </View>
            </View>
          );
        })}
      </Card>

      <Card style={{ marginTop: 14 }}>
        <T v="bold" size={12} color={C.muted} style={{ letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
          Liquidación
        </T>
        <Row label="Token" value={`${t.settlementToken} · euro regulado`} />
        <Row label="Red" value={NETWORK_LABEL[t.settlementNetwork] ?? t.settlementNetwork} />
        <Row label="Pagaste con" value={{ BIZUM: 'Bizum', CARD: 'Tarjeta', SEPA: 'Transferencia SEPA' }[t.paymentMethod]} />
        {t.paymentFeeMinor ? <Row label="Comisión del medio de pago" value={money(t.paymentFeeMinor, 'EUR')} /> : null}
        <Row label="Total cobrado" value={money(t.totalChargeMinor ?? t.sendAmountMinor, 'EUR')} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }}>
          <T size={14} color={C.muted}>
            Transacción
          </T>
          <View style={{ backgroundColor: C.lineSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
            <T v="medium" size={12} num>
              {t.onChain?.txHash ? `${t.onChain.txHash.slice(0, 8)}…${t.onChain.txHash.slice(-6)}` : 'pendiente'}
            </T>
          </View>
        </View>
        {t.onChain?.explorerUrl && <Button title="Ver en blockchain" iconRight="external-link" variant="outline" small style={{ marginTop: 10 }} onPress={() => Linking.openURL(t.onChain.explorerUrl)} />}
      </Card>
      <View style={{ marginTop: 12 }}>
        <ErrorText>{error}</ErrorText>
      </View>
    </Screen>
  );
}
