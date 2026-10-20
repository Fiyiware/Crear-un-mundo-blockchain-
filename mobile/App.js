// Navegación mínima sin dependencias: una pila de pantallas por pestaña.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { api, setToken } from './src/api';
import AuthScreen from './src/screens/AuthScreen';
import KycScreen from './src/screens/KycScreen';
import HomeScreen from './src/screens/HomeScreen';
import RecipientsScreen from './src/screens/RecipientsScreen';
import ConfirmScreen from './src/screens/ConfirmScreen';
import TransferDetailScreen from './src/screens/TransferDetailScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import { colors } from './src/theme';

const PAYOUT_BY_CORRIDOR = { 'ES-CO': ['NEQUI', 'DAVIPLATA', 'BANK_CO'], 'ES-SV': ['BANK_SV', 'WALLET_SV'] };

const TABS = [
  { key: 'send', label: 'Enviar' },
  { key: 'recipients', label: 'Destinatarios' },
  { key: 'history', label: 'Historial' },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('send');
  const [stack, setStack] = useState([]);

  const push = (screen) => setStack((s) => [...s, screen]);
  const pop = () => setStack((s) => s.slice(0, -1));
  const reset = (nextTab, screens = []) => {
    setTab(nextTab);
    setStack(screens);
  };

  if (!user) {
    return (
      <Shell>
        <AuthScreen
          onSession={({ token, user: u }) => {
            setToken(token);
            setUser(u);
          }}
        />
      </Shell>
    );
  }

  const refreshUser = () => api.me().then(setUser);
  const top = stack[stack.length - 1];

  let content;
  if (top?.name === 'kyc') {
    content = <KycScreen onDone={(u) => { setUser(u); if (u.kycStatus === 'APPROVED') pop(); }} />;
  } else if (top?.name === 'pickRecipient') {
    content = <RecipientsScreen filterMethods={PAYOUT_BY_CORRIDOR[top.quote.corridorId]} onSelect={(r) => push({ name: 'confirm', quote: top.quote, recipient: r })} />;
  } else if (top?.name === 'confirm') {
    content = <ConfirmScreen quote={top.quote} recipient={top.recipient} onCreated={(t) => reset('history', [{ name: 'detail', id: t.id }])} />;
  } else if (top?.name === 'detail') {
    content = <TransferDetailScreen transferId={top.id} />;
  } else if (tab === 'send') {
    content = <HomeScreen user={user} onVerify={() => push({ name: 'kyc' })} onContinue={(quote) => push({ name: 'pickRecipient', quote })} />;
  } else if (tab === 'recipients') {
    content = <RecipientsScreen />;
  } else {
    content = <HistoryScreen onOpen={(id) => push({ name: 'detail', id })} />;
  }

  return (
    <Shell>
      <View style={styles.header}>
        {stack.length ? (
          <Pressable onPress={pop} hitSlop={12}>
            <Text style={styles.back}>‹ Atrás</Text>
          </Pressable>
        ) : (
          <Text style={styles.brand}>Remesas LatAm</Text>
        )}
        <Pressable onPress={refreshUser} hitSlop={12}>
          <Text style={styles.kyc}>{user.kycStatus === 'APPROVED' ? '✓ Verificado' : 'Sin verificar'}</Text>
        </Pressable>
      </View>
      <View style={{ flex: 1 }}>{content}</View>
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Pressable key={t.key} style={styles.tab} onPress={() => reset(t.key)}>
            <Text style={[styles.tabText, tab === t.key && !stack.length && styles.tabActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <StatusBar style="dark" />
        {children}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
  brand: { fontWeight: '800', fontSize: 18, color: colors.primaryDark },
  back: { color: colors.primary, fontSize: 17, fontWeight: '600' },
  kyc: { color: colors.muted, fontSize: 13 },
  tabs: { flexDirection: 'row', borderTopWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabText: { color: colors.muted, fontWeight: '600' },
  tabActive: { color: colors.primary },
});
