import { useState } from "react";
import { router } from "expo-router";
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
export default function Payments() {
  const { data } = useWorkspace();
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("All");
  const list =
    data?.commitments.filter(
      (c) =>
        c.merchant.toLowerCase().includes(search.toLowerCase()) &&
        (filter === "All" ||
          (filter === "Income" && c.kind === "income") ||
          (filter === "Subscriptions" && c.category === "Subscription") ||
          (filter === "Paused" && c.status === "paused")),
    ) || [];
  return (
    <Screen
      title="Your recurring life"
      subtitle="Bills, subscriptions and income, in one place."
    >
      <DataGate>
        <Button
          title="Add commitment"
          onPress={() => router.push("/commitment")}
        />
        <Button
          title="Subscription costs"
          secondary
          onPress={() => router.push("/subscriptions")}
        />
        <Button
          title="Income & paydays"
          secondary
          onPress={() => router.push("/income")}
        />
        <Field
          label="Search commitments"
          value={search}
          onChangeText={setSearch}
        />
        <Choice
          values={["All", "Subscriptions", "Income", "Paused"]}
          value={filter}
          onChange={setFilter}
        />
        <CommitmentList items={list} />
        <Message text="Tracking changes your forecast only. It does not pause, cancel or change a bank or merchant agreement." />
      </DataGate>
    </Screen>
  );
}
