import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { api } from '../api';
import { Button, ErrorText, Flag, Header, Icon, Row, Screen, T } from '../components/ui';
import { amountParts, firstName, money, METHOD_LABEL, PAYMENT_LABEL, rate } from '../format';
import { C, R } from '../theme';

// El precio es el mismo con cualquier método de pago.
const PAYMENT_METHODS = [
  { value: 'BIZUM', hint: 'Al instante, con tu móvil', icon: 'smartphone' },
  { value: 'CARD', hint: 'Débito o crédito, con 3D Secure', icon: 'credit-card' },
  { value: 'SEPA', hint: 'SEPA Instant desde tu banco', icon: 'home' },
];

export default function ConfirmScreen({ quote, recipient, onBack, onCreated }) {
  const [paymentMethod, setPaymentMethod] = useState('BIZUM');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const receive = amountParts(quote.receiveAmountMinor, quote.destinationCurrency);
  const name = firstName(recipient.fullName);
  const destination = recipient.phone ? `${METHOD_LABEL[recipient.payoutMethod]} · ${recipient.phone.slice(0, 3)} ••• ${recipient.phone.slice(-4)}` : `${recipient.bankName ?? 'Banco'} ${recipient.accountNumber ?? ''}`;

  async function confirm() {
    setLoading(true);
    setError(null);
    try {
      onCreated(await api.createTransfer({ quoteId: quote.id, recipientId: recipient.id, paymentMethod }));
    } catch (e) {
      setError(e.code === 'QUOTE_EXPIRED' ? 'El tipo de cambio ha caducado. Vuelve atrás para actualizarlo.' : e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen footer={<Button title={`Pagar ${money(quote.sendAmountMinor, 'EUR')} con ${PAYMENT_LABEL[paymentMethod]}`} icon="lock" onPress={confirm} loading={loading} />}>
      <Header title="Revisa y paga" onBack={onBack} />

      <View style={{ backgroundColor: C.card, borderRadius: 24 }}>
        <View style={{ padding: 20, paddingBottom: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Flag country="ES" size={36} />
              <T v="semi" size={11} color={C.muted}>
                Tú
              </T>
            </View>
            <View style={{ flex: 1, height: 36, justifyContent: 'center' }}>
              <View style={{ borderTopWidth: 2, borderStyle: 'dashed', borderColor: '#C9D1E2' }} />
              <View style={{ position: 'absolute', alignSelf: 'center', width: 30, height: 30, borderRadius: 15, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="send" size={14} />
              </View>
            </View>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Flag country={recipient.country} size={36} />
              <T v="semi" size={11} color={C.muted}>
                {name}
              </T>
            </View>
          </View>
          <T v="semi" size={13} color={C.muted} style={{ marginTop: 14 }}>{`${name} recibe`}</T>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
            <T v="display" size={32} num style={{ letterSpacing: -0.6 }} adjustsFontSizeToFit numberOfLines={1}>
              {`${receive.prefix}${receive.int}`}
            </T>
            <T v="display" size={20} color={C.muted} num>
              {receive.dec}
            </T>
          </View>
        </View>

        <View style={{ height: 20, justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={{ position: 'absolute', left: -10, width: 20, height: 20, borderRadius: 10, backgroundColor: C.bg }} />
          <View style={{ marginHorizontal: 18, borderTopWidth: 2, borderStyle: 'dashed', borderColor: C.line }} />
          <View style={{ position: 'absolute', right: -10, width: 20, height: 20, borderRadius: 10, backgroundColor: C.bg }} />
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 16 }}>
          <Row label="Pagas" value={money(quote.sendAmountMinor, 'EUR')} strong />
          <Row label="Comisión del envío (incluida)" value={money(quote.fixedFeeMinor, 'EUR')} />
          <Row label="Tipo de cambio" value={`1 € = ${rate(quote.customerRate, quote.destinationCurrency)} ${quote.destinationCurrency}`} />
          <Row label="Cobra en" value={destination} />
          <Row label="Llega en" value={quote.estimatedDelivery} valueColor={C.success} />
        </View>
      </View>

      <T v="display" size={16} style={{ marginTop: 20, marginBottom: 10 }}>
        ¿Cómo pagas?
      </T>
      <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
        {PAYMENT_METHODS.map((m) => {
          const on = m.value === paymentMethod;
          return (
            <Pressable
              key={m.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => setPaymentMethod(m.value)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 62, paddingHorizontal: 14, borderRadius: 18, backgroundColor: C.card, borderWidth: on ? 2 : 1, borderColor: on ? C.ink : C.line }}
            >
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: on ? C.ink : C.lineSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={m.icon} size={19} color={on ? C.accent : C.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <T v="bold" size={15}>
                  {PAYMENT_LABEL[m.value]}
                </T>
                <T size={12} color={C.muted}>
                  {m.hint}
                </T>
              </View>
              <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? C.ink : '#B8C1D6', alignItems: 'center', justifyContent: 'center' }}>
                {on ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.ink }} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={{ marginTop: 14 }}>
        <ErrorText>{error}</ErrorText>
        <T size={12} color={C.muted} style={{ textAlign: 'center', lineHeight: 18 }}>
          {`Mismo precio con cualquier método de pago. Tu pago lo custodia una entidad de dinero electrónico regulada en la UE. El tipo de cambio queda fijado hasta las ${new Date(quote.expiresAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}.`}
        </T>
      </View>
    </Screen>
  );
}
