import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api } from '../api';
import { Card, ErrorText, Screen } from '../components/ui';
import { date, money } from '../format';
import { colors } from '../theme';

const STATUS_COLOR = { COMPLETED: colors.success, REFUNDED: colors.danger, FAILED: colors.danger, CANCELLED: colors.muted };

export default function HistoryScreen({ onOpen }) {
  const [list, setList] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    api.transfers().then((r) => setList(r.transfers), (e) => setError(e.message));
  }, []);

  return (
    <Screen title="Tus envíos">
      <ErrorText>{error}</ErrorText>
      {list?.length === 0 && <Text style={{ color: colors.muted }}>Todavía no has hecho ningún envío.</Text>}
      {list?.map((t) => (
        <Pressable key={t.id} onPress={() => onOpen(t.id)}>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontWeight: '700', color: colors.text }}>{t.recipientSnapshot.fullName}</Text>
              <Text style={{ fontWeight: '700', color: colors.text }}>{money(t.sendAmountMinor, 'EUR')}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ color: STATUS_COLOR[t.status] ?? colors.primary }}>{t.statusLabel}</Text>
              <Text style={{ color: colors.muted }}>{date(t.createdAt)}</Text>
            </View>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
