import { useState } from 'react';
import { Text } from 'react-native';
import { api } from '../api';
import { Button, Card, Chips, ErrorText, Field, Screen } from '../components/ui';
import { colors } from '../theme';

// En producción este paso abre el SDK de verificación del partner regulado
// (captura de documento + prueba de vida). Aquí se simula con un formulario.
export default function KycScreen({ onDone }) {
  const [documentType, setDocumentType] = useState('DNI');
  const [documentNumber, setDocumentNumber] = useState('');
  const [selfie, setSelfie] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      const session = await api.startKyc();
      const res = await api.submitKyc(session.sessionId, { documentType, documentNumber, selfieProvided: selfie });
      if (res.status !== 'APPROVED') setError(`Verificación ${res.status === 'REJECTED' ? 'rechazada' : 'pendiente'}: ${res.reason ?? ''}`);
      onDone(res.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen title="Verifica tu identidad" subtitle="Requisito legal (normativa AML) antes de tu primer envío. Lo gestiona nuestra entidad de dinero electrónico asociada.">
      <Card>
        <Chips
          value={documentType}
          onChange={setDocumentType}
          options={[{ value: 'DNI', label: 'DNI' }, { value: 'NIE', label: 'NIE' }, { value: 'PASAPORTE', label: 'Pasaporte' }]}
        />
        <Field label="Número de documento" value={documentNumber} onChangeText={setDocumentNumber} autoCapitalize="characters" placeholder="12345678Z" />
        <Button variant="secondary" title={selfie ? '✓ Selfie verificado' : 'Hacer selfie (prueba de vida)'} onPress={() => setSelfie(true)} />
        <ErrorText>{error}</ErrorText>
        <Button title="Enviar verificación" onPress={submit} loading={loading} disabled={!documentNumber} />
      </Card>
      <Text style={{ color: colors.muted, fontSize: 12 }}>Sandbox: usa el DNI de prueba 12345678Z.</Text>
    </Screen>
  );
}
