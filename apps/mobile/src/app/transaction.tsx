import { router, useLocalSearchParams } from "expo-router";
import { useRemote } from "../api/use-remote";
import { useState } from "react";
import type { Category, Transaction } from "../../../../shared/contracts";
import {
  Amount,
  Button,
  Choice,
  DataGate,
  Field,
  Label,
  Message,
  Screen,
} from "../design-system/ui";
import { useWorkspace } from "../state/workspace";
function Classification({ tx }: { tx: Transaction }) {
  const { mutate } = useWorkspace();
  const [category, setCategory] = useState<Category>(tx.category),
    [notes, setNotes] = useState(tx.notes),
    [issue, setIssue] = useState(""),
    [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await mutate(`/transactions/${tx.id}`, "PATCH", { category, notes });
      router.back();
    } catch (e) {
      setIssue(
        e instanceof Error ? e.message : "Unable to save classification.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Amount cents={tx.amount} large />
      <Label>
        {tx.date} · {tx.status}
      </Label>
      <Message text={tx.description} />
      <Label>Category</Label>
      <Choice
        values={
          [
            "Housing",
            "Utilities",
            "Subscription",
            "Insurance",
            "Health",
            "Loan",
            "Salary",
            "Other",
          ] as const
        }
        value={category}
        onChange={setCategory}
      />
      <Field
        label="Notes"
        value={notes}
        onChangeText={setNotes}
        multiline
        maxLength={500}
      />
      {issue && <Message text={issue} error />}
      <Button
        title="Save classification"
        onPress={() => void submit()}
        busy={busy}
      />
    </>
  );
}
export default function TransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useWorkspace();
  const remote = useRemote<Transaction>(
    data && id ? `/transactions/${id}` : null,
    data?.updatedAt,
  );
  const tx = remote.value;
  return (
    <Screen title={tx?.merchant || "Transaction details"}>
      <Button title="Back" secondary onPress={() => router.back()} />
      <DataGate>
        {tx ? (
          <Classification key={tx.id} tx={tx} />
        ) : (
          <>
            <Message
              text={
                remote.error ||
                (remote.loading
                  ? "Loading transaction…"
                  : "Transaction unavailable.")
              }
              error={!!remote.error}
            />
            {remote.error && (
              <Button title="Try again" onPress={remote.retry} />
            )}
          </>
        )}
      </DataGate>
    </Screen>
  );
}
