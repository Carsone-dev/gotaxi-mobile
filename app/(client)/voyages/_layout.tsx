import { Stack } from "expo-router";

export default function VoyagesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="results" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="confirm" />
      <Stack.Screen name="mes-reservations" />
    </Stack>
  );
}
