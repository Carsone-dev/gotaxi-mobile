import { Stack } from "expo-router";

export default function ColisLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="nouveau" />
      <Stack.Screen name="voyages" />
      <Stack.Screen name="confirmer" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
