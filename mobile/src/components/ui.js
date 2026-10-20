// Componentes base del sistema visual "Tinta y mango".
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { C, F, R, TINTS } from '../theme';
import { initials } from '../format';

/** Texto con la familia tipográfica del sistema. `v`: display | displayX | body | medium | semi | bold. */
export function T({ v = 'body', size = 15, color = C.ink, num, style, children, ...rest }) {
  return (
    <Text style={[{ fontFamily: F[v] ?? F.body, fontSize: size, color }, num && styles.num, style]} {...rest}>
      {children}
    </Text>
  );
}

export const Icon = ({ name, size = 20, color = C.ink, style }) => <Feather name={name} size={size} color={color} style={style} />;

const FLAGS = {
  CO: [[2, '#FCD116'], [1, '#003893'], [1, '#CE1126']],
  SV: [[1, '#0F47AF'], [1, '#FFFFFF'], [1, '#0F47AF']],
  ES: [[1, '#AA151B'], [2, '#F1BF00'], [1, '#AA151B']],
};

/** Bandera circular dibujada con franjas (sin emojis, igual en todas las plataformas). */
export function Flag({ country, size = 22, ring, style }) {
  return (
    <View
      accessibilityLabel={{ CO: 'Colombia', SV: 'El Salvador', ES: 'España' }[country]}
      style={[{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }, ring && { borderWidth: 2, borderColor: ring }, style]}
    >
      {(FLAGS[country] ?? FLAGS.ES).map(([flex, color], i) => (
        <View key={i} style={{ flex, backgroundColor: color }} />
      ))}
    </View>
  );
}

const tintFor = (name = '') => TINTS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % TINTS.length];

export function Avatar({ name, size = 46, country, dark }) {
  return (
    <View style={{ width: size, height: size }}>
      <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: dark ? C.ink : tintFor(name) }]}>
        <T v="display" size={size * 0.34} color={dark ? C.accent : C.ink}>
          {initials(name)}
        </T>
      </View>
      {country ? <Flag country={country} size={Math.round(size * 0.38)} ring={C.bg} style={styles.avatarFlag} /> : null}
    </View>
  );
}

/** Contenedor de pantalla con scroll y pie fijo opcional (para el botón principal). */
export function Screen({ children, footer, dark, scroll = true, contentStyle }) {
  const bg = dark ? C.ink : C.bg;
  const Body = scroll ? ScrollView : View;
  const bodyProps = scroll
    ? { contentContainerStyle: [styles.content, footer && { paddingBottom: 140 }, contentStyle], keyboardShouldPersistTaps: 'handled', showsVerticalScrollIndicator: false }
    : { style: [styles.content, { flex: 1 }, contentStyle] };
  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <Body {...bodyProps}>{children}</Body>
      {footer ? <View style={[styles.footer, { backgroundColor: bg }]}>{footer}</View> : null}
    </View>
  );
}

export function IconButton({ icon, onPress, label, dark, size = 44 }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.iconBtn,
        { width: size, height: size, borderRadius: size / 2 },
        dark && { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'transparent' },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Icon name={icon} size={20} color={dark ? C.onInk : C.ink} />
    </Pressable>
  );
}

export function Header({ title, onBack, right }) {
  return (
    <View style={styles.header}>
      {onBack ? <IconButton icon="chevron-left" label="Volver" onPress={onBack} /> : <View style={{ width: 44 }} />}
      <T v="display" size={18} style={{ flex: 1, textAlign: 'center' }} numberOfLines={1}>
        {title}
      </T>
      {right ?? <View style={{ width: 44 }} />}
    </View>
  );
}

const BUTTON_VARIANTS = {
  accent: { bg: C.accent, fg: C.ink, border: C.accent },
  dark: { bg: C.ink, fg: C.onInk, border: C.ink },
  outline: { bg: 'transparent', fg: C.ink, border: C.ink },
  outlineLight: { bg: 'transparent', fg: C.onInk, border: 'rgba(255,255,255,0.35)' },
  soft: { bg: C.lineSoft, fg: C.ink, border: C.lineSoft },
};

export function Button({ title, onPress, variant = 'accent', icon, iconRight, loading, disabled, style, small }) {
  const v = BUTTON_VARIANTS[variant];
  const off = disabled && !loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { height: small ? 44 : 56, backgroundColor: off ? C.disabled : v.bg, borderColor: off ? C.disabled : v.border },
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={18} color={off ? C.muted : v.fg} /> : null}
          <T v="bold" size={small ? 14 : 16} color={off ? C.muted : v.fg}>
            {title}
          </T>
          {iconRight ? <Icon name={iconRight} size={18} color={off ? C.muted : v.fg} /> : null}
        </>
      )}
    </Pressable>
  );
}

export const Card = ({ children, style, dark }) => <View style={[styles.card, dark && styles.cardDark, style]}>{children}</View>;

export function Field({ label, error, icon, style, ...props }) {
  return (
    <View style={[{ marginBottom: 14 }, style]}>
      {label ? (
        <T v="semi" size={13} color={C.muted2} style={{ marginBottom: 6 }}>
          {label}
        </T>
      ) : null}
      <View style={[styles.input, error && { borderColor: C.danger }]}>
        {icon ? <Icon name={icon} size={18} color={C.muted} /> : null}
        <TextInput accessibilityLabel={label} placeholderTextColor="#8A94AD" style={styles.inputText} {...props} />
      </View>
      {error ? (
        <T size={12} color={C.danger} style={{ marginTop: 4 }}>
          {error}
        </T>
      ) : null}
    </View>
  );
}

/** Control segmentado (países, tipo de documento, etc.). */
export function Segmented({ options, value, onChange, style }) {
  return (
    <View accessibilityRole="tablist" style={[styles.segmented, style]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, on && { backgroundColor: C.ink }]}
          >
            {o.flag ? <Flag country={o.flag} size={20} /> : null}
            <T v="bold" size={14} color={on ? C.onInk : C.ink}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

const TONES = {
  success: [C.successBg, C.success],
  warn: [C.warnBg, C.warn],
  danger: [C.dangerBg, C.danger],
  neutral: [C.lineSoft, C.ink],
};

export function Badge({ tone = 'neutral', children, style }) {
  const [bg, fg] = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <T v="bold" size={11} color={fg}>
        {children}
      </T>
    </View>
  );
}

export function Notice({ tone = 'success', icon = 'shield', children }) {
  const [bg, fg] = TONES[tone];
  return (
    <View style={[styles.notice, { backgroundColor: bg }]}>
      <Icon name={icon} size={16} color={fg} style={{ marginTop: 1 }} />
      <T size={12} color={fg} style={{ flex: 1, lineHeight: 18 }}>
        {children}
      </T>
    </View>
  );
}

export const Row = ({ label, value, strong, valueColor }) => (
  <View style={styles.row}>
    <T size={14} color={C.muted}>
      {label}
    </T>
    <T v={strong ? 'bold' : 'semi'} size={14} color={valueColor ?? C.ink} num style={{ flexShrink: 1, textAlign: 'right' }}>
      {value}
    </T>
  </View>
);

export function SectionTitle({ children, action, onAction, style }) {
  return (
    <View style={[styles.sectionTitle, style]}>
      <T v="display" size={17}>
        {children}
      </T>
      {action ? (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button">
          <T v="semi" size={13} color={C.muted2}>
            {action}
          </T>
        </Pressable>
      ) : null}
    </View>
  );
}

export const ErrorText = ({ children }) =>
  children ? (
    <View style={{ marginBottom: 12 }}>
      <Notice tone="danger" icon="alert-circle">
        {children}
      </Notice>
    </View>
  ) : null;

export const styles = StyleSheet.create({
  num: { fontVariant: ['tabular-nums'] },
  content: { padding: 20, paddingTop: 12, paddingBottom: 120 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', height: 44, marginBottom: 16, gap: 8 },
  iconBtn: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarFlag: { position: 'absolute', right: -2, bottom: -2 },
  button: { borderRadius: R.pill, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20 },
  card: { backgroundColor: C.card, borderRadius: R.lg, padding: 18 },
  cardDark: { backgroundColor: C.ink },
  input: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, paddingHorizontal: 14 },
  inputText: { flex: 1, fontFamily: F.medium, fontSize: 16, color: C.ink, height: '100%', outlineStyle: 'none' },
  segmented: { flexDirection: 'row', gap: 6, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: R.pill, padding: 4 },
  segment: { flex: 1, height: 40, borderRadius: R.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: R.pill },
  notice: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: R.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, gap: 12 },
  sectionTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
});
