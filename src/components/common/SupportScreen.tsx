import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Linking,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";

// ── Contact ───────────────────────────────────────────────────────────────────

const PHONE_DISPLAY = "01 96 78 58 79";
const WHATSAPP_URL  = "https://wa.me/2290196785879";
const PHONE_TEL     = "tel:+2290196785879";
const EMAIL_URL     = "mailto:fccarsone@gmail.com";

async function openLink(url: string) {
  const ok = await Linking.canOpenURL(url);
  if (ok) {
    Linking.openURL(url);
  } else {
    Alert.alert("Impossible d'ouvrir", "Vérifiez que l'application est installée sur votre téléphone.");
  }
}

// ── FAQ data ──────────────────────────────────────────────────────────────────

const FAQ_CHAUFFEUR = [
  {
    q: "Comment publier un voyage ?",
    a: "Dans l'onglet Voyages, appuyez sur « Publier ». Renseignez le trajet, la date, le prix par place et le nombre de places disponibles. Votre voyage est visible immédiatement par les clients.",
  },
  {
    q: "Qu'est-ce que le KYC et pourquoi est-il obligatoire ?",
    a: "Le KYC (vérification d'identité) est requis pour activer votre compte chauffeur. Rendez-vous dans Paramètres & véhicule et soumettez votre pièce d'identité et votre permis de conduire. Nos équipes valident votre dossier sous 24 à 48 h.",
  },
  {
    q: "Comment fonctionnent mes revenus ?",
    a: "Chaque fois qu'un client réserve votre voyage et que le paiement est validé, le montant est crédité sur votre portefeuille GoTaxi. Consultez votre historique dans l'onglet Revenus.",
  },
  {
    q: "Comment retirer mon argent ?",
    a: "Dans Revenus > Retrait, choisissez votre opérateur (MTN MoMo, Moov Money…) et entrez le montant souhaité. Le virement est effectué vers votre numéro mobile money sous 24 h ouvrables.",
  },
  {
    q: "Comment gérer les colis ?",
    a: "Si vous activez l'option « Accepte les colis » sur un voyage, les clients peuvent vous confier des envois sur ce trajet. Vous recevez une demande que vous acceptez ou refusez librement.",
  },
  {
    q: "Que faire si un client ne se présente pas ?",
    a: "Patientez 15 minutes après l'heure de départ prévue et tentez de le joindre. Si aucune réponse, vous pouvez signaler l'absence depuis la page de détail de la réservation.",
  },
  {
    q: "Comment améliorer ma note ?",
    a: "Soyez ponctuel, courtois et maintenez votre véhicule propre. Les clients vous notent après chaque voyage. Une bonne note augmente votre visibilité sur la plateforme.",
  },
  {
    q: "Comment signaler un problème technique ?",
    a: "Utilisez le bouton WhatsApp ou Appel ci-dessus pour joindre notre équipe support. Indiquez votre numéro de téléphone et décrivez le problème.",
  },
];

const FAQ_CLIENT = [
  {
    q: "Comment réserver un voyage ?",
    a: "Dans l'onglet Voyages, recherchez votre trajet en indiquant ville de départ, ville d'arrivée et date. Sélectionnez un voyage disponible et suivez les étapes de réservation.",
  },
  {
    q: "Comment fonctionne le paiement ?",
    a: "Le paiement s'effectue via votre portefeuille GoTaxi ou votre mobile money (MTN MoMo, Moov Money) lors de la réservation. Le montant est débité une fois le chauffeur confirmé.",
  },
  {
    q: "Puis-je annuler une réservation ?",
    a: "Vous pouvez annuler une réservation avant confirmation du chauffeur sans frais. Une fois confirmée, des frais d'annulation peuvent s'appliquer. Consultez les conditions de la réservation pour les détails.",
  },
  {
    q: "Comment envoyer un colis ?",
    a: "Dans l'onglet Colis, créez une nouvelle demande en indiquant le trajet, la description du colis et son poids. Un chauffeur effectuant ce trajet acceptera votre envoi.",
  },
  {
    q: "Comment recharger mon portefeuille ?",
    a: "Dans Portefeuille > Recharger, entrez le montant et choisissez votre opérateur (MTN MoMo, Moov Money). La recharge est instantanée une fois le paiement mobile validé.",
  },
  {
    q: "Comment retirer de l'argent de mon portefeuille ?",
    a: "Dans Portefeuille > Retrait, entrez le montant et votre numéro mobile money. Le virement est traité sous 24 h ouvrables.",
  },
  {
    q: "Mon paiement a échoué, que faire ?",
    a: "Vérifiez que votre solde mobile money est suffisant et que votre numéro est correct. Si le problème persiste après une nouvelle tentative, contactez notre support via WhatsApp.",
  },
  {
    q: "Comment noter un chauffeur ?",
    a: "Après la fin d'un voyage, vous êtes invité à évaluer votre chauffeur. Vos retours nous aident à maintenir la qualité du service sur GoTaxi.",
  },
];

// ── Composants locaux ─────────────────────────────────────────────────────────

function ContactBtn({
  icon, label, color, onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [cb.btn, { borderColor: `${color}40`, backgroundColor: `${color}10` }, pressed && { opacity: 0.7 }]}
      onPress={onPress}
    >
      <View style={[cb.icon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={20} color={colors.white} />
      </View>
      <Text style={[cb.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

const cb = StyleSheet.create({
  btn: {
    flex: 1,
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1.5,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
  },
});

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={faq.item}>
      <Pressable
        style={({ pressed }) => [faq.header, pressed && { opacity: 0.75 }]}
        onPress={() => setOpen((v) => !v)}
      >
        <Text style={faq.question}>{question}</Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.textMuted}
        />
      </Pressable>
      {open && <Text style={faq.answer}>{answer}</Text>}
    </View>
  );
}

const faq = StyleSheet.create({
  item: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  question: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  answer: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    lineHeight: 21,
    paddingBottom: spacing.lg,
  },
});

// ── Écran principal ───────────────────────────────────────────────────────────

export function SupportScreen({ role }: { role: "chauffeur" | "client" }) {
  const insets = useSafeAreaInsets();
  const items = role === "chauffeur" ? FAQ_CHAUFFEUR : FAQ_CLIENT;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Aide & Support</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="headset" size={32} color={colors.primary} />
          </View>
          <Text style={styles.heroTitle}>Comment pouvons-nous vous aider ?</Text>
          <Text style={styles.heroSub}>
            Notre équipe est disponible du lundi au vendredi de 8h à 18h.
          </Text>
        </View>

        {/* Boutons de contact */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Nous contacter</Text>
          <View style={styles.contactRow}>
            <ContactBtn
              icon="logo-whatsapp"
              label="WhatsApp"
              color="#25D366"
              onPress={() =>
                openLink(
                  `${WHATSAPP_URL}?text=${encodeURIComponent(
                    `Bonjour GoTaxi, j'ai besoin d'aide en tant que ${role === "chauffeur" ? "chauffeur" : "client"}.`
                  )}`
                )
              }
            />
            <ContactBtn
              icon="call"
              label="Appeler"
              color={colors.info}
              onPress={() => openLink(PHONE_TEL)}
            />
            <ContactBtn
              icon="mail"
              label="Email"
              color="#EA4335"
              onPress={() =>
                openLink(
                  `${EMAIL_URL}?subject=${encodeURIComponent(
                    `Support GoTaxi - ${role === "chauffeur" ? "Chauffeur" : "Client"}`
                  )}`
                )
              }
            />
          </View>
          <View style={styles.phoneHint}>
            <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
            <Text style={styles.phoneHintText}>{PHONE_DISPLAY} · fccarsone@gmail.com</Text>
          </View>
        </View>

        {/* FAQ */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Questions fréquentes</Text>
          <View style={styles.faqCard}>
            {items.map((item, i) => (
              <FAQItem key={i} question={item.q} answer={item.a} />
            ))}
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>GoTaxi · Support v1.0</Text>
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },

  hero: {
    alignItems: "center",
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing["2xl"],
    gap: spacing.sm,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${colors.primary}12`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  heroTitle: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    textAlign: "center",
  },
  heroSub: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },

  section: {
    paddingHorizontal: spacing["2xl"],
    marginBottom: spacing["2xl"],
  },
  sectionLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.md,
  },

  contactRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  phoneHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: spacing.md,
  },
  phoneHintText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },

  faqCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.xl,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },

  footer: {
    textAlign: "center",
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
});
