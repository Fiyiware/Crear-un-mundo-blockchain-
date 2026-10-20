import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { api } from '../api';
import { Avatar, Button, Flag, Header, Icon, Notice, Screen, Segmented, T } from '../components/ui';
import { amountParts, firstName, group, METHOD_LABEL, rate } from '../format';
import { C, F, R } from '../theme';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'back'];
const QUICK = [50, 100, 200, 300];
const COUNTRY_OF = { 'ES-CO': 'CO', 'ES-SV': 'SV' };

function applyKey(amount, k) {
  if (k === 'back') return amount.slice(0, -1);
  if (k === ',') return amount.includes(',') ? amount : `${amount || '0'},`;
  const [int, dec] = amount.split(',');
  if (dec !== undefined && dec.length >= 2) return amount;
  if (dec === undefined && int.length >= 4) return amount;
  return amount === '0' ? k : amount + k;
}

function useCountdown(expiresAt) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!expiresAt) return null;
  const s = Math.max(0, Math.round((Date.parse(expiresAt) - now) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Calculadora de envío con teclado propio y cotización en tiempo real. */
export default function SendScreen({ recipient, corridorId: initialCorridor = 'ES-CO', onBack, onContinue }) {
  const lockedCorridor = recipient ? (recipient.country === 'SV' ? 'ES-SV' : 'ES-CO') : null;
  const [corridorId, setCorridorId] = useState(lockedCorridor ?? initialCorridor);
  const [amount, setAmount] = useState('200');
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState(null);
  const countdown = useCountdown(quote?.expiresAt);

  useEffect(() => {
    setError(null);
    if (!/^\d+(,\d{1,2})?$/.test(amount) || amount === '0') {
      setQuote(null);
      return undefined;
    }
    const id = setTimeout(() => {
      api.quote({ corridorId, amount, mode: 'send' }).then(setQuote, (e) => setError(e.message));
    }, 250);
    return () => clearTimeout(id);
  }, [corridorId, amount]);

  const [int, dec] = (amount || '0').split(',');
  const sendDisplay = `${group(int || '0')}${dec !== undefined ? `,${dec}` : ''}`;
  const receive = quote ? amountParts(quote.receiveAmountMinor, quote.destinationCurrency) : null;
  const warnings = quote?.warnings ?? [];
  const valid = !!quote && warnings.length === 0 && quote.receiveAmountMinor > 0;
  const destCountry = COUNTRY_OF[corridorId];
  const currency = destCountry === 'CO' ? 'COP' : 'USD';
  const receiver = recipient ? `${firstName(recipient.fullName)} recibe en ${METHOD_LABEL[recipient.payoutMethod]}` : `Recibe en ${destCountry === 'CO' ? 'Colombia' : 'El Salvador'}`;

  return (
    <Screen footer={<Button title="Continuar" iconRight="arrow-right" disabled={!valid} onPress={() => onContinue(quote)} />}>
      <Header
        title="Enviar dinero"
        onBack={onBack}
        right={
          <View style={{ height: 32, paddingHorizontal: 10, borderRadius: R.pill, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, flexDirection: 'row', alignItems: 'center', gap: 6 }} accessibilityLabel="Tiempo que queda de tipo de cambio fijado">
            <Icon name="clock" size={13} color={C.muted2} />
            <T v="semi" size={12} color={C.muted2} num>
              {countdown ?? '2:00'}
            </T>
          </View>
        }
      />

      {recipient ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: R.pill, padding: 6, paddingRight: 16, alignSelf: 'flex-start' }}>
          <Avatar name={recipient.fullName} size={32} country={recipient.country} />
          <T v="semi" size={14}>{`Para ${recipient.fullName}`}</T>
        </View>
      ) : (
        <Segmented
          value={corridorId}
          onChange={setCorridorId}
          options={[{ value: 'ES-CO', label: 'Colombia', flag: 'CO' }, { value: 'ES-SV', label: 'El Salvador', flag: 'SV' }]}
        />
      )}

      <View style={{ marginTop: 12, backgroundColor: C.card, borderRadius: 24, padding: 20, paddingTop: 16, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <T v="semi" size={13} color={C.muted}>
            Tú envías
          </T>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }} accessibilityLiveRegion="polite">
            <T v="display" size={50} num style={{ letterSpacing: -1.5, lineHeight: 56 }} adjustsFontSizeToFit numberOfLines={1}>
              {`${sendDisplay} €`}
            </T>
            <View style={{ width: 3, height: 42, backgroundColor: C.accent, borderRadius: 2, marginLeft: 4 }} />
          </View>
        </View>
        <View style={{ height: 36, paddingLeft: 6, paddingRight: 12, borderRadius: R.pill, backgroundColor: C.bg, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Flag country="ES" size={24} />
          <T v="bold" size={14}>
            EUR
          </T>
        </View>
      </View>

      <View style={{ alignItems: 'center', marginVertical: -14, zIndex: 1 }}>
        <View style={{ height: 28, paddingHorizontal: 12, borderRadius: R.pill, backgroundColor: C.accent, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 4, borderColor: C.bg }}>
          <Icon name="arrow-down" size={13} />
          <T v="bold" size={12} num>
            {quote ? `1 € = ${rate(quote.customerRate, quote.destinationCurrency)} ${quote.destinationCurrency}` : 'Calculando…'}
          </T>
        </View>
      </View>

      <View style={{ backgroundColor: C.ink, borderRadius: 24, padding: 20, paddingTop: 22, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <T v="semi" size={13} color={C.onInkMuted}>
            {receiver}
          </T>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 6 }} accessibilityLiveRegion="polite">
            <T v="display" size={36} color={C.onInk} num style={{ letterSpacing: -0.8 }} adjustsFontSizeToFit numberOfLines={1}>
              {receive ? receive.int : '0'}
            </T>
            <T v="display" size={20} color={C.onInkMuted} num>
              {receive ? receive.dec : ',00'}
            </T>
          </View>
        </View>
        <View style={{ height: 36, paddingLeft: 6, paddingRight: 12, borderRadius: R.pill, backgroundColor: 'rgba(255,255,255,0.12)', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Flag country={destCountry} size={24} />
          <T v="bold" size={14} color={C.onInk}>
            {currency}
          </T>
        </View>
      </View>

      <View style={{ minHeight: 22, marginTop: 10, alignItems: 'center' }}>
        {error ? (
          <T size={13} color={C.danger}>
            {error}
          </T>
        ) : warnings.includes('BELOW_MIN_AMOUNT') ? (
          <T v="semi" size={13} color={C.warn}>
            Mínimo 10 € por envío
          </T>
        ) : warnings.includes('ABOVE_MAX_AMOUNT') ? (
          <T v="semi" size={13} color={C.warn}>
            Máximo 300 € por envío durante el piloto
          </T>
        ) : quote ? (
          <T size={13} color={C.muted2} num>
            Comisión <T v="bold" size={13}>0,99 €</T> · coste total <T v="bold" size={13}>{`${String(quote.totalCostPct).replace('.', ',')} %`}</T> · llega en &lt; 1 min
          </T>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
        {QUICK.map((v) => (
          <Pressable
            key={v}
            accessibilityRole="button"
            onPress={() => setAmount(String(v))}
            style={({ pressed }) => [{ flex: 1, height: 36, borderRadius: R.pill, borderWidth: 1, borderColor: amount === String(v) ? C.ink : '#D5DBE7', backgroundColor: amount === String(v) ? C.ink : C.card, alignItems: 'center', justifyContent: 'center' }, pressed && { opacity: 0.7 }]}
          >
            <T v="bold" size={13} color={amount === String(v) ? C.onInk : C.ink}>{`${v} €`}</T>
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
        {KEYS.map((k) => (
          <Pressable
            key={k}
            accessibilityRole="button"
            accessibilityLabel={k === 'back' ? 'Borrar' : k === ',' ? 'Coma decimal' : k}
            onPress={() => setAmount((a) => applyKey(a, k))}
            onLongPress={k === 'back' ? () => setAmount('') : undefined}
            style={({ pressed }) => [{ width: '33.333%', height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: R.md }, pressed && { backgroundColor: C.lineSoft }]}
          >
            {k === 'back' ? <Icon name="delete" size={24} /> : <T style={{ fontFamily: F.displaySemi }} size={26}>{k}</T>}
          </Pressable>
        ))}
      </View>
      {quote?.warnings?.length === 0 && quote.totalCostPct > 1.5 ? (
        <View style={{ marginTop: 8 }}>
          <Notice tone="warn" icon="info">
            En envíos pequeños la comisión fija pesa más. A partir de 100 € el coste total baja del 1,5 %.
          </Notice>
        </View>
      ) : null}
    </Screen>
  );
}
