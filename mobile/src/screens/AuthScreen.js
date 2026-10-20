import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { api } from '../api';
import { Button, Card, ErrorText, Field, Flag, Icon, IconButton, T } from '../components/ui';
import { C, R } from '../theme';

function RouteIllustration() {
  return (
    <View style={{ height: 270, marginTop: 8 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="270" viewBox="0 0 342 270">
        <Circle cx="171" cy="150" r="118" stroke="#1E3470" strokeWidth="1.5" fill="none" />
        <Circle cx="171" cy="150" r="78" stroke="#1E3470" strokeWidth="1.5" fill="none" />
        <Path d="M70 82 C 130 0, 260 30, 270 176" stroke={C.accent} strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" fill="none" />
        <Path d="M70 82 C 70 190, 170 230, 120 242" stroke="#5B74B8" strokeWidth="2" strokeDasharray="2 9" strokeLinecap="round" fill="none" />
      </Svg>
      <Flag country="ES" size={52} ring="#2A417F" style={{ position: 'absolute', left: '13%', top: 56 }} />
      <Flag country="CO" size={56} ring={C.accent} style={{ position: 'absolute', left: '71%', top: 150 }} />
      <Flag country="SV" size={46} ring="#2A417F" style={{ position: 'absolute', left: '28%', top: 220 }} />
      <View style={{ position: 'absolute', left: '40%', top: 26, height: 34, paddingHorizontal: 12, borderRadius: R.pill, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name="check" size={14} color={C.success} />
        <T v="bold" size={13} num>
          Entregado en Nequi
        </T>
      </View>
    </View>
  );
}

export default function AuthScreen({ onSession }) {
  const [mode, setMode] = useState('welcome');
  const [form, setForm] = useState({ email: '', password: '', fullName: '', phone: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      onSession(mode === 'login' ? await api.login(form) : await api.register(form));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (mode === 'welcome') {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: C.ink }} contentContainerStyle={{ padding: 24, paddingTop: 20, flexGrow: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="send" size={18} color={C.ink} />
          </View>
          <T v="displayX" size={20} color={C.onInk}>
            Remesas LatAm
          </T>
        </View>
        <RouteIllustration />
        <T v="displayX" size={38} color={C.onInk} style={{ lineHeight: 40, letterSpacing: -1, marginTop: 8 }}>
          Tu dinero en casa en menos de un minuto.
        </T>
        <T size={16} color={C.onInkMuted} style={{ lineHeight: 24, marginTop: 12 }}>
          De España a Colombia y El Salvador. Pagas con Bizum y llega a Nequi, Daviplata o al banco.
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
          {['0,99 € por envío', 'Tipo de cambio claro', 'Seguimiento en vivo'].map((c) => (
            <View key={c} style={{ height: 32, paddingHorizontal: 12, borderRadius: R.pill, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center' }}>
              <T v="semi" size={13} color={C.onInk}>
                {c}
              </T>
            </View>
          ))}
        </View>
        <View style={{ flex: 1, minHeight: 24 }} />
        <View style={{ gap: 10, marginTop: 16 }}>
          <Button title="Crear cuenta gratis" iconRight="arrow-right" onPress={() => setMode('register')} />
          <Button title="Ya tengo cuenta" variant="outlineLight" onPress={() => setMode('login')} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 6 }}>
            <Icon name="shield" size={14} color={C.onInkFaint} />
            <T size={12} color={C.onInkFaint}>
              Fondos custodiados por una entidad regulada en la UE
            </T>
          </View>
        </View>
      </ScrollView>
    );
  }

  const isLogin = mode === 'login';
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.ink }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 12, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <IconButton icon="chevron-left" label="Volver" dark onPress={() => setMode('welcome')} />
        <T v="displayX" size={32} color={C.onInk} style={{ marginTop: 24, letterSpacing: -0.8 }}>
          {isLogin ? 'Hola de nuevo' : 'Crea tu cuenta'}
        </T>
        <T size={15} color={C.onInkMuted} style={{ marginTop: 6, marginBottom: 20 }}>
          {isLogin ? 'Entra para enviar o seguir tus envíos.' : 'Tarda menos que hacer un Bizum.'}
        </T>
        <Card style={{ borderRadius: 28, padding: 20 }}>
          {!isLogin && <Field label="Nombre completo" icon="user" value={form.fullName} onChangeText={set('fullName')} placeholder="Como aparece en tu DNI o NIE" />}
          <Field label="Email" icon="mail" value={form.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" placeholder="tu@email.com" />
          <Field label="Contraseña" icon="lock" value={form.password} onChangeText={set('password')} secureTextEntry placeholder="Mínimo 8 caracteres" />
          {!isLogin && <Field label="Teléfono (opcional)" icon="phone" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" placeholder="+34 600 000 000" />}
          <ErrorText>{error}</ErrorText>
          <Button title={isLogin ? 'Entrar' : 'Crear cuenta'} iconRight="arrow-right" onPress={submit} loading={loading} />
        </Card>
        <Button
          title={isLogin ? '¿No tienes cuenta? Regístrate' : 'Ya tengo cuenta'}
          variant="outlineLight"
          small
          style={{ marginTop: 16, borderWidth: 0 }}
          onPress={() => setMode(isLogin ? 'register' : 'login')}
        />
        <T size={12} color={C.onInkFaint} style={{ textAlign: 'center', marginTop: 12 }}>
          Entorno de pruebas (sandbox). No se mueve dinero real.
        </T>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
