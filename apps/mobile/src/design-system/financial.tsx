import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { router } from "expo-router";
import type { Forecast, FinancialEvent } from "../../../../shared/contracts";
import {
  Card,
  EmptyState,
  Heading,
  Icon,
  Label,
  Message,
  useMoney,
  usePalette,
} from "./ui";
export function AllocationRing({ forecast }: { forecast: Forecast }) {
  const c = usePalette(),
    money = useMoney();
  // Allocation uses cash available now; future income cannot enlarge today's ring.
  const total = Math.max(0, forecast.opening),
    safe = Math.min(total, Math.max(0, forecast.safeToSpend)),
    buffer = Math.min(Math.max(0, total - safe), forecast.buffer),
    committed = Math.max(0, total - safe - buffer);
  const segments = [
    { label: "Reserved / unavailable", value: committed, color: c.primary },
    { label: "Safety buffer", value: buffer, color: c.warning },
    { label: "Safe now", value: safe, color: c.income },
  ];
  let offset = 0;
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 20,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <Svg aria-hidden={true} width={112} height={112} viewBox="0 0 112 112">
        <Circle
          cx={56}
          cy={56}
          r={45}
          fill="none"
          stroke={c.border}
          strokeWidth={9}
        />
        {segments.map((s) => {
          const fraction = total ? s.value / total : 0,
            start = offset;
          offset += fraction;
          return (
            <Circle
              key={s.label}
              cx={56}
              cy={56}
              r={45}
              fill="none"
              stroke={s.color}
              strokeWidth={9}
              strokeDasharray={`${fraction * 282.74} 282.74`}
              strokeDashoffset={-start * 282.74}
              transform="rotate(-90 56 56)"
            />
          );
        })}
        <Path
          d="M42 57l9 9 20-23"
          stroke={c.aqua}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
        />
      </Svg>
      <View style={{ flex: 1, minWidth: 140 }}>
        {segments.map((s) => (
          <View
            key={s.label}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: s.color,
              }}
            />
            <Text style={{ color: c.muted, fontSize: 12, flex: 1 }}>
              {s.label}
            </Text>
            <Text
              style={{
                color: c.text,
                fontSize: 13,
                fontWeight: "600",
                fontVariant: ["tabular-nums"],
              }}
            >
              {money(s.value)}
            </Text>
          </View>
        ))}
        {!total && (
          <Message text="Connect an account to see your allocation." />
        )}
      </View>
    </View>
  );
}
export function ForecastChart({ forecast }: { forecast: Forecast }) {
  const c = usePalette(),
    money = useMoney(),
    [selected, setSelected] = useState<number | null>(null),
    [width, setWidth] = useState(320);
  const points = forecast.points;
  if (!points.length)
    return (
      <EmptyState
        title="Your projection starts here"
        description="Add an account and upcoming commitments to build a forecast."
      />
    );
  const values = points.map((p) => p.balance),
    low = Math.min(0, ...values),
    high = Math.max(1, ...values, forecast.opening),
    range = high - low;
  const x = (i: number) =>
      16 + (i * (width - 32)) / Math.max(1, points.length - 1),
    y = (v: number) => 146 - ((v - low) / range) * 122;
  const path = points
    .map(
      (p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.balance).toFixed(1)}`,
    )
    .join(" ");
  const index = Math.min(selected ?? points.length - 1, points.length - 1),
    p = points[index];
  const choose = (at: number) =>
    setSelected(
      Math.max(
        0,
        Math.min(
          points.length - 1,
          Math.round(((at - 16) / (width - 32)) * (points.length - 1)),
        ),
      ),
    );
  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <View>
          <Label>{p.date}</Label>
          <Text
            style={{
              color: p.balance < 0 ? c.error : c.text,
              fontSize: 28,
              fontWeight: "700",
              fontVariant: ["tabular-nums"],
            }}
          >
            {money(p.balance)}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Message text="Projected closing balance" />
          <Message text={`In ${money(p.income)} · Out ${money(p.expense)}`} />
        </View>
      </View>
      <View
        onLayout={(e) => setWidth(Math.max(160, e.nativeEvent.layout.width))}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => choose(e.nativeEvent.locationX)}
        onResponderMove={(e) => choose(e.nativeEvent.locationX)}
        accessibilityRole="adjustable"
        aria-valuemin={0}
        aria-valuemax={points.length - 1}
        aria-valuenow={index}
        aria-valuetext={`${p.date}: ${money(p.balance)}`}
        accessibilityValue={{
          min: 0,
          max: points.length - 1,
          now: index,
          text: `${p.date}: ${money(p.balance)}`,
        }}
        accessibilityLabel={`Projected balance on ${p.date}: ${money(p.balance)}`}
        accessibilityActions={[
          { name: "increment", label: "Next day" },
          { name: "decrement", label: "Previous day" },
        ]}
        onAccessibilityAction={(e) =>
          setSelected(
            Math.max(
              0,
              Math.min(
                points.length - 1,
                index + (e.nativeEvent.actionName === "increment" ? 1 : -1),
              ),
            ),
          )
        }
      >
        <Svg
          aria-hidden={true}
          width="100%"
          height={170}
          viewBox={`0 0 ${width} 170`}
        >
          <Line
            x1={16}
            x2={width - 16}
            y1={y(0)}
            y2={y(0)}
            stroke={c.border}
            strokeDasharray="4 4"
          />
          <Path
            d={`${path} L${x(points.length - 1)},154 L16,154 Z`}
            fill={c.tint}
          />
          <Path
            d={path}
            stroke={c.primary}
            strokeWidth={3}
            fill="none"
            strokeLinejoin="round"
          />
          {points.map((point, i) =>
            point.income || point.expense ? (
              <Circle
                key={point.date}
                cx={x(i)}
                cy={y(point.balance)}
                r={3}
                fill={
                  point.balance < 0
                    ? c.error
                    : point.income
                      ? c.income
                      : c.warning
                }
              />
            ) : null,
          )}
          <Line
            x1={x(index)}
            x2={x(index)}
            y1={18}
            y2={154}
            stroke={c.muted}
            strokeDasharray="3 4"
          />
          <Circle
            cx={x(index)}
            cy={y(p.balance)}
            r={5}
            stroke={c.surface}
            strokeWidth={2}
            fill={p.balance < 0 ? c.error : c.primary}
          />
        </Svg>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ color: c.muted, fontSize: 12 }}>{points[0].date}</Text>
        <Text style={{ color: c.muted, fontSize: 12 }}>
          {points[points.length - 1].date}
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous forecast day"
          onPress={() => setSelected(Math.max(0, index - 1))}
          style={{ minHeight: 44, justifyContent: "center", padding: 8 }}
        >
          <Text style={{ color: c.primary }}>Previous day</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next forecast day"
          onPress={() => setSelected(Math.min(points.length - 1, index + 1))}
          style={{ minHeight: 44, justifyContent: "center", padding: 8 }}
        >
          <Text style={{ color: c.primary }}>Next day</Text>
        </Pressable>
      </View>
      <Message text="Tap or drag to inspect. Green: income · amber: expenses · red: negative balance. All points are estimates." />
    </View>
  );
}
export function MoneyTimeline({ events }: { events: FinancialEvent[] }) {
  const c = usePalette(),
    money = useMoney();
  if (!events.length)
    return (
      <EmptyState
        title="A little room in your timeline"
        description="Nothing is scheduled in this period. Add an upcoming bill or review your detected patterns."
      />
    );
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 12, paddingBottom: 16 }}
    >
      {events.slice(0, 8).map((e) => (
        <Pressable
          key={`${e.id}:${e.date}`}
          accessibilityRole="button"
          onPress={() =>
            router.push({ pathname: "/commitment", params: { id: e.id } })
          }
          style={{
            width: 168,
            padding: 16,
            borderRadius: 20,
            backgroundColor: c.surface,
            borderColor: c.border,
            borderWidth: 1,
            borderStyle: e.certainty === "predicted" ? "dashed" : "solid",
          }}
        >
          <Text style={{ color: c.muted, fontSize: 12, marginBottom: 16 }}>
            {e.date}
          </Text>
          <Icon
            name={e.kind === "income" ? "income" : "payments"}
            color={e.kind === "income" ? c.income : c.primary}
          />
          <Text
            numberOfLines={2}
            style={{
              color: c.text,
              fontSize: 15,
              fontWeight: "600",
              marginTop: 12,
            }}
          >
            {e.merchant}
          </Text>
          <Text
            style={{
              color: e.kind === "income" ? c.income : c.text,
              fontSize: 20,
              fontWeight: "700",
              marginTop: 8,
              fontVariant: ["tabular-nums"],
            }}
          >
            {e.kind === "income" ? "+" : "−"}
            {money(e.amount)}
          </Text>
          <Message text={e.certainty} />
        </Pressable>
      ))}
    </ScrollView>
  );
}
export function PressureStory({ forecast }: { forecast: Forecast }) {
  const c = usePalette(),
    money = useMoney(),
    first = forecast.points.find((p) => p.beforeIncome < 0);
  const unknown = !forecast.accounts.length;
  return (
    <Card onPress={() => router.push("/forecast")}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Icon
          name={first ? "payments" : "shield"}
          color={first ? c.warning : c.income}
        />
        <View style={{ flex: 1 }}>
          <Heading>
            {unknown
              ? "Build your outlook"
              : first
                ? "A day to plan for"
                : "Your commitments are in view"}
          </Heading>
          <Message
            text={
              unknown
                ? "Connect an account before relying on this estimate."
                : first
                  ? `${first.date} may be tight before income arrives. Lowest balance before income: ${money(first.beforeIncome)}.`
                  : `Your lowest projected balance is ${money(forecast.minimum)} over ${forecast.days} days. Review your plan as things change.`
            }
          />
        </View>
      </View>
    </Card>
  );
}
