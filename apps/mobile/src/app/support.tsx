import { router } from "expo-router";
import { Button, Card, Heading, Message, Screen } from "../design-system/ui";
export default function Support() {
  return (
    <Screen title="Help, without the jargon">
      <Button title="Back" secondary onPress={() => router.back()} />
      <Card>
        <Heading>My forecast looks wrong</Heading>
        <Message text="Review each commitment’s amount, date, account and certainty. Everyday spending and transfers are not included. Savings are excluded and expired consent removes related accounts." />
        <Button
          title="Review forecast assumptions"
          secondary
          onPress={() => router.push("/forecast")}
        />
      </Card>
      <Card>
        <Heading>My connection is unavailable</Heading>
        <Message text="This build uses synthetic development data. Review consent expiry and status. Reconnect with fresh consent if needed. No banking credentials are requested." />
        <Button
          title="Review connected accounts"
          secondary
          onPress={() => router.push("/(tabs)/accounts")}
        />
      </Card>
      <Card>
        <Heading>A sensitive action asks me to sign in again</Heading>
        <Message text="Connecting, revoking consent and exporting data require recent server-verified authentication. Sign out, sign back in and retry within five minutes." />
        <Button
          title="Open security centre"
          secondary
          onPress={() => router.push("/security")}
        />
      </Card>
      <Card>
        <Heading>Connected services & payments</Heading>
        <Message text="Merchant connections, PayTo and payment execution are unavailable pending provider selection, security review and operating-model approval. The API rejects payment commands even if a modified client submits one." />
        <Button
          title="Payment execution — unavailable"
          disabled
          onPress={() => {}}
        />
      </Card>
      <Message text="Customer support delivery, disputes and verified account recovery require operational setup before release. Never share passwords or tokens in a support request." />
    </Screen>
  );
}
