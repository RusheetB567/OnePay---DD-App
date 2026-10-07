import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useWorkspace } from "../../state/workspace";
import {
  Amount,
  Icon,
  BalanceHero,
  Button,
  Card,
  DataGate,
  Heading,
  Message,
  Screen,
  usePalette,
} from "../../design-system/ui";
import {
  AllocationRing,
  ForecastChart,
  MoneyTimeline,
  PressureStory,
} from "../../design-system/financial";
export default function Home() {
  const { data, hideAmounts, toggleAmounts } = useWorkspace(),
    c = usePalette(),
    f = data?.forecast,
    next = f?.events.find((e) => e.kind === "income");
  return (
    <Screen
      title={
        data ? `Hello, ${data.profile.name.split(" ")[0]}.` : "Your money today"
      }
      subtitle="A clear view of today. A little confidence for tomorrow."
    >
      <DataGate>
        {data && f && (
          <>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                marginBottom: 16,
              }}
            >
              <View>
                <Text style={{ color: c.muted, fontSize: 13 }}>
                  Available for bills & spending
                </Text>
                <Amount cents={f.opening} />
              </View>
              <View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    hideAmounts ? "Reveal amounts" : "Hide amounts"
                  }
                  accessibilityState={{ selected: hideAmounts }}
                  onPress={toggleAmounts}
                  style={{
                    minWidth: 44,
                    minHeight: 44,
                    justifyContent: "center",
                    alignItems: "center",
                    borderRadius: 14,
                    backgroundColor: c.tint,
                  }}
                >
                  <Icon name="eye" color={c.primary} />
                </Pressable>
              </View>
            </View>
            <BalanceHero
              cents={f.safeToSpend}
              buffer={f.buffer}
              onPress={() => router.push("/forecast")}
            />
            <Card onPress={() => router.push("/forecast")}>
              <AllocationRing forecast={f} />
            </Card>
            <PressureStory forecast={f} />
            {!data.accounts.length && (
              <Button
                title="Connect a sample bank"
                onPress={() => router.push("/connect")}
              />
            )}
            <View style={{ marginTop: 24 }}>
              <Heading>Coming up</Heading>
              <Message text="Your money timeline · expected events" />
              <MoneyTimeline events={f.events} />
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
              <View style={{ flex: 1, minWidth: 200 }}>
                <Card onPress={() => router.push("/income")}>
                  <Text style={{ color: c.muted, fontSize: 13 }}>
                    Next expected income
                  </Text>
                  {next ? (
                    <>
                      <Amount cents={next.amount} />
                      <Message
                        text={`${next.merchant} · ${next.date} · ${next.certainty}`}
                      />
                    </>
                  ) : (
                    <Message text="Add your payday or confirm an income pattern." />
                  )}
                </Card>
              </View>
              <View style={{ flex: 1, minWidth: 200 }}>
                <Card onPress={() => router.push("/(tabs)/accounts")}>
                  <Text style={{ color: c.muted, fontSize: 13 }}>
                    Your connected accounts
                  </Text>
                  <Text
                    style={{
                      color: c.text,
                      fontSize: 28,
                      fontWeight: "700",
                      marginTop: 12,
                    }}
                  >
                    {data.accounts.length}
                  </Text>
                  <Message text="Savings stay set aside from safe-to-spend." />
                </Card>
              </View>
            </View>
            {!data.profile.reducedHome && (
              <Card>
                <Heading>The next 30 days</Heading>
                <ForecastChart forecast={f} />
              </Card>
            )}
            <Button
              title="Add a commitment"
              onPress={() => router.push("/commitment")}
            />
            <Button
              title="Notifications"
              secondary
              onPress={() => router.push("/notifications")}
            />
            <Button
              title="Security & preferences"
              secondary
              onPress={() => router.push("/settings")}
            />
            <Message
              text={`Updated ${new Date(data.updatedAt).toLocaleTimeString()} · ${data.capabilities.banking === "synthetic" ? "Fictional development data" : "Connected accounts"}`}
            />
          </>
        )}
      </DataGate>
    </Screen>
  );
}
