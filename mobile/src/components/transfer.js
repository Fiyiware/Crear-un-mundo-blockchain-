import { Pressable, View } from 'react-native';
import { Badge, Icon, T } from './ui';
import { C } from '../theme';
import { date, money, moneyShort } from '../format';

export function statusTone(status) {
  if (status === 'COMPLETED') return ['success', 'Entregado'];
  if (status === 'REFUNDED') return ['danger', 'Reembolsado'];
  if (status === 'FAILED') return ['danger', 'Incidencia'];
  if (status === 'CANCELLED') return ['neutral', 'Cancelado'];
  if (status === 'AWAITING_PAYMENT') return ['warn', 'Pendiente de pago'];
  return ['warn', 'En camino'];
}

export function TransferRow({ t, onPress, last }) {
  const [tone, label] = statusTone(t.status);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 66, paddingVertical: 10, borderBottomWidth: last ? 0 : 1, borderColor: C.lineSoft },
        pressed && { opacity: 0.6 },
      ]}
    >
      <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: C.lineSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="arrow-up-right" size={18} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <T v="semi" size={15} numberOfLines={1}>
          {t.recipientSnapshot.fullName}
        </T>
        <Badge tone={tone}>{`${label} · ${date(t.createdAt)}`}</Badge>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <T v="bold" size={15} num>
          {`−${money(t.sendAmountMinor, 'EUR')}`}
        </T>
        <T size={12} color={C.muted} num>
          {moneyShort(t.receiveAmountMinor, t.destinationCurrency)}
        </T>
      </View>
    </Pressable>
  );
}
