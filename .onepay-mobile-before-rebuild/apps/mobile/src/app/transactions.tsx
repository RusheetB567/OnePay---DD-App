import { router, useLocalSearchParams } from "expo-router";
import { useRemote } from "../api/use-remote";
import type { Transaction } from "../../../../shared/contracts";
import { useState } from "react";
import {
  Button,
  Card,
  Choice,
  DataGate,
  Field,
  Label,
  Message,
  Screen,
  formatMoney,
} from "../design-system/ui";
import { useWorkspace } from "../state/workspace";
export default function Transactions() {
  const { account } = useLocalSearchParams<{ account?: string }>();
  const { data } = useWorkspace();
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("All"),
    [selectedAccount, setAccount] = useState(account || ""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const [page, setPage] = useState<{ key: string; cursor: string } | null>(
    null,
  );
  const params = new URLSearchParams({ search: query, filter, limit: "50" });
  if (selectedAccount) params.set("accountId", selectedAccount);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const key = params.toString();
  if (page?.key === key) params.set("cursor", page.cursor);
  const remote = useRemote<{ items: Transaction[]; nextCursor: string | null }>(
    data ? `/transactions?${params}` : null,
    data?.updatedAt,
  );
  const list = remote.value?.items || [];
  return (
    <Screen
      title="Your transactions"
      subtitle="Inspect the source history behind your plan."
    >
      <Button title="Back" secondary onPress={() => router.back()} />
      <DataGate>
        <Field
          label="Search merchants or descriptions"
          value={query}
          onChangeText={setQuery}
        />
        <Choice
          values={["All", "Income", "Subscriptions", "Recurring", "Utilities"]}
          value={filter}
          onChange={setFilter}
        />
        <Button title="All accounts" secondary onPress={() => setAccount("")} />
        {data?.accounts.map((a) => (
          <Button
            key={a.id}
            title={`${selectedAccount === a.id ? "Selected · " : ""}${a.institution} · ${a.name} · ${a.mask}`}
            secondary
            onPress={() => setAccount(a.id)}
          />
        ))}
        <Field
          label="From date · YYYY-MM-DD (optional)"
          value={from}
          onChangeText={setFrom}
        />
        <Field
          label="To date · YYYY-MM-DD (optional)"
          value={to}
          onChangeText={setTo}
        />
        {remote.loading && <Message text="Loading transactions…" />}
        {remote.error && (
          <>
            <Message text={remote.error} error />
            <Button title="Try again" onPress={remote.retry} />
          </>
        )}
        {remote.value && !list.length && (
          <Message text="No transactions match these filters." />
        )}
        {list.map((t) => (
          <Card
            key={t.id}
            onPress={() =>
              router.push({ pathname: "/transaction", params: { id: t.id } })
            }
          >
            <Label>
              {t.merchant} · {formatMoney(t.amount)}
            </Label>
            <Message text={`${t.date} · ${t.category} · ${t.status}`} />
          </Card>
        ))}
        {remote.value?.nextCursor && (
          <Button
            title="Next 50 transactions"
            onPress={() => setPage({ key, cursor: remote.value!.nextCursor! })}
          />
        )}
        {page?.key === key && (
          <Button
            title="Back to latest"
            secondary
            onPress={() => setPage(null)}
          />
        )}
      </DataGate>
    </Screen>
  );
}
