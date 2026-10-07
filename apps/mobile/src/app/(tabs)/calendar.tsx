import { useState } from "react";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import type { FinancialEvent } from "../../../../../shared/contracts";
import {
  calendarPeriod,
  monthCells,
  movePeriod,
  type CalendarMode,
} from "../../../../../shared/finance";
import { useRemote } from "../../api/use-remote";
import {
  Button,
  BottomSheet,
  Amount,
  Label,
  OnePayLoader,
  Skeleton,
  Choice,
  DataGate,
  Field,
  Heading,
  Message,
  Screen,
  usePalette,
} from "../../design-system/ui";
import { CommitmentList } from "../../components/commitments";
import { useWorkspace } from "../../state/workspace";
export default function Calendar() {
  const { data } = useWorkspace();
  const c = usePalette();
  const [mode, setMode] = useState<CalendarMode>(
      data?.profile.calendarView || "Month",
    ),
    [entered, setDate] = useState(""),
    [selected, setSelected] = useState(""),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("All");
  const date =
    entered ||
    data?.forecast.calculationDate ||
    new Date().toISOString().slice(0, 10);
  let issue = "",
    period: { start: string; days: number } | null = null;
  try {
    period = calendarPeriod(date, mode);
  } catch {
    issue = "Enter a valid civil date as YYYY-MM-DD.";
  }
  const remote = useRemote<{ events: FinancialEvent[] }>(
    data && period
      ? `/calendar?start=${period.start}&days=${period.days}`
      : null,
    data?.updatedAt,
  );
  const events = remote.value?.events || [];
  const point = data?.forecast.points.find((p) => p.date === selected);
  const visible = events.filter(
    (e) =>
      (!selected || mode !== "Month" || e.date === selected) &&
      e.merchant.toLowerCase().includes(query.toLowerCase()) &&
      (filter === "All" ||
        (filter === "Income" ? e.kind === "income" : e.kind === "expense")),
  );
  const move = (direction: 1 | -1) => {
    if (period) {
      setDate(movePeriod(date, mode, direction));
      setSelected("");
    }
  };
  return (
    <Screen
      title="Money calendar"
      subtitle={`Expected events · ${data?.profile.timeZone || "your timezone"}`}
    >
      <DataGate>
        <Choice
          values={["Day", "Week", "Fortnight", "Month"] as const}
          value={mode}
          onChange={(value) => {
            setMode(value);
            setSelected("");
          }}
        />
        <Field
          label="Date · YYYY-MM-DD"
          value={date}
          onChangeText={(value) => {
            setDate(value);
            setSelected("");
          }}
        />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button
              title="Previous"
              secondary
              disabled={!period}
              onPress={() => move(-1)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="Next"
              secondary
              disabled={!period}
              onPress={() => move(1)}
            />
          </View>
        </View>
        {mode === "Month" && period && (
          <View
            style={{
              marginVertical: 16,
              borderColor: c.border,
              borderWidth: 1,
              borderRadius: 16,
              padding: 8,
              backgroundColor: c.surface,
            }}
          >
            <View style={{ flexDirection: "row" }}>
              {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
                <Text
                  key={i}
                  style={{
                    width: "14.2857%",
                    textAlign: "center",
                    color: c.muted,
                    paddingVertical: 10,
                  }}
                >
                  {day}
                </Text>
              ))}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {monthCells(date).map((day, i) => {
                const due = events.filter((e) => e.date === day).length;
                const income = events.some(
                  (e) => e.date === day && e.kind === "income",
                );
                const debit = events.some(
                  (e) => e.date === day && e.kind === "expense",
                );
                const pressure = data?.forecast.points.find(
                  (p) => p.date === day && p.beforeIncome < 0,
                );
                return day ? (
                  <Pressable
                    key={day}
                    accessibilityRole="button"
                    accessibilityLabel={`${day}, ${due} expected events${income ? ", income" : ""}${debit ? ", expenses" : ""}${pressure ? ", projected shortfall" : ""}`}
                    accessibilityState={{ selected: day === selected }}
                    onPress={() => setSelected(day)}
                    style={{
                      width: "14.2857%",
                      minHeight: 52,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 10,
                      backgroundColor: day === selected ? c.primary : c.surface,
                    }}
                  >
                    <Text
                      style={{
                        color: day === selected ? c.onPrimary : c.text,
                        fontWeight: due ? "700" : "400",
                      }}
                    >
                      {Number(day.slice(-2))}
                    </Text>
                    <Text
                      style={{
                        color: day === selected ? c.onPrimary : c.muted,
                        fontSize: 10,
                      }}
                    >
                      {pressure ? "Tight" : due ? `${due} due` : " "}
                    </Text>
                  </Pressable>
                ) : (
                  <View
                    key={`blank-${i}`}
                    style={{ width: "14.2857%", minHeight: 52 }}
                  />
                );
              })}
            </View>
            <Message text="Tap a day to view its events. Counts include expected income and expenses." />
          </View>
        )}
        {selected && mode === "Month" && (
          <Button
            title="Show all month events"
            secondary
            onPress={() => setSelected("")}
          />
        )}
        <Field label="Search events" value={query} onChangeText={setQuery} />
        <Choice
          values={["All", "Income", "Expenses"]}
          value={filter}
          onChange={setFilter}
        />
        {remote.loading && (
          <>
            <OnePayLoader text="Preparing your money calendar" />
            <Skeleton kind="row" />
          </>
        )}
        {(issue || remote.error) && (
          <Message text={issue || remote.error || ""} error />
        )}
        {remote.error && <Button title="Try again" onPress={remote.retry} />}
        <Heading>
          {selected && mode === "Month" ? selected : "Your agenda"}
        </Heading>
        {!remote.loading && !remote.error && !issue && (
          <CommitmentList items={visible} />
        )}
        <BottomSheet
          visible={!!selected && mode === "Month"}
          title={selected}
          onClose={() => setSelected("")}
        >
          {point && (
            <>
              <Label>Opening projected balance</Label>
              <Amount cents={point.beforeIncome + point.expense} />
              <Label>Closing projected balance</Label>
              <Amount cents={point.balance} />
              <Message text="Daily totals are projected, not bank settlement." />
            </>
          )}
          <CommitmentList items={events.filter((e) => e.date === selected)} />
        </BottomSheet>
        <Button
          title="Add a commitment"
          onPress={() => router.push("/commitment")}
        />
        <Message text="Confirmed describes your plan, not settlement at your bank. Predicted events remain estimates." />
      </DataGate>
    </Screen>
  );
}
