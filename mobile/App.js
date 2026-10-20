// Navegación mínima sin dependencias: una pila de pantallas de flujo sobre
// cuatro pestañas, con botón central de envío.
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { BricolageGrotesque_600SemiBold, BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Feather } from '@expo/vector-icons';
import { setToken } from './src/api';
import { Icon, T } from './src/components/ui';
import AuthScreen from './src/screens/AuthScreen';
import KycScreen from './src/screens/KycScreen';
import HomeScreen from './src/screens/HomeScreen';
import SendScreen from './src/screens/SendScreen';
import RecipientsScreen from './src/screens/RecipientsScreen';
import ConfirmScreen from './src/screens/ConfirmScreen';
import TransferDetailScreen from './src/screens/TransferDetailScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { C } from './src/theme';

const TABS = [
  { key: 'home', label: 'Inicio', icon: 'home' },
  { key: 'recipients', label: 'Contactos', icon: 'users' },
  { key: 'send', label: 'Enviar', icon: 'send', fab: true },
  { key: 'history', label: 'Actividad', icon: 'clock' },
  { key: 'profile', label: 'Perfil', icon: 'user' },
];

const COUNTRY_OF = { 'ES-CO': 'CO', 'ES-SV': 'SV' };

function TabBar({ tab, onTab, onSend }) {
  const insets = useSafeAreaInsets();
  return (
    <View accessibilityRole="tablist" style={[styles.tabs, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {TABS.map((t) =>
        t.fab ? (
          <View key={t.key} style={styles.tab}>
            <Pressable accessibilityRole="button" accessibilityLabel="Enviar dinero" onPress={onSend} style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.95 }] }]}>
              <Icon name="send" size={22} color={C.ink} />
            </Pressable>
          </View>
        ) : (
          <Pressable key={t.key} accessibilityRole="tab" accessibilityState={{ selected: tab === t.key }} style={styles.tab} onPress={() => onTab(t.key)}>
            <Icon name={t.icon} size={22} color={tab === t.key ? C.ink : C.muted} />
            <T v={tab === t.key ? 'bold' : 'semi'} size={11} color={tab === t.key ? C.ink : C.muted}>
              {t.label}
            </T>
          </Pressable>
        ),
      )}
    </View>
  );
}

function Main() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('home');
  const [stack, setStack] = useState([]);

  const push = (screen) => setStack((s) => [...s, screen]);
  const pop = () => setStack((s) => s.slice(0, -1));
  const reset = (nextTab, screens = []) => {
    setTab(nextTab);
    setStack(screens);
  };

  if (!user) {
    return (
      <Shell dark>
        <AuthScreen
          onSession={({ token, user: u }) => {
            setToken(token);
            setUser(u);
            if (u.kycStatus !== 'APPROVED') setStack([{ name: 'kyc' }]);
          }}
        />
      </Shell>
    );
  }

  const startSend = (opts = {}) => (user.kycStatus === 'APPROVED' ? push({ name: 'send', ...opts }) : push({ name: 'kyc' }));
  const top = stack[stack.length - 1];

  let content;
  if (top?.name === 'kyc') {
    content = (
      <KycScreen
        onBack={pop}
        onDone={(u) => {
          setUser(u);
          if (u.kycStatus === 'APPROVED') pop();
        }}
      />
    );
  } else if (top?.name === 'send') {
    content = (
      <SendScreen
        recipient={top.recipient}
        corridorId={top.corridorId}
        onBack={pop}
        onContinue={(quote) => push(top.recipient ? { name: 'confirm', quote, recipient: top.recipient } : { name: 'pickRecipient', quote })}
      />
    );
  } else if (top?.name === 'pickRecipient') {
    content = <RecipientsScreen quote={top.quote} country={COUNTRY_OF[top.quote.corridorId]} onBack={pop} onSelect={(r) => push({ name: 'confirm', quote: top.quote, recipient: r })} />;
  } else if (top?.name === 'confirm') {
    content = <ConfirmScreen quote={top.quote} recipient={top.recipient} onBack={pop} onCreated={(t) => reset('history', [{ name: 'detail', id: t.id }])} />;
  } else if (top?.name === 'detail') {
    content = <TransferDetailScreen transferId={top.id} onBack={pop} />;
  } else if (tab === 'home') {
    content = (
      <HomeScreen
        user={user}
        onSend={startSend}
        onVerify={() => push({ name: 'kyc' })}
        onOpenTransfer={(id) => push({ name: 'detail', id })}
        onSeeRecipients={() => setTab('recipients')}
        onSeeHistory={() => setTab('history')}
      />
    );
  } else if (tab === 'recipients') {
    content = <RecipientsScreen />;
  } else if (tab === 'history') {
    content = <HistoryScreen onOpen={(id) => push({ name: 'detail', id })} />;
  } else {
    content = (
      <ProfileScreen
        user={user}
        onVerify={() => push({ name: 'kyc' })}
        onLogout={() => {
          setToken(null);
          setUser(null);
          reset('home');
        }}
      />
    );
  }

  return (
    <Shell>
      <View style={{ flex: 1 }}>{content}</View>
      {!stack.length && <TabBar tab={tab} onTab={(k) => reset(k)} onSend={() => startSend()} />}
    </Shell>
  );
}

function Shell({ children, dark }) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: dark ? C.ink : C.bg }}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      {children}
    </SafeAreaView>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    ...Feather.font,
  });

  return (
    <SafeAreaProvider>
      {fontsLoaded ? (
        <Main />
      ) : (
        <View style={{ flex: 1, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.accent} />
        </View>
      )}
    </SafeAreaProvider>
  );
}


const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', backgroundColor: C.card, borderTopWidth: 1, borderColor: C.line, paddingTop: 8 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 48 },
  fab: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', marginTop: -22, borderWidth: 4, borderColor: C.bg },
});
