import { useState } from 'react';
import { View } from 'react-native';
import { api } from '../api';
import { Button, Card, ErrorText, Field, Icon, IconButton, Screen, Segmented, T } from '../components/ui';
import { C, R } from '../theme';

// En producción este paso abre el SDK de verificación del partner regulado
// (captura de documento + prueba de vida). Aquí se simula la captura.
function Corner({ pos }) {
  const base = { position: 'absolute', width: 28, height: 28, borderColor: C.accent };
  const map = {
    tl: { left: 20, top: 20, borderLeftWidth: 3, borderTopWidth: 3, borderTopLeftRadius: 10 },
    tr: { right: 20, top: 20, borderRightWidth: 3, borderTopWidth: 3, borderTopRightRadius: 10 },
    bl: { left: 20, bottom: 20, borderLeftWidth: 3, borderBottomWidth: 3, borderBottomLeftRadius: 10 },
    br: { right: 20, bottom: 20, borderRightWidth: 3, borderBottomWidth: 3, borderBottomRightRadius: 10 },
  };
  return <View style={[base, map[pos]]} />;
}

function CameraFrame({ stage, docName }) {
  return (
    <View style={{ height: 210, borderRadius: 24, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', gap: 14, overflow: 'hidden' }}>
      {['tl', 'tr', 'bl', 'br'].map((p) => (
        <Corner key={p} pos={p} />
      ))}
      {stage === 'doc' && (
        <View style={{ width: 196, height: 120, borderRadius: 14, borderWidth: 2, borderColor: '#3F5794', flexDirection: 'row', gap: 14, padding: 16 }}>
          <View style={{ width: 52, height: 68, borderRadius: 10, backgroundColor: '#1E3470' }} />
          <View style={{ flex: 1, gap: 8, paddingTop: 4 }}>
            {[0.8, 0.6, 0.7].map((w, i) => (
              <View key={i} style={{ height: 8, width: `${w * 100}%`, borderRadius: 4, backgroundColor: '#2A417F' }} />
            ))}
            <View style={{ height: 8, width: '40%', borderRadius: 4, backgroundColor: C.accent }} />
          </View>
        </View>
      )}
      {stage === 'selfie' && (
        <View style={{ width: 112, height: 138, borderRadius: 70, borderWidth: 2, borderStyle: 'dashed', borderColor: C.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="user" size={56} color="#5B74B8" />
        </View>
      )}
      {stage === 'ready' && (
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: C.success, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={40} color="#fff" />
        </View>
      )}
      <T v="semi" size={13} color={C.onInkMuted}>
        {stage === 'doc' ? `Coloca tu ${docName} dentro del marco` : stage === 'selfie' ? 'Centra tu cara en el óvalo' : 'Todo listo para verificar'}
      </T>
    </View>
  );
}

function Check({ n, label, hint, ok, last }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 58, borderBottomWidth: last ? 0 : 1, borderColor: C.lineSoft }}>
      {ok ? (
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.success, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={15} color="#fff" />
        </View>
      ) : (
        <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#D5DBE7', alignItems: 'center', justifyContent: 'center' }}>
          <T v="bold" size={12} color={C.muted}>
            {n}
          </T>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <T v="bold" size={15}>
          {label}
        </T>
        <T size={12} color={C.muted}>
          {hint}
        </T>
      </View>
      <T v="bold" size={12} color={ok ? C.success : C.muted}>
        {ok ? 'Listo' : 'Pendiente'}
      </T>
    </View>
  );
}

export default function KycScreen({ onDone, onBack }) {
  const [documentType, setDocumentType] = useState('DNI');
  const [documentNumber, setDocumentNumber] = useState('');
  const [docDone, setDocDone] = useState(false);
  const [selfie, setSelfie] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const docName = documentType === 'PASAPORTE' ? 'pasaporte' : documentType;
  const stage = !docDone ? 'doc' : !selfie ? 'selfie' : 'ready';

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      const session = await api.startKyc();
      const res = await api.submitKyc(session.sessionId, { documentType, documentNumber, selfieProvided: selfie });
      if (res.status !== 'APPROVED') setError(`Verificación ${res.status === 'REJECTED' ? 'rechazada' : 'pendiente'}${res.reason ? `: ${res.reason}` : ''}`);
      onDone(res.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const footer =
    stage === 'ready' ? (
      <Button title="Enviar verificación" iconRight="arrow-right" onPress={submit} loading={loading} disabled={!documentNumber} />
    ) : (
      <Button
        title={stage === 'doc' ? `Hacer foto del ${docName}` : 'Hacer selfie'}
        icon="camera"
        variant="dark"
        disabled={stage === 'doc' && !documentNumber}
        onPress={() => (stage === 'doc' ? setDocDone(true) : setSelfie(true))}
      />
    );

  return (
    <Screen footer={footer}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        {onBack ? <IconButton icon="chevron-left" label="Volver" onPress={onBack} /> : null}
        <View style={{ flex: 1, gap: 6 }}>
          <T v="bold" size={12} color={C.muted2}>
            Paso 2 de 3
          </T>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {[C.ink, C.accent, '#D5DBE7'].map((c, i) => (
              <View key={i} style={{ flex: 1, height: 5, borderRadius: R.pill, backgroundColor: c }} />
            ))}
          </View>
        </View>
      </View>
      <T v="displayX" size={30} style={{ letterSpacing: -0.6 }}>
        Verifica tu identidad
      </T>
      <T size={15} color={C.muted2} style={{ marginTop: 6, marginBottom: 16, lineHeight: 22 }}>
        La ley lo exige antes de tu primer envío. Solo lo haces una vez.
      </T>
      <Segmented
        value={documentType}
        onChange={setDocumentType}
        options={[{ value: 'DNI', label: 'DNI' }, { value: 'NIE', label: 'NIE' }, { value: 'PASAPORTE', label: 'Pasaporte' }]}
        style={{ marginBottom: 14 }}
      />
      <Field label={`Número de ${docName}`} icon="credit-card" value={documentNumber} onChangeText={setDocumentNumber} autoCapitalize="characters" placeholder="12345678Z" />
      <CameraFrame stage={stage} docName={docName} />
      <Card style={{ marginTop: 14, paddingVertical: 4 }}>
        <Check n="1" label={`Foto del ${docName}`} hint="Las dos caras, sin reflejos" ok={docDone} />
        <Check n="2" label="Selfie con prueba de vida" hint="Mira a la cámara y gira la cabeza" ok={selfie} last />
      </Card>
      <View style={{ marginTop: 14 }}>
        <ErrorText>{error}</ErrorText>
        <T size={12} color={C.muted} style={{ textAlign: 'center', lineHeight: 18 }}>
          Lo gestiona nuestra entidad de dinero electrónico asociada, regulada en la UE. Sandbox: usa el DNI 12345678Z.
        </T>
      </View>
    </Screen>
  );
}
