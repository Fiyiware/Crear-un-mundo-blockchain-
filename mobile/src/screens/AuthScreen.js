import { useState } from 'react';
import { Text } from 'react-native';
import { api } from '../api';
import { Button, Card, ErrorText, Field, Screen } from '../components/ui';
import { colors } from '../theme';

export default function AuthScreen({ onSession }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', fullName: '', phone: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      const session = mode === 'login' ? await api.login(form) : await api.register(form);
      onSession(session);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen title="Envía dinero a casa" subtitle="De España a Colombia y El Salvador en segundos, con comisiones mínimas.">
      <Card>
        {mode === 'register' && <Field label="Nombre completo" value={form.fullName} onChangeText={set('fullName')} placeholder="Como aparece en tu DNI/NIE" />}
        <Field label="Email" value={form.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" placeholder="tu@email.com" />
        <Field label="Contraseña" value={form.password} onChangeText={set('password')} secureTextEntry placeholder="Mínimo 8 caracteres" />
        {mode === 'register' && <Field label="Teléfono (opcional)" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" placeholder="+34 600 000 000" />}
        <ErrorText>{error}</ErrorText>
        <Button title={mode === 'login' ? 'Entrar' : 'Crear cuenta'} onPress={submit} loading={loading} />
        <Button
          variant="secondary"
          title={mode === 'login' ? '¿No tienes cuenta? Regístrate' : 'Ya tengo cuenta'}
          onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
        />
      </Card>
      <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center' }}>Entorno de pruebas (sandbox). No se mueve dinero real.</Text>
    </Screen>
  );
}
