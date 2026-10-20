import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { api } from '../api';
import { Card, ErrorText, Header, Icon, Screen, Segmented, T } from '../components/ui';
import { TransferRow } from '../components/transfer';
import { money } from '../format';
import { C } from '../theme';

const IN_PROGRESS = (s) => !['COMPLETED', 'CANCELLED', 'REFUNDED', 'FAILED'].includes(s);

export default function HistoryScreen({ onOpen }) {
  const [list, setList] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [error, setError] = useState(null);
  useEffect(() => {
    api.transfers().then((r) => setList(r.transfers), (e) => setError(e.message));
  }, []);

  const visible = (list ?? []).filter((t) => filter === 'ALL' || (filter === 'ACTIVE' ? IN_PROGRESS(t.status) : t.status === 'COMPLETED'));
  const delivered = (list ?? []).filter((t) => t.status === 'COMPLETED');
  const sentTotal = delivered.reduce((a, t) => a + t.sendAmountMinor, 0);

  return (
    <Screen>
      <Header title="Actividad" />
      <Card dark style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <T size={12} color={C.onInkFaint}>
            Enviado y entregado
          </T>
          <T v="display" size={26} color={C.onInk} num style={{ marginTop: 4 }}>
            {money(sentTotal, 'EUR')}
          </T>
        </View>
        <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.14)' }} />
        <View style={{ flex: 0.6 }}>
          <T size={12} color={C.onInkFaint}>
            Envíos
          </T>
          <T v="display" size={26} color={C.onInk} num style={{ marginTop: 4 }}>
            {String(delivered.length)}
          </T>
        </View>
      </Card>
      <Segmented
        value={filter}
        onChange={setFilter}
        options={[{ value: 'ALL', label: 'Todos' }, { value: 'ACTIVE', label: 'En curso' }, { value: 'DONE', label: 'Entregados' }]}
        style={{ marginTop: 16, marginBottom: 14 }}
      />
      <ErrorText>{error}</ErrorText>
      <Card style={{ paddingVertical: 4, paddingHorizontal: 16 }}>
        {list && visible.length === 0 && (
          <View style={{ paddingVertical: 28, alignItems: 'center', gap: 6 }}>
            <Icon name="inbox" size={22} color={C.muted} />
            <T size={14} color={C.muted}>
              No hay envíos aquí todavía
            </T>
          </View>
        )}
        {visible.map((t, i) => (
          <TransferRow key={t.id} t={t} last={i === visible.length - 1} onPress={() => onOpen(t.id)} />
        ))}
      </Card>
    </Screen>
  );
}
