import React, { useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Modal,
  PanResponder,
  type TextInputProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWorkspace } from "../state/workspace";
import { tokens, light, dark } from "./tokens";
import { Icon, OnePayMark } from "./icons";
import { feedback, useEntrance, usePulse, useReducedMotion } from "./motion";
export { tokens, light, dark, Icon, OnePayMark };
export function usePalette() {
  const { data } = useWorkspace();
  const system = useColorScheme();
  return data?.profile.theme === "light"
    ? light
    : data?.profile.theme === "dark" || system === "dark"
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
      style={{ color: muted ? c.muted : c.text, fontSize: 16, lineHeight: 24 }}
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
        fontSize: 24,
        fontWeight: "700",
        letterSpacing: -0.7,
        marginBottom: 8,
      }}
    >
      {children}
    </Text>
  );
}
export function OnePayLoader({
  text = "Updating your money view",
  inline = false,
}: {
  text?: string;
  inline?: boolean;
}) {
  const c = usePalette(),
    opacity = usePulse();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={text}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: inline ? 0 : 16,
      }}
    >
      <Animated.View style={{ opacity }}>
        <OnePayMark color={c.primary} size={inline ? 22 : 40} />
      </Animated.View>
      <Text style={{ color: c.muted, fontSize: 14, flexShrink: 1 }}>
        {text}
      </Text>
    </View>
  );
}
export function Button({
  title,
  onPress,
  disabled = false,
  secondary = false,
  busy = false,
  destructive = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  busy?: boolean;
  destructive?: boolean;
}) {
  const reduced = useReducedMotion();
  const c = usePalette(),
    [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 50,
        padding: 16,
        borderRadius: tokens.radius.input,
        backgroundColor: secondary ? c.tint : destructive ? c.error : c.primary,
        opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        transform: [{ scale: pressed && !reduced ? 0.985 : 1 }],
        alignItems: "center",
        justifyContent: "center",
        marginTop: 8,
        borderWidth: 2,
        borderColor: focused ? c.aqua : "transparent",
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {busy && (
          <OnePayMark size={20} color={secondary ? c.text : c.onPrimary} />
        )}
        <Text
          style={{
            color: secondary ? c.text : c.onPrimary,
            fontSize: 15,
            fontWeight: "600",
          }}
        >
          {busy ? `${title}…` : title}
        </Text>
      </View>
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
    borderRadius: tokens.radius.card,
    padding: 20,
    marginBottom: 16,
  };
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [style, { opacity: pressed ? 0.8 : 1 }]}
    >
      {children}
    </Pressable>
  ) : (
    <View style={style}>{children}</View>
  );
}
export function useMoney() {
  const { hideAmounts } = useWorkspace();
  return (cents: number) => (hideAmounts ? "••••" : formatMoney(cents));
}
export const formatMoney = (cents: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(
    cents / 100,
  );
export function Amount({
  cents,
  large = false,
}: {
  cents: number;
  large?: boolean;
}) {
  const money = useMoney(),
    c = usePalette();
  return (
    <Text
      style={{
        color: c.text,
        fontSize: large ? 42 : 24,
        fontWeight: "700",
        letterSpacing: -1,
        fontVariant: ["tabular-nums"],
        marginVertical: 8,
      }}
    >
      {money(cents)}
    </Text>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const c = usePalette(),
    [focus, setFocus] = useState(false);
  return (
    <View style={{ marginVertical: 8 }}>
      <Text
        style={{
          color: c.muted,
          fontSize: 13,
          marginBottom: 8,
          fontWeight: "500",
        }}
      >
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.muted}
        {...props}
        onFocus={(e) => {
          setFocus(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocus(false);
          props.onBlur?.(e);
        }}
        style={[
          {
            color: c.text,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: focus ? c.primary : c.border,
            borderRadius: 14,
            padding: 16,
            minHeight: 52,
            fontSize: 16,
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
        marginVertical: 8,
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
  scroll = true,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  scroll?: boolean;
}) {
  const c = usePalette(),
    inset = useSafeAreaInsets(),
    { signedIn, reload, loading } = useWorkspace();
  const entrance = useEntrance(title);
  const Container = scroll ? ScrollView : View;
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: c.background }}
    >
      <Container
        keyboardShouldPersistTaps="handled"
        refreshControl={
          scroll && signedIn ? (
            <RefreshControl
              refreshing={loading}
              onRefresh={() => void reload()}
              tintColor={c.primary}
            />
          ) : undefined
        }
        style={{
          flex: 1,
          ...(!scroll
            ? {
                padding: 24,
                paddingTop: Math.max(inset.top, 24),
                width: "100%" as const,
                maxWidth: 680,
                alignSelf: "center" as const,
              }
            : {}),
        }}
        contentContainerStyle={{
          padding: 24,
          paddingTop: Math.max(inset.top, 24),
          paddingBottom: inset.bottom + 40,
          width: "100%",
          maxWidth: 680,
          alignSelf: "center",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: 28,
          }}
        >
          <OnePayMark color={c.primary} size={28} />
          <Text
            style={{
              color: c.text,
              fontSize: 19,
              fontWeight: "700",
              letterSpacing: -0.7,
            }}
          >
            onepay
          </Text>
          <View style={{ flex: 1 }} />
          <Text style={{ color: c.muted, fontSize: 10, letterSpacing: 1.5 }}>
            MONEY IN MOTION
          </Text>
        </View>
        <Animated.View style={[entrance, !scroll && { flex: 1 }]}>
          <Heading>{title}</Heading>
          {subtitle && <Message text={subtitle} />}
          <View style={{ height: 16 }} />
          {children}
        </Animated.View>
      </Container>
    </KeyboardAvoidingView>
  );
}
export function Skeleton({
  kind = "row",
}: {
  kind?: "row" | "card" | "chart" | "amount" | "text";
}) {
  const c = usePalette(),
    opacity = usePulse();
  return (
    <Animated.View
      accessible={false}
      style={{
        opacity,
        backgroundColor: c.tint,
        borderRadius: kind === "text" ? 6 : 18,
        height: { row: 64, card: 170, chart: 160, amount: 48, text: 16 }[kind],
        marginBottom: 16,
        width: kind === "text" ? "65%" : "100%",
      }}
    />
  );
}
export function EmptyState({
  title = "Nothing scheduled yet",
  description = "Add a commitment or review a detected pattern to start building your money timeline.",
  action,
  onPress,
}: {
  title?: string;
  description?: string;
  action?: string;
  onPress?: () => void;
}) {
  const c = usePalette();
  return (
    <View
      style={{
        padding: 24,
        backgroundColor: c.tint,
        borderRadius: 24,
        marginBottom: 16,
      }}
    >
      <View style={{ marginBottom: 16 }}>
        <Icon name="calendar" color={c.primary} size={30} />
      </View>
      <Heading>{title}</Heading>
      <Message text={description} />
      {action && onPress && <Button title={action} onPress={onPress} />}
    </View>
  );
}
export function ErrorState({
  text,
  retry,
}: {
  text: string;
  retry?: () => void;
}) {
  return (
    <Card>
      <Heading>Let us try that again</Heading>
      <Message text={text} error />
      {retry && <Button title="Try again" secondary onPress={retry} />}
    </Card>
  );
}
export function DataGate({ children }: { children: React.ReactNode }) {
  const { data, loading, error, reload } = useWorkspace();
  return loading && !data ? (
    <>
      <OnePayLoader text="Preparing your financial view" />
      <Skeleton kind="amount" />
      <Skeleton kind="card" />
      <Skeleton kind="row" />
      <Skeleton kind="chart" />
    </>
  ) : error && !data ? (
    <ErrorState text={error} retry={() => void reload()} />
  ) : data ? (
    <>
      {loading && <OnePayLoader text="Refreshing your accounts" inline />}
      {error && (
        <ErrorState
          text={`${error} Showing information from ${new Date(data.updatedAt).toLocaleTimeString()}.`}
          retry={() => void reload()}
        />
      )}{" "}
      {children}
    </>
  ) : (
    <EmptyState
      title="Your workspace is locked"
      description="Sign in to see your financial information."
    />
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
          onPress={() => {
            feedback();
            onChange(item);
          }}
          style={({ pressed }) => ({
            minHeight: 44,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 14,
            backgroundColor: value === item ? c.primary : c.tint,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text
            style={{
              color: value === item ? c.onPrimary : c.text,
              fontSize: 13,
              fontWeight: "600",
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
  section: { marginTop: 16, marginBottom: 16 },
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
  const money = useMoney(),
    c = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Estimated safe to spend ${money(cents)}. View forecast`}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: c.hero,
        borderRadius: 28,
        padding: 24,
        marginBottom: 16,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <Text style={{ color: c.heroMuted, fontSize: 12, letterSpacing: 1.5 }}>
        ESTIMATED SAFE TO SPEND
      </Text>
      <Text
        style={{
          color: c.onHero,
          fontSize: 48,
          fontWeight: "700",
          letterSpacing: -2,
          fontVariant: ["tabular-nums"],
          marginVertical: 20,
        }}
      >
        {money(cents)}
      </Text>
      <Text style={{ color: c.heroMuted, fontSize: 13, lineHeight: 21 }}>
        After upcoming commitments and your {money(buffer)} safety buffer.
      </Text>
      <View
        style={{
          marginTop: 20,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ color: c.onHero, fontSize: 14, fontWeight: "600" }}>
          See the calculation
        </Text>
        <Icon name="arrow" color={c.onHero} />
      </View>
    </Pressable>
  );
}
export function BottomSheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const c = usePalette(),
    inset = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const drag = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderRelease: (_event, gesture) => {
      if (gesture.dy > 60) onClose();
      else if (gesture.dy < -30) setExpanded(true);
    },
  });
  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduced ? "none" : "fade"}
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "#00000088",
          justifyContent: "flex-end",
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close details"
          onPress={onClose}
          style={{ flex: 1 }}
        />
        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: c.surface,
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            padding: 24,
            paddingBottom: 24 + inset.bottom,
            maxHeight: expanded ? "90%" : "75%",
            width: "100%",
            maxWidth: 680,
            alignSelf: "center",
          }}
        >
          <View
            {...drag.panHandlers}
            style={{
              minHeight: 44,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: c.border,
                alignSelf: "center",
                marginBottom: 20,
              }}
            />
          </View>
          <Heading>{title}</Heading>
          <ScrollView>{children}</ScrollView>
          <Button title="Close details" secondary onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}
