import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { api } from '../api';
import { Button, Card, Chips, ErrorText, Field, Row, Screen } from '../components/ui';
import { money } from '../format';
import { colors } from '../theme';

const CORRIDORS = [
  { value: 'ES-CO', label: '🇨🇴 Colombia (COP)' },
  { value: 'ES-SV', label: '🇸🇻 El Salvador (USD)' },
];

// Calculadora en tiempo real: recalcula la cotización al escribir.
export default function HomeScreen({ user, onContinue, onVerify }) {
  const [corridorId, setCorridorId] = useState('ES-CO');
  const [amount, setAmount] = useState('200');
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setError(null);
    if (!/^\d+([.,]\d{1,2})?$/.test(amount)) {
      setQuote(null);
      return undefined;
    }
    const id = setTimeout(() => {
      api.quote({ corridorId, amount, mode: 'send' }).then(setQuote, (e) => setError(e.message));
    }, 300);
    return () => clearTimeout(id);
  }, [corridorId, amount]);

  const warnings = quote?.warnings ?? [];

  return (
    <Screen title={`Hola, ${user.fullName.split(' ')[0]}`} subtitle="¿Cuánto quieres enviar hoy?">
      {user.kycStatus !== 'APPROVED' && (
        <Card style={{ borderColor: colors.warning }}>
          <Text style={{ color: colors.text, marginBottom: 8 }}>Verifica tu identidad para poder enviar dinero.</Text>
          <Button title="Verificar ahora" onPress={onVerify} />
        </Card>
      )}
      <Card>
        <Chips options={CORRIDORS} value={corridorId} onChange={setCorridorId} />
        <Field label="Tú envías (EUR)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
        <ErrorText>{error}</ErrorText>
        {quote && (
          <View>
            <Row label="Comisión" value={money(quote.fixedFeeMinor, 'EUR')} />
            <Row label="Tipo de cambio" value={`1 € = ${quote.customerRate} ${quote.destinationCurrency}`} />
            <Row label="Coste total" value={`${quote.totalCostPct} %`} />
            <Row label="Llega en" value={quote.estimatedDelivery} />
            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />
            <Row label="Recibe" value={money(quote.receiveAmountMinor, quote.destinationCurrency)} strong />
          </View>
        )}
        {warnings.includes('BELOW_MIN_AMOUNT') && <ErrorText>El importe mínimo es 10 €.</ErrorText>}
        {warnings.includes('ABOVE_MAX_AMOUNT') && <ErrorText>El máximo por envío durante el piloto es 300 €.</ErrorText>}
        <Button title="Continuar" disabled={!quote || warnings.length > 0 || user.kycStatus !== 'APPROVED'} onPress={() => onContinue(quote)} />
      </Card>
    </Screen>
  );
}
