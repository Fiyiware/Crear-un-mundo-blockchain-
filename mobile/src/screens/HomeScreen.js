import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { api } from '../api';
import { Avatar, Button, Card, Flag, Icon, IconButton, Notice, Screen, SectionTitle, T } from '../components/ui';
import { TransferRow } from '../components/transfer';
import { firstName, METHOD_LABEL, rate } from '../format';
import { C, R } from '../theme';

const CORRIDORS = [
  { id: 'ES-CO', country: 'CO', label: 'Colombia' },
  { id: 'ES-SV', country: 'SV', label: 'El Salvador' },
];

export default function HomeScreen({ user, onSend, onVerify, onOpenTransfer, onSeeRecipients, onSeeHistory }) {
  const [corridorId, setCorridorId] = useState('ES-CO');
  const [quote, setQuote] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [transfers, setTransfers] = useState(null);

  useEffect(() => {
    api.quote({ corridorId, amount: '100' }).then(setQuote, () => setQuote(null));
  }, [corridorId]);

  useEffect(() => {
    api.recipients().then((r) => setRecipients(r.recipients), () => {});
    api.transfers().then((r) => setTransfers(r.transfers), () => setTransfers([]));
  }, []);

  const verified = user.kycStatus === 'APPROVED';

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={user.fullName} size={44} dark />
          <View>
            <T v="display" size={19}>{`Hola, ${firstName(user.fullName)}`}</T>
            {verified ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Icon name="shield" size={13} color={C.success} />
                <T v="semi" size={12} color={C.success}>
                  Identidad verificada
                </T>
              </View>
            ) : (
              <T v="semi" size={12} color={C.warn}>
                Falta verificar tu identidad
              </T>
            )}
          </View>
        </View>
        <IconButton icon="bell" label="Notificaciones" />
      </View>

      {!verified && (
        <Pressable onPress={onVerify} style={{ marginBottom: 14 }} accessibilityRole="button">
          <Notice tone="warn" icon="alert-circle">
            Verifica tu identidad para poder enviar dinero. Toca aquí, solo lleva un momento.
          </Notice>
        </Pressable>
      )}

      <Card dark style={{ borderRadius: R.xl, padding: 22, overflow: 'hidden' }}>
        <Svg width={150} height={90} viewBox="0 0 150 90" style={{ position: 'absolute', right: -10, top: -6, opacity: 0.5 }}>
          <Path d="M10 20 C 50 -10, 120 0, 132 60" stroke="#5B74B8" strokeWidth="2" strokeDasharray="4 7" strokeLinecap="round" fill="none" />
          <Circle cx="132" cy="62" r="7" fill={C.accent} />
        </Svg>
        <T v="semi" size={12} color={C.onInkFaint} style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
          Tipo de cambio de hoy
        </T>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {CORRIDORS.map((c) => {
            const on = c.id === corridorId;
            return (
              <Pressable
                key={c.id}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => setCorridorId(c.id)}
                style={{ height: 34, paddingLeft: 6, paddingRight: 12, borderRadius: R.pill, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: on ? 'rgba(255,255,255,0.14)' : 'transparent', borderWidth: 1, borderColor: on ? 'transparent' : 'rgba(255,255,255,0.22)' }}
              >
                <Flag country={c.country} size={22} />
                <T v="semi" size={13} color={on ? C.onInk : C.onInkMuted}>
                  {c.label}
                </T>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 18 }}>
          <T v="semi" size={18} color={C.onInkMuted}>
            1 € =
          </T>
          <T v="display" size={42} color={C.onInk} num style={{ letterSpacing: -1 }}>
            {quote ? rate(quote.customerRate, quote.destinationCurrency) : '—'}
          </T>
          <T v="semi" size={18} color={C.onInkMuted}>
            {quote?.destinationCurrency ?? ''}
          </T>
        </View>
        <T size={13} color={C.onInkMuted} style={{ marginTop: 6 }}>
          Comisión fija 0,99 € · llega en {quote?.estimatedDelivery ?? 'menos de 1 minuto'}
        </T>
        <Button title="Enviar dinero" iconRight="arrow-right" style={{ marginTop: 18 }} disabled={!verified} onPress={() => onSend({ corridorId })} />
      </Card>

      <SectionTitle action="Ver todos" onAction={onSeeRecipients} style={{ marginTop: 24 }}>
        Enviar de nuevo
      </SectionTitle>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {recipients.slice(0, 3).map((r) => (
          <Pressable key={r.id} accessibilityRole="button" disabled={!verified} onPress={() => onSend({ recipient: r })} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <Avatar name={r.fullName} size={56} country={r.country} />
            <T v="semi" size={12} numberOfLines={1}>
              {firstName(r.fullName)}
            </T>
            <T size={11} color={C.muted} style={{ marginTop: -4 }}>
              {METHOD_LABEL[r.payoutMethod]}
            </T>
          </Pressable>
        ))}
        <Pressable accessibilityRole="button" onPress={onSeeRecipients} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderStyle: 'dashed', borderColor: '#9AA6C2', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="plus" size={22} color={C.muted2} />
          </View>
          <T v="semi" size={12}>
            Nuevo
          </T>
          <T size={11} color={C.muted} style={{ marginTop: -4 }}>
            contacto
          </T>
        </Pressable>
        {Array.from({ length: Math.max(0, 3 - recipients.length) }).map((_, i) => (
          <View key={`sp${i}`} style={{ flex: 1 }} />
        ))}
      </View>

      <SectionTitle action="Historial" onAction={onSeeHistory} style={{ marginTop: 24 }}>
        Actividad reciente
      </SectionTitle>
      <Card style={{ paddingVertical: 4, paddingHorizontal: 16 }}>
        {transfers?.length === 0 && (
          <View style={{ paddingVertical: 24, alignItems: 'center', gap: 6 }}>
            <Icon name="send" size={22} color={C.muted} />
            <T size={14} color={C.muted}>
              Aquí verás tus envíos
            </T>
          </View>
        )}
        {transfers?.slice(0, 4).map((t, i, all) => (
          <TransferRow key={t.id} t={t} last={i === all.length - 1} onPress={() => onOpenTransfer(t.id)} />
        ))}
      </Card>
    </Screen>
  );
}
