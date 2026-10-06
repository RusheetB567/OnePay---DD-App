import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
  type TextInputProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWorkspace } from "../state/workspace";
export const tokens = {
  space: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: { input: 12, card: 20, sheet: 26 },
  text: { display: 34, title: 26, heading: 19, body: 15, caption: 12 },
};
export const light = {
  background: "#F5F7F3",
  surface: "#FFFFFF",
  text: "#17382D",
  muted: "#637168",
  border: "#DDE4DA",
  primary: "#205941",
  onPrimary: "#FFFFFF",
  income: "#326C40",
  warning: "#865117",
  error: "#A33432",
  tint: "#E9F0DF",
};
export const dark = {
  background: "#101B17",
  surface: "#1B2A22",
  text: "#ECF3E9",
  muted: "#B2C0B2",
  border: "#35453A",
  primary: "#AAD68D",
  onPrimary: "#122117",
  income: "#B0DDA1",
  warning: "#EDC388",
  error: "#FFA9A3",
  tint: "#273D2D",
};
export function usePalette() {
  const { data } = useWorkspace();
  const system = useColorScheme();
  return data?.profile.theme === "dark" ||
    ((!data || data.profile.theme === "system") && system === "dark")
    ? dark
    : light;
}
export function Label({
  children,
  muted = false,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  const c = usePalette();
  return (
    <Text
      style={{ color: muted ? c.muted : c.text, fontSize: 15, lineHeight: 23 }}
    >
      {children}
    </Text>
  );
}
export function Heading({ children }: { children: React.ReactNode }) {
  const c = usePalette();
  return (
    <Text
      accessibilityRole="header"
      style={{
        color: c.text,
        fontSize: 26,
        fontWeight: "600",
        letterSpacing: -0.8,
        marginBottom: 8,
      }}
    >
      {children}
    </Text>
  );
}
export function Button({
  title,
  onPress,
  disabled = false,
  secondary = false,
  busy = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  busy?: boolean;
}) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        padding: 14,
        borderRadius: 12,
        backgroundColor: secondary ? c.tint : c.primary,
        opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 10,
      })}
    >
      {busy ? (
        <ActivityIndicator color={secondary ? c.text : c.onPrimary} />
      ) : (
        <Text
          style={{
            color: secondary ? c.text : c.onPrimary,
            fontSize: 14,
            fontWeight: "600",
          }}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}
export function Card({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress?: () => void;
}) {
  const c = usePalette();
  const style = {
    backgroundColor: c.surface,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  };
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress} style={style}>
      {children}
    </Pressable>
  ) : (
    <View style={style}>{children}</View>
  );
}
export function Amount({
  cents,
  large = false,
}: {
  cents: number;
  large?: boolean;
}) {
  const c = usePalette();
  return (
    <Text
      style={{
        color: c.text,
        fontSize: large ? 38 : 22,
        fontWeight: "600",
        fontVariant: ["tabular-nums"],
        marginVertical: 8,
      }}
    >
      {formatMoney(cents)}
    </Text>
  );
}
export const formatMoney = (cents: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(
    cents / 100,
  );
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const c = usePalette();
  return (
    <View style={{ marginVertical: 8 }}>
      <Text style={{ color: c.muted, fontSize: 12, marginBottom: 7 }}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.muted}
        {...props}
        style={[
          {
            color: c.text,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 12,
            padding: 14,
            minHeight: 48,
            fontSize: 15,
          },
          props.style,
        ]}
      />
    </View>
  );
}
export function Message({
  text,
  error = false,
}: {
  text: string;
  error?: boolean;
}) {
  const c = usePalette();
  return (
    <Text
      accessibilityRole={error ? "alert" : undefined}
      style={{
        color: error ? c.error : c.muted,
        fontSize: 13,
        lineHeight: 21,
        marginVertical: 10,
      }}
    >
      {text}
    </Text>
  );
}
export function Screen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const c = usePalette();
  const inset = useSafeAreaInsets();
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={{
        padding: 22,
        paddingTop: Math.max(inset.top, 20),
        paddingBottom: inset.bottom + 32,
        width: "100%",
        maxWidth: 600,
        alignSelf: "center",
      }}
    >
      <Text
        style={{
          color: c.muted,
          fontSize: 10,
          letterSpacing: 2,
          marginBottom: 18,
        }}
      >
        ONEPAY / YOUR MONEY, IN VIEW
      </Text>
      <Heading>{title}</Heading>
      {subtitle && <Message text={subtitle} />}
      <View style={{ height: 12 }} />
      {children}
    </ScrollView>
  );
}
export function DataGate({ children }: { children: React.ReactNode }) {
  const { data, loading, error, reload } = useWorkspace();
  return (
    <>
      {loading && !data ? (
        <View style={{ padding: 40 }}>
          <ActivityIndicator />
          <Message text="Refreshing your financial workspace…" />
        </View>
      ) : error && !data ? (
        <>
          <Message text={error} error />
          <Button title="Try again" onPress={() => void reload()} />
        </>
      ) : data ? (
        <>
          {error && (
            <Message
              text={`${error} Displayed data was last refreshed ${new Date(data.updatedAt).toLocaleTimeString()}.`}
              error
            />
          )}
          {children}
        </>
      ) : (
        <Message text="Sign in to view your workspace." />
      )}
    </>
  );
}
export function Choice<T extends string>({
  values,
  value,
  onChange,
}: {
  values: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  const c = usePalette();
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginVertical: 8,
      }}
    >
      {values.map((item) => (
        <Pressable
          key={item}
          accessibilityRole="button"
          accessibilityState={{ selected: value === item }}
          onPress={() => onChange(item)}
          style={{
            minHeight: 44,
            paddingHorizontal: 13,
            paddingVertical: 12,
            borderRadius: 12,
            backgroundColor: value === item ? c.primary : c.tint,
          }}
        >
          <Text
            style={{
              color: value === item ? c.onPrimary : c.text,
              fontSize: 12,
            }}
          >
            {item}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
export const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  section: { marginTop: 12, marginBottom: 14 },
});

export function BalanceHero({
  cents,
  buffer,
  onPress,
}: {
  cents: number;
  buffer: number;
  onPress: () => void;
}) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Estimated safe to spend ${formatMoney(cents)}. View forecast`}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: c.primary,
        borderRadius: 26,
        padding: 24,
        marginBottom: 16,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            color: c.onPrimary,
            fontSize: 12,
            fontWeight: "600",
            letterSpacing: 1,
          }}
        >
          SAFE TO SPEND
        </Text>
        <Text style={{ color: c.onPrimary, fontSize: 12 }}>
          30 DAY OUTLOOK ↗
        </Text>
      </View>
      <Text
        style={{
          color: c.onPrimary,
          fontSize: 44,
          fontWeight: "600",
          letterSpacing: -1.5,
          fontVariant: ["tabular-nums"],
          marginVertical: 20,
        }}
      >
        {formatMoney(cents)}
      </Text>
      <View
        style={{
          height: 1,
          backgroundColor: c.onPrimary,
          opacity: 0.25,
          marginBottom: 14,
        }}
      />
      <Text style={{ color: c.onPrimary, fontSize: 13, lineHeight: 21 }}>
        Estimated after expected commitments and your {formatMoney(buffer)}{" "}
        buffer.
      </Text>
      <Text
        style={{
          color: c.onPrimary,
          fontSize: 12,
          marginTop: 12,
          fontWeight: "600",
        }}
      >
        View your forecast →
      </Text>
    </Pressable>
  );
}
