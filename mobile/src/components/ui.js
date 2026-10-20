import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, space } from '../theme';

export function Screen({ children, title, subtitle }) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled">
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </ScrollView>
  );
}

export const Card = ({ children, style }) => <View style={[styles.card, style]}>{children}</View>;

export function Button({ title, onPress, loading, variant = 'primary', disabled }) {
  const secondary = variant === 'secondary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [styles.button, secondary && styles.buttonSecondary, (pressed || disabled) && { opacity: 0.6 }]}
    >
      {loading ? <ActivityIndicator color={secondary ? colors.primary : '#fff'} /> : <Text style={[styles.buttonText, secondary && { color: colors.primary }]}>{title}</Text>}
    </Pressable>
  );
}

export function Field({ label, error, ...props }) {
  return (
    <View style={{ marginBottom: space(2) }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.muted} style={[styles.input, error && { borderColor: colors.danger }]} {...props} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function Chips({ options, value, onChange }) {
  return (
    <View style={styles.chips}>
      {options.map((o) => (
        <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.chip, value === o.value && styles.chipActive]}>
          <Text style={[styles.chipText, value === o.value && { color: '#fff' }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export const Row = ({ label, value, strong }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={[styles.rowValue, strong && { fontWeight: '700', color: colors.text }]}>{value}</Text>
  </View>
);

export const ErrorText = ({ children }) => (children ? <Text style={[styles.error, { marginBottom: space(2) }]}>{children}</Text> : null);

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  screenContent: { padding: space(2), paddingBottom: space(6) },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginTop: space(1) },
  subtitle: { fontSize: 15, color: colors.muted, marginTop: space(0.5), marginBottom: space(2) },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: space(2), marginBottom: space(2), borderWidth: 1, borderColor: colors.border },
  button: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: space(1) },
  buttonSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, fontSize: 16, backgroundColor: '#fff', color: colors.text },
  error: { color: colors.danger, fontSize: 13, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: space(2) },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.primary },
  chipActive: { backgroundColor: colors.primary },
  chipText: { color: colors.primary, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { color: colors.muted, fontSize: 15 },
  rowValue: { color: colors.text, fontSize: 15, flexShrink: 1, textAlign: 'right' },
});
