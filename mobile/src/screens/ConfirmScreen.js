import { useState } from 'react';
import { Text } from 'react-native';
import { api } from '../api';
import { Button, Card, Chips, ErrorText, Row, Screen } from '../components/ui';
import { money } from '../format';
import { colors } from '../theme';

const PAYMENT_METHODS = [
  { value: 'BIZUM', label: 'Bizum' },
  { value: 'CARD', label: 'Tarjeta' },
  { value: 'SEPA', label: 'Transferencia SEPA' },
];

export default function ConfirmScreen({ quote, recipient, onCreated }) {
  const [paymentMethod, setPaymentMethod] = useState('BIZUM');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function confirm() {
    setLoading(true);
    setError(null);
    try {
      const t = await api.createTransfer({ quoteId: quote.id, recipientId: recipient.id, paymentMethod });
      onCreated(t);
    } catch (e) {
      setError(e.code === 'QUOTE_EXPIRED' ? 'La cotización ha caducado. Vuelve atrás para actualizarla.' : e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen title="Revisa tu envío">
      <Card>
        <Row label="Destinatario" value={recipient.fullName} />
        <Row label="Envías" value={money(quote.sendAmountMinor, 'EUR')} />
        <Row label="Comisión" value={money(quote.fixedFeeMinor, 'EUR')} />
        <Row label="Tipo de cambio" value={`1 € = ${quote.customerRate} ${quote.destinationCurrency}`} />
        <Row label="Recibe" value={money(quote.receiveAmountMinor, quote.destinationCurrency)} strong />
      </Card>
      <Text style={{ fontWeight: '700', color: colors.text, marginBottom: 8 }}>¿Cómo quieres pagar?</Text>
      <Chips options={PAYMENT_METHODS} value={paymentMethod} onChange={setPaymentMethod} />
      <ErrorText>{error}</ErrorText>
      <Button title={`Pagar ${money(quote.sendAmountMinor, 'EUR')}`} onPress={confirm} loading={loading} />
      <Text style={{ color: colors.muted, fontSize: 12, marginTop: 12 }}>
        Tu pago lo custodia una entidad de dinero electrónico regulada en la UE. El tipo de cambio queda fijado hasta {new Date(quote.expiresAt).toLocaleTimeString('es-ES')}.
      </Text>
    </Screen>
  );
}
