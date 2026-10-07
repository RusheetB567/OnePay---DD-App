import { router } from "expo-router";
import { View } from "react-native";
import type { Commitment, FinancialEvent } from "../../../../shared/contracts";
import {
  Card,
  EmptyState,
  Icon,
  usePalette,
  Label,
  Message,
  useMoney,
  styles,
} from "../design-system/ui";
export function CommitmentList({
  items,
}: {
  items: (Commitment | FinancialEvent)[];
}) {
  const formatMoney = useMoney();
  const c = usePalette();
  return (
    <>
      {items.length ? (
        items.map((item, i) => (
          <Card
            key={`${item.id}-${i}`}
            onPress={() =>
              router.push({ pathname: "/commitment", params: { id: item.id } })
            }
          >
            <View style={styles.row}>
              <Icon
                name={item.kind === "income" ? "income" : "payments"}
                color={item.kind === "income" ? c.income : c.primary}
              />
              <View style={{ flex: 1 }}>
                <Label>{item.merchant}</Label>
                <Message
                  text={`${"date" in item ? item.date : item.nextDate} · ${item.frequency}`}
                />
              </View>
              <Label>
                {item.kind === "income" ? "+" : "−"}
                {formatMoney(item.amount)}
              </Label>
            </View>
            <Message
              text={`${item.status === "paused" ? "Tracking paused" : item.certainty} · ${item.kind} · ${item.category}${item.provenance === "detected" ? ` · ${item.confidence}% pattern confidence` : ""}`}
            />
          </Card>
        ))
      ) : (
        <EmptyState />
      )}
    </>
  );
}
