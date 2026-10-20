import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api } from '../api';
import { Button, Card, Chips, ErrorText, Field, Screen } from '../components/ui';
import { colors } from '../theme';

const METHODS_BY_COUNTRY = {
  CO: [{ value: 'NEQUI', label: 'Nequi' }, { value: 'DAVIPLATA', label: 'Daviplata' }, { value: 'BANK_CO', label: 'Banco' }],
  SV: [{ value: 'BANK_SV', label: 'Banco' }, { value: 'WALLET_SV', label: 'Billetera móvil' }],
};
const METHOD_LABEL = { NEQUI: 'Nequi', DAVIPLATA: 'Daviplata', BANK_CO: 'Banco CO', BANK_SV: 'Banco SV', WALLET_SV: 'Billetera SV' };

/** Lista y alta de destinatarios. Con `onSelect` funciona como selector. */
export default function RecipientsScreen({ onSelect, filterMethods }) {
  const [list, setList] = useState([]);
  const [adding, setAdding] = useState(false);
  const load = useCallback(() => api.recipients().then((r) => setList(r.recipients)), []);
  useEffect(() => {
    load();
  }, [load]);

  const visible = filterMethods ? list.filter((r) => filterMethods.includes(r.payoutMethod)) : list;

  return (
    <Screen title={onSelect ? '¿A quién envías?' : 'Destinatarios'}>
      {visible.map((r) => (
        <Pressable key={r.id} onPress={() => onSelect?.(r)}>
          <Card>
            <Text style={{ fontWeight: '700', fontSize: 16, color: colors.text }}>{r.fullName}</Text>
            <Text style={{ color: colors.muted, marginTop: 4 }}>
              {METHOD_LABEL[r.payoutMethod]} · {r.phone ?? `${r.bankName} ${r.accountNumber}`} · {r.documentType} {r.documentNumber}
            </Text>
          </Card>
        </Pressable>
      ))}
      {!visible.length && !adding && <Text style={{ color: colors.muted, marginBottom: 16 }}>Aún no tienes destinatarios para este destino.</Text>}
      {adding ? (
        <NewRecipientForm
          onCreated={(r) => {
            setAdding(false);
            load();
            onSelect?.(r);
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <Button title="+ Añadir destinatario" variant="secondary" onPress={() => setAdding(true)} />
      )}
    </Screen>
  );
}

function NewRecipientForm({ onCreated, onCancel }) {
  const [country, setCountry] = useState('CO');
  const [form, setForm] = useState({ payoutMethod: 'NEQUI', fullName: '', documentNumber: '', phone: '', bankCode: '', accountNumber: '', accountType: 'AHORROS' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const m = form.payoutMethod;
  const isWallet = ['NEQUI', 'DAVIPLATA', 'WALLET_SV'].includes(m);

  async function save() {
    setLoading(true);
    setErrors({});
    setError(null);
    try {
      onCreated(await api.addRecipient(form));
    } catch (e) {
      setErrors(e.details ?? {});
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <Chips
        value={country}
        onChange={(c) => {
          setCountry(c);
          set('payoutMethod')(METHODS_BY_COUNTRY[c][0].value);
        }}
        options={[{ value: 'CO', label: '🇨🇴 Colombia' }, { value: 'SV', label: '🇸🇻 El Salvador' }]}
      />
      <Chips value={m} onChange={set('payoutMethod')} options={METHODS_BY_COUNTRY[country]} />
      <Field label="Nombre completo" value={form.fullName} onChangeText={set('fullName')} error={errors.fullName} />
      <Field label={country === 'CO' ? 'Cédula de ciudadanía' : 'DUI'} value={form.documentNumber} onChangeText={set('documentNumber')} keyboardType="number-pad" error={errors.documentNumber} />
      {isWallet && <Field label="Número de celular" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" placeholder={country === 'CO' ? '300 123 4567' : '7012 3456'} error={errors.phone} />}
      {!isWallet && (
        <View>
          <Field label="Código de banco" value={form.bankCode} onChangeText={set('bankCode')} autoCapitalize="characters" placeholder={country === 'CO' ? '1007 (Bancolombia)' : 'AGRICOLA'} error={errors.bankCode} />
          <Field label="Número de cuenta" value={form.accountNumber} onChangeText={set('accountNumber')} keyboardType="number-pad" error={errors.accountNumber} />
          {country === 'CO' && <Chips value={form.accountType} onChange={set('accountType')} options={[{ value: 'AHORROS', label: 'Ahorros' }, { value: 'CORRIENTE', label: 'Corriente' }]} />}
        </View>
      )}
      <ErrorText>{error}</ErrorText>
      <Button title="Guardar destinatario" onPress={save} loading={loading} />
      <Button title="Cancelar" variant="secondary" onPress={onCancel} />
    </Card>
  );
}
