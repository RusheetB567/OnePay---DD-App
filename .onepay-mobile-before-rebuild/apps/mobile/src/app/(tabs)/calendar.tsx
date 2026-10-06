import { useState } from "react";
import type { FinancialEvent } from "../../../../../shared/contracts";
import { addDays } from "../../../../../shared/finance";
import { useRemote } from "../../api/use-remote";
import {
  Button,
  Choice,
  DataGate,
  Field,
  Message,
  Screen,
} from "../../design-system/ui";
import { CommitmentList } from "../../components/commitments";
import { useWorkspace } from "../../state/workspace";
export default function Calendar() {
  const { data } = useWorkspace();
  const [mode, setMode] = useState("Month"),
    [date, setDate] = useState(new Date().toISOString().slice(0, 10)),
    [dateError, setError] = useState(""),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("All");
  const days = (
    { Day: 0, Week: 6, Fortnight: 13, Month: 29 } as Record<string, number>
  )[mode]!;
  const remote = useRemote<{ events: FinancialEvent[] }>(
    data ? `/calendar?start=${encodeURIComponent(date)}&days=${days}` : null,
    data?.updatedAt,
  );
  const events = remote.value?.events || [];
  const loading = remote.loading,
    error = remote.error || dateError;
  const filtered = events.filter(
    (e) =>
      e.merchant.toLowerCase().includes(query.toLowerCase()) &&
      (filter === "All" ||
        (filter === "Income" ? e.kind === "income" : e.kind === "expense")),
  );
  return (
    <Screen
      title="The calendar for your money"
      subtitle="Choose a period and see each expected financial event."
    >
      <DataGate>
        <Choice
          values={["Day", "Week", "Fortnight", "Month"]}
          value={mode}
          onChange={setMode}
        />
        <Field
          label="Start date · YYYY-MM-DD"
          value={date}
          onChangeText={setDate}
        />
        <Button
          title="Previous period"
          secondary
          onPress={() => {
            try {
              setDate(addDays(date, -days - 1));
            } catch {
              setError("Enter a valid start date.");
            }
          }}
        />
        <Button
          title="Next period"
          secondary
          onPress={() => {
            try {
              setDate(addDays(date, days + 1));
            } catch {
              setError("Enter a valid start date.");
            }
          }}
        />
        <Field label="Search events" value={query} onChangeText={setQuery} />
        <Choice
          values={["All", "Income", "Expenses"]}
          value={filter}
          onChange={setFilter}
        />
        {loading && <Message text="Loading calendar events…" />}
        {error && <Message text={error} error />}
        <CommitmentList items={filtered} />
        <Message text="Each event is labelled expected, predicted or confirmed. Confirmed describes your plan, not bank settlement." />
      </DataGate>
    </Screen>
  );
}
