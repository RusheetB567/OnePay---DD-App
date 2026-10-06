import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import type {
  Category,
  Commitment,
  Frequency,
} from "../../../../shared/contracts";
import { decimalToCents } from "../../../../shared/finance";
import {
  Button,
  Choice,
  DataGate,
  Field,
  Label,
  Message,
  Screen,
} from "../design-system/ui";
import { useWorkspace } from "../state/workspace";
function Editor({ item }: { item?: Commitment }) {
  const { data, mutate } = useWorkspace();
  const [merchant, setMerchant] = useState(item?.merchant || ""),
    [amount, setAmount] = useState(item ? String(item.amount / 100) : ""),
    [kind, setKind] = useState<"income" | "expense">(item?.kind || "expense"),
    [category, setCategory] = useState<Category>(item?.category || "Other"),
    [frequency, setFrequency] = useState<Frequency>(
      item?.frequency || "monthly",
    ),
    [nextDate, setDate] = useState(
      item?.nextDate || new Date().toISOString().slice(0, 10),
    ),
    [accountId, setAccount] = useState(
      item?.accountId || data?.accounts[0]?.id || "",
    ),
    [status, setStatus] = useState<"active" | "paused">(
      item?.status || "active",
    ),
    [certainty, setCertainty] = useState<"expected" | "confirmed">(
      item?.certainty === "confirmed" ? "confirmed" : "expected",
    ),
    [notes, setNotes] = useState(item?.notes || ""),
    [issue, setIssue] = useState(""),
    [busy, setBusy] = useState(false),
    [remove, setRemove] = useState(false);
  const submit = async (deleting = false) => {
    setBusy(true);
    setIssue("");
    try {
      if (deleting) await mutate(`/commitments/${item!.id}`, "DELETE");
      else
        await mutate(
          item ? `/commitments/${item.id}` : "/commitments",
          item ? "PATCH" : "POST",
          {
            merchant,
            amount: decimalToCents(amount),
            currency: "AUD",
            accountId,
            kind,
            category: kind === "income" ? "Salary" : category,
            frequency,
            nextDate,
            status,
            certainty,
            notes,
          },
        );
      router.back();
    } catch (e) {
      setIssue(e instanceof Error ? e.message : "Could not save commitment.");
    } finally {
      setBusy(false);
    }
  };
  if (!data?.accounts.length)
    return (
      <>
        <Message text="Connect a development account before adding a commitment." />
        <Button
          title="Connect bank"
          onPress={() => router.replace("/connect")}
        />
      </>
    );
  return (
    <>
      <Field
        label="Merchant or income source"
        value={merchant}
        onChangeText={setMerchant}
        maxLength={80}
      />
      <Field
        label="Amount · AUD"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
      />
      <Label>Type</Label>
      <Choice
        values={["expense", "income"] as const}
        value={kind}
        onChange={setKind}
      />
      <Label>Frequency</Label>
      <Choice
        values={
          ["weekly", "fortnightly", "monthly", "quarterly", "annually"] as const
        }
        value={frequency}
        onChange={setFrequency}
      />
      <Field
        label="Next date · YYYY-MM-DD"
        value={nextDate}
        onChangeText={setDate}
      />
      <Label>Source account</Label>
      {data.accounts.map((a) => (
        <Button
          key={a.id}
          title={`${accountId === a.id ? "Selected · " : ""}${a.name} · ${a.institution} · ${a.mask}`}
          secondary
          onPress={() => setAccount(a.id)}
        />
      ))}
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
      <Label>Tracking status</Label>
      <Choice
        values={["active", "paused"] as const}
        value={status}
        onChange={setStatus}
      />
      <Label>Plan certainty</Label>
      <Choice
        values={["expected", "confirmed"] as const}
        value={certainty}
        onChange={setCertainty}
      />
      <Message text="Confirmed is a user-confirmed plan. It does not indicate bank authorisation or completion." />
      <Field
        label="Notes"
        value={notes}
        onChangeText={setNotes}
        multiline
        maxLength={500}
      />
      {issue && <Message text={issue} error />}
      <Button
        title="Save commitment"
        onPress={() => void submit()}
        busy={busy}
        disabled={!merchant.trim() || !accountId}
      />
      {item && (
        <Button
          title={remove ? "Confirm removal from tracking" : "Remove tracking"}
          secondary
          onPress={() => (remove ? void submit(true) : setRemove(true))}
          disabled={busy}
        />
      )}
      <Message text="Pausing or removing tracking changes forecasts only. Your bank and merchant agreements remain in effect." />
    </>
  );
}
export default function CommitmentScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data } = useWorkspace();
  const item = data?.commitments.find((c) => c.id === id);
  return (
    <Screen title={id ? "Commitment details" : "A new commitment"}>
      <Button title="Back" secondary onPress={() => router.back()} />
      <DataGate>
        {id && !item ? (
          <Message text="This commitment is unavailable. Refresh your workspace." />
        ) : (
          <Editor key={item?.id || "new"} item={item} />
        )}
      </DataGate>
    </Screen>
  );
}
