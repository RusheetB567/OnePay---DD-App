import { FlatList, View, Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useRemote } from "../api/use-remote";
import type { Transaction } from "../../../../shared/contracts";
import { decimalToCents } from "../../../../shared/finance";
import { useState } from "react";
import {
  Button,
  BottomSheet,
  EmptyState,
  Icon,
  usePalette,
  OnePayLoader,
  Skeleton,
  Card,
  Choice,
  DataGate,
  Field,
  Label,
  Message,
  Screen,
  useMoney,
} from "../design-system/ui";
import { useWorkspace } from "../state/workspace";
export default function Transactions() {
  const c = usePalette();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { account } = useLocalSearchParams<{ account?: string }>();
  const formatMoney = useMoney();
  const { data } = useWorkspace();
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("All"),
    [selectedAccount, setAccount] = useState(account || ""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [category, setCategory] = useState("Any category"),
    [min, setMin] = useState(""),
    [max, setMax] = useState("");
  const [page, setPage] = useState<{ key: string; cursor: string } | null>(
    null,
  );
  const params = new URLSearchParams({ search: query, filter, limit: "50" });
  if (selectedAccount) params.set("accountId", selectedAccount);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (category !== "Any category") params.set("category", category);
  let amountError = "";
  try {
    if (min) params.set("minAmount", String(decimalToCents(min)));
    if (max) params.set("maxAmount", String(decimalToCents(max)));
    if (min && max && decimalToCents(min) > decimalToCents(max))
      amountError = "Minimum must be below maximum.";
  } catch {
    amountError = "Enter amounts with no more than two decimal places.";
  }
  const key = params.toString();
  if (page?.key === key) params.set("cursor", page.cursor);
  const remote = useRemote<{ items: Transaction[]; nextCursor: string | null }>(
    data && !amountError ? `/transactions?${params}` : null,
    data?.updatedAt,
  );
  const list = remote.value?.items || [];
  return (
    <Screen
      scroll={false}
      title="Your transactions"
      subtitle="Inspect the source history behind your plan."
    >
      <Button title="Back" secondary onPress={() => router.back()} />
      <DataGate>
        <Button
          title="Search & filters"
          secondary
          onPress={() => setFiltersOpen(true)}
        />
        <BottomSheet
          visible={filtersOpen}
          title="Find a transaction"
          onClose={() => setFiltersOpen(false)}
        >
          {" "}
          <Field
            label="Search merchants or descriptions"
            value={query}
            onChangeText={setQuery}
          />
          <Choice
            values={[
              "All",
              "Income",
              "Subscriptions",
              "Recurring",
              "Utilities",
            ]}
            value={filter}
            onChange={setFilter}
          />
          <Button
            title="All accounts"
            secondary
            onPress={() => setAccount("")}
          />
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
          <Label>Category</Label>
          <Choice
            values={[
              "Any category",
              "Housing",
              "Utilities",
              "Subscription",
              "Insurance",
              "Health",
              "Loan",
              "Salary",
              "Other",
            ]}
            value={category}
            onChange={setCategory}
          />
          <Field
            label="Minimum absolute amount · AUD"
            value={min}
            onChangeText={setMin}
            keyboardType="decimal-pad"
          />
          <Field
            label="Maximum absolute amount · AUD"
            value={max}
            onChangeText={setMax}
            keyboardType="decimal-pad"
          />
        </BottomSheet>
        {amountError && <Message text={amountError} error />}
        {remote.loading && (
          <>
            <OnePayLoader text="Loading transactions…" />
            <Skeleton kind="row" />
          </>
        )}
        {remote.error && (
          <>
            <Message text={remote.error} error />
            <Button title="Try again" onPress={remote.retry} />
          </>
        )}

        <FlatList
          data={list}
          keyExtractor={(t) => t.id}
          initialNumToRender={12}
          windowSize={5}
          style={{ flex: 1, marginTop: 16 }}
          ListEmptyComponent={
            !remote.loading && !remote.error ? (
              <EmptyState
                title="Nothing matches yet"
                description="Try another merchant, date or category. Connected history will appear here."
              />
            ) : null
          }
          renderItem={({ item: t, index }) => (
            <View>
              {(index === 0 || list[index - 1].date !== t.date) && (
                <Message text={t.date} />
              )}
              <Card
                onPress={() =>
                  router.push({
                    pathname: "/transaction",
                    params: { id: t.id },
                  })
                }
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <Icon
                    name={t.amount > 0 ? "income" : "payments"}
                    color={t.amount > 0 ? c.income : c.primary}
                  />
                  <View style={{ flex: 1 }}>
                    <Label>{t.merchant}</Label>
                    <Message text={t.category + " · " + t.status} />
                  </View>
                  <Text
                    style={{
                      color: t.amount > 0 ? c.income : c.text,
                      fontSize: 16,
                      fontWeight: "600",
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {formatMoney(t.amount)}
                  </Text>
                </View>
              </Card>
            </View>
          )}
        />
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
