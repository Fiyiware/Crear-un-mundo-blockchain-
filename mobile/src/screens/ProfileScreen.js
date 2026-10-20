import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { api } from '../api';
import { Avatar, Badge, Button, Card, Header, Row, Screen, T } from '../components/ui';
import { money } from '../format';
import { C, R } from '../theme';

function LimitBar({ label, used, max }) {
  const pct = Math.min(1, max ? used / max : 0);
  return (
    <View style={{ marginTop: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <T v="semi" size={13}>
          {label}
        </T>
        <T size={13} color={C.muted} num>{`${money(used, 'EUR')} de ${money(max, 'EUR')}`}</T>
      </View>
      <View style={{ height: 8, borderRadius: R.pill, backgroundColor: C.lineSoft }}>
        <View style={{ height: 8, borderRadius: R.pill, width: `${pct * 100}%`, backgroundColor: pct > 0.85 ? C.warn : C.ink }} />
      </View>
    </View>
  );
}

export default function ProfileScreen({ user, onVerify, onLogout }) {
  const [me, setMe] = useState(null);
  useEffect(() => {
    api.me().then(setMe, () => {});
  }, []);
  const verified = user.kycStatus === 'APPROVED';

  return (
    <Screen>
      <Header title="Perfil" />
      <View style={{ alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <Avatar name={user.fullName} size={76} dark />
        <T v="display" size={22}>
          {user.fullName}
        </T>
        <T size={14} color={C.muted}>
          {user.email}
        </T>
        <Badge tone={verified ? 'success' : 'warn'} style={{ alignSelf: 'center' }}>{verified ? 'Identidad verificada' : 'Sin verificar'}</Badge>
      </View>
      {!verified && <Button title="Verificar identidad" icon="shield" onPress={onVerify} style={{ marginBottom: 16 }} />}
      {me && (
        <Card>
          <T v="display" size={16}>
            Límites del piloto
          </T>
          <T size={12} color={C.muted} style={{ marginTop: 2 }}>
            Durante las pruebas del sandbox los importes están limitados.
          </T>
          <LimitBar label="Últimas 24 horas" used={me.dailyVolumeMinor ?? 0} max={me.limits.maxDailyCents} />
          <LimitBar label="Últimos 30 días" used={me.monthlyVolumeMinor ?? 0} max={me.limits.maxMonthlyCents} />
          <View style={{ marginTop: 12 }}>
            <Row label="Por envío" value={`${money(me.limits.minPerTransferCents, 'EUR')} – ${money(me.limits.maxPerTransferCents, 'EUR')}`} />
          </View>
        </Card>
      )}
      <Button title="Cerrar sesión" icon="log-out" variant="outline" style={{ marginTop: 16 }} onPress={onLogout} />
      <T size={12} color={C.muted} style={{ textAlign: 'center', marginTop: 16 }}>
        Entorno de pruebas (sandbox). No se mueve dinero real.
      </T>
    </Screen>
  );
}
