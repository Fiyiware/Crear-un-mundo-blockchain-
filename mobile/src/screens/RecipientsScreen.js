import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { api } from '../api';
import { Avatar, Button, Card, ErrorText, Field, Flag, Header, Icon, IconButton, Notice, Screen, Segmented, T } from '../components/ui';
import { money, METHOD_LABEL } from '../format';
import { C, R } from '../theme';

const METHODS = {
  CO: [
    { value: 'NEQUI', label: 'Nequi', hint: 'Con su número de celular', icon: 'smartphone' },
    { value: 'DAVIPLATA', label: 'Daviplata', hint: 'Con su número de celular', icon: 'credit-card' },
    { value: 'BANK_CO', label: 'Banco', hint: 'Ahorros o corriente', icon: 'home' },
  ],
  SV: [
    { value: 'BANK_SV', label: 'Banco', hint: 'Cuenta bancaria', icon: 'home' },
    { value: 'WALLET_SV', label: 'Billetera', hint: 'Con su número de celular', icon: 'smartphone' },
  ],
};
const COUNTRY_NAME = { CO: 'Colombia', SV: 'El Salvador' };

const detailOf = (r) => (r.phone ? `${r.phone.slice(0, 3)} ••• ${r.phone.slice(-4)}` : `${r.bankName ?? 'Cuenta'} ${r.accountNumber ?? ''}`);

function RecipientCard({ r, onPress, onDelete, selected }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingHorizontal: 14, borderRadius: 20, backgroundColor: C.card, borderWidth: selected ? 2 : 1, borderColor: selected ? C.ink : C.line },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Avatar name={r.fullName} size={46} country={r.country} />
      <View style={{ flex: 1, gap: 4 }}>
        <T v="bold" size={15} numberOfLines={1}>
          {r.fullName}
        </T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: R.pill, backgroundColor: C.lineSoft }}>
            <T v="bold" size={12}>
              {METHOD_LABEL[r.payoutMethod]}
            </T>
          </View>
          <T size={12} color={C.muted} num numberOfLines={1} style={{ flexShrink: 1 }}>
            {detailOf(r)}
          </T>
        </View>
      </View>
      {onDelete ? <IconButton icon="trash-2" label={`Eliminar a ${r.fullName}`} size={38} onPress={onDelete} /> : <Icon name="chevron-right" size={18} color={C.muted} />}
    </Pressable>
  );
}

function NewRecipientForm({ country: fixedCountry, onCreated, onCancel }) {
  const [country, setCountry] = useState(fixedCountry ?? 'CO');
  const [form, setForm] = useState({ payoutMethod: METHODS[fixedCountry ?? 'CO'][0].value, fullName: '', documentNumber: '', phone: '', bankCode: '', accountNumber: '', accountType: 'AHORROS' });
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
      setError(e.details ? 'Revisa los datos marcados' : e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card style={{ borderRadius: 24, marginTop: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <T v="display" size={18}>
          Nuevo destinatario
        </T>
        <IconButton icon="x" label="Cerrar" size={38} onPress={onCancel} />
      </View>
      {!fixedCountry && (
        <Segmented
          value={country}
          onChange={(c) => {
            setCountry(c);
            set('payoutMethod')(METHODS[c][0].value);
          }}
          options={[{ value: 'CO', label: 'Colombia', flag: 'CO' }, { value: 'SV', label: 'El Salvador', flag: 'SV' }]}
          style={{ marginBottom: 14 }}
        />
      )}
      <T v="semi" size={13} color={C.muted2} style={{ marginBottom: 8 }}>
        ¿Dónde lo cobra?
      </T>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {METHODS[country].map((opt) => {
          const on = opt.value === m;
          return (
            <Pressable
              key={opt.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => set('payoutMethod')(opt.value)}
              style={{ flex: 1, padding: 12, borderRadius: 18, borderWidth: on ? 2 : 1, borderColor: on ? C.ink : C.line, gap: 8 }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: on ? C.ink : C.lineSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={opt.icon} size={18} color={on ? C.accent : C.ink} />
              </View>
              <T v="bold" size={14}>
                {opt.label}
              </T>
              <T size={11} color={C.muted} style={{ marginTop: -4 }}>
                {opt.hint}
              </T>
            </Pressable>
          );
        })}
      </View>
      <Field label="Nombre completo" icon="user" value={form.fullName} onChangeText={set('fullName')} error={errors.fullName} placeholder="Nombre y apellidos" />
      <Field label={country === 'CO' ? 'Cédula de ciudadanía' : 'DUI'} icon="credit-card" value={form.documentNumber} onChangeText={set('documentNumber')} keyboardType="number-pad" error={errors.documentNumber} placeholder={country === 'CO' ? '1020304050' : '00016297-5'} />
      {isWallet ? (
        <Field label="Número de celular" icon="smartphone" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" placeholder={country === 'CO' ? '300 123 4567' : '7012 3456'} error={errors.phone} />
      ) : (
        <>
          <Field label="Código de banco" icon="home" value={form.bankCode} onChangeText={set('bankCode')} autoCapitalize="characters" placeholder={country === 'CO' ? '1007 (Bancolombia)' : 'AGRICOLA'} error={errors.bankCode} />
          <Field label="Número de cuenta" icon="hash" value={form.accountNumber} onChangeText={set('accountNumber')} keyboardType="number-pad" error={errors.accountNumber} />
          {country === 'CO' && (
            <Segmented value={form.accountType} onChange={set('accountType')} options={[{ value: 'AHORROS', label: 'Ahorros' }, { value: 'CORRIENTE', label: 'Corriente' }]} style={{ marginBottom: 14 }} />
          )}
        </>
      )}
      <ErrorText>{error}</ErrorText>
      <Button title="Guardar destinatario" icon="check" variant="dark" onPress={save} loading={loading} />
    </Card>
  );
}

/** Lista y alta de destinatarios. Con `onSelect` funciona como selector dentro del flujo de envío. */
export default function RecipientsScreen({ onSelect, onBack, quote, country }) {
  const [list, setList] = useState([]);
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState(country ?? 'ALL');
  const load = useCallback(() => api.recipients().then((r) => setList(r.recipients)), []);
  useEffect(() => {
    load();
  }, [load]);

  const picking = !!onSelect;
  const visible = list.filter((r) => filter === 'ALL' || r.country === filter);
  const countries = filter === 'ALL' ? ['CO', 'SV'] : [filter];

  async function remove(r) {
    await api.deleteRecipient(r.id);
    load();
  }

  return (
    <Screen>
      <Header title={picking ? '¿A quién envías?' : 'Destinatarios'} onBack={onBack} />

      {quote && (
        <View style={{ height: 44, borderRadius: 14, backgroundColor: C.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <T v="bold" size={13} color={C.onInk} num>
              {money(quote.sendAmountMinor, 'EUR')}
            </T>
            <Icon name="arrow-right" size={14} color={C.accent} />
            <T v="bold" size={13} color={C.onInk} num>
              {money(quote.receiveAmountMinor, quote.destinationCurrency)}
            </T>
          </View>
          <Pressable onPress={onBack} hitSlop={10} accessibilityRole="button">
            <T v="bold" size={13} color={C.accent}>
              Editar
            </T>
          </Pressable>
        </View>
      )}

      {!picking && (
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[{ value: 'ALL', label: 'Todos' }, { value: 'CO', label: 'Colombia', flag: 'CO' }, { value: 'SV', label: 'El Salvador', flag: 'SV' }]}
          style={{ marginBottom: 18 }}
        />
      )}

      {countries.map((c) => {
        const items = visible.filter((r) => r.country === c);
        if (!items.length) return null;
        return (
          <View key={c} style={{ marginBottom: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Flag country={c} size={18} />
              <T v="display" size={16}>{`En ${COUNTRY_NAME[c]}`}</T>
            </View>
            <View style={{ gap: 8 }}>
              {items.map((r) => (
                <RecipientCard key={r.id} r={r} onPress={picking ? () => onSelect(r) : undefined} onDelete={picking ? undefined : () => remove(r)} />
              ))}
            </View>
          </View>
        );
      })}

      {!visible.length && !adding && (
        <Card style={{ alignItems: 'center', gap: 8, paddingVertical: 28, marginBottom: 16 }}>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: C.lineSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="users" size={22} />
          </View>
          <T v="bold" size={15}>
            Aún no tienes destinatarios aquí
          </T>
          <T size={13} color={C.muted} style={{ textAlign: 'center' }}>
            Añade a quien recibe el dinero. Solo lo haces una vez.
          </T>
        </Card>
      )}

      {adding ? (
        <NewRecipientForm
          country={country}
          onCreated={(r) => {
            setAdding(false);
            load();
            onSelect?.(r);
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <Button title="Añadir destinatario" icon="user-plus" variant="outline" onPress={() => setAdding(true)} />
      )}

      <View style={{ marginTop: 18 }}>
        <Notice tone="success" icon="shield">
          Comprobamos la cédula o el DUI y el número de cuenta antes de enviar, para que el dinero no se pierda.
        </Notice>
      </View>
    </Screen>
  );
}
