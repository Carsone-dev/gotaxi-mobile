import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  Switch,
  Alert,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  useMyChauffeurProfile,
  useMyVehicules,
  useAddVehicule,
  useUpdateVehicule,
  useDeleteVehicule,
  useUpdateChauffeurProfile,
  useUploadDocuments,
  useUploadVehiculePhoto,
} from "@/src/hooks/useChauffeur";
import { getErrorMessage } from "@/src/utils/error-handler";
import { useToast } from "@/src/components/common/Toast";
import { DatePickerField } from "@/src/components/ui/DatePickerField";
import { colors, typography, spacing, radii, shadows } from "@/src/theme";
import { resolveMediaUrl } from "@/src/constants/app";
import type { TypeVehicule, Vehicule } from "@/src/api/types";

// ─── Types ────────────────────────────────────────────────────────────────────

const TYPE_OPTIONS: TypeVehicule[] = ["BERLINE", "SUV", "MINIBUS", "BUS", "MOTO"];
const TYPE_ICON: Record<TypeVehicule, string> = {
  BERLINE: "🚗",
  SUV: "🚙",
  MINIBUS: "🚐",
  BUS: "🚌",
  MOTO: "🏍️",
};

interface VehiculeForm {
  marque: string;
  modele: string;
  annee: string;
  immatriculation: string;
  couleur: string;
  type_vehicule: TypeVehicule;
  nombre_places: string;
  climatise: boolean;
}

const EMPTY_VEHICULE: VehiculeForm = {
  marque: "",
  modele: "",
  annee: String(new Date().getFullYear()),
  immatriculation: "",
  couleur: "",
  type_vehicule: "BERLINE",
  nombre_places: "4",
  climatise: false,
};

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ChauffeurSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const { data: chauffeur, isLoading: chauffeurLoading } = useMyChauffeurProfile();
  const { data: vehicules, isLoading: vehiculesLoading } = useMyVehicules();

  const { mutateAsync: updateProfile, isPending: updatingProfile } = useUpdateChauffeurProfile();
  const { mutateAsync: uploadDocs, isPending: uploadingDocs } = useUploadDocuments();
  const { mutateAsync: addVehicule, isPending: adding } = useAddVehicule();
  const { mutateAsync: uploadVehiculePhoto } = useUploadVehiculePhoto();
  const { mutateAsync: updateVehicule, isPending: updating } = useUpdateVehicule();
  const { mutateAsync: deleteVehicule, isPending: deleting } = useDeleteVehicule();

  // Profile edit modal
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [cinInput, setCinInput] = useState("");
  const [permisInput, setPermisInput] = useState("");
  const [permisExpInput, setPermisExpInput] = useState("");

  // KYC documents
  const [cinUri, setCinUri] = useState<string | null>(null);
  const [permisUri, setPermisUri] = useState<string | null>(null);
  const [casierUri, setCasierUri] = useState<string | null>(null);

  // Add vehicle modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<VehiculeForm>(EMPTY_VEHICULE);
  const [addPhoto, setAddPhoto] = useState<string | null>(null);

  // Edit vehicle modal
  const [editTarget, setEditTarget] = useState<Vehicule | null>(null);
  const [editCouleur, setEditCouleur] = useState("");
  const [editPlaces, setEditPlaces] = useState("");
  const [editClim, setEditClim] = useState(false);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const openProfileEdit = () => {
    setCinInput(chauffeur?.cin_numero ?? "");
    setPermisInput(chauffeur?.permis_numero ?? "");
    setPermisExpInput(chauffeur?.permis_expiration ?? "");
    setShowProfileModal(true);
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile({
        ...(cinInput.trim() && { cin_numero: cinInput.trim() }),
        ...(permisInput.trim() && { permis_numero: permisInput.trim() }),
        ...(permisExpInput.trim() && { permis_expiration: permisExpInput.trim() }),
      });
      showToast("Profil mis à jour", "success");
      setShowProfileModal(false);
    } catch (e) {
      showToast(getErrorMessage(e), "error");
    }
  };

  const pickVehiculePhoto = () => {
    Alert.alert("Photo du véhicule", "Comment souhaitez-vous ajouter la photo ?", [
      {
        text: "Prendre une photo",
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") {
            showToast("Permission caméra refusée", "error");
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) setAddPhoto(result.assets[0].uri);
        },
      },
      {
        text: "Choisir depuis la galerie",
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) setAddPhoto(result.assets[0].uri);
        },
      },
      { text: "Annuler", style: "cancel" },
    ]);
  };

  const pickKycDoc = (setter: (uri: string) => void) => {
    Alert.alert("Ajouter un document", "Comment souhaitez-vous ajouter ce document ?", [
      {
        text: "Prendre une photo",
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") {
            showToast("Permission caméra refusée", "error");
            return;
          }
          const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.85 });
          if (!result.canceled && result.assets[0]) setter(result.assets[0].uri);
        },
      },
      {
        text: "Choisir depuis la galerie",
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 0.85 });
          if (!result.canceled && result.assets[0]) setter(result.assets[0].uri);
        },
      },
      { text: "Annuler", style: "cancel" },
    ]);
  };

  const handleUploadDocs = async () => {
    if (!cinUri && !permisUri && !casierUri) {
      showToast("Sélectionnez au moins un document", "error");
      return;
    }
    try {
      await uploadDocs({
        ...(cinUri && { cin: cinUri }),
        ...(permisUri && { permis: permisUri }),
        ...(casierUri && { casier: casierUri }),
      });
      showToast("Documents envoyés — en attente de validation", "success");
      setCinUri(null);
      setPermisUri(null);
      setCasierUri(null);
    } catch (e) {
      showToast(getErrorMessage(e), "error");
    }
  };

  const handleAddVehicule = async () => {
    if (!addForm.marque.trim() || !addForm.modele.trim() || !addForm.immatriculation.trim() || !addForm.couleur.trim()) {
      showToast("Remplissez tous les champs", "error");
      return;
    }
    const annee = parseInt(addForm.annee, 10);
    const places = parseInt(addForm.nombre_places, 10);
    if (isNaN(annee) || annee < 2000 || annee > 2030) {
      showToast("Année invalide (2000-2030)", "error");
      return;
    }
    if (isNaN(places) || places < 1 || places > 20) {
      showToast("Nombre de places invalide (1-20)", "error");
      return;
    }
    try {
      const vehicule = await addVehicule({
        marque: addForm.marque.trim(),
        modele: addForm.modele.trim(),
        annee,
        immatriculation: addForm.immatriculation.trim().toUpperCase(),
        couleur: addForm.couleur.trim(),
        type_vehicule: addForm.type_vehicule,
        nombre_places: places,
        climatise: addForm.climatise,
      });
      if (addPhoto) {
        try {
          await uploadVehiculePhoto({ id: vehicule.id, uri: addPhoto });
        } catch {
          // photo non bloquante : le véhicule est créé, on avertit seulement
          showToast("Véhicule ajouté (photo non envoyée)", "info");
          setShowAddModal(false);
          setAddForm(EMPTY_VEHICULE);
          setAddPhoto(null);
          return;
        }
      }
      showToast("Véhicule ajouté", "success");
      setShowAddModal(false);
      setAddForm(EMPTY_VEHICULE);
      setAddPhoto(null);
    } catch (e) {
      showToast(getErrorMessage(e), "error");
    }
  };

  const openEditVehicule = (v: Vehicule) => {
    setEditTarget(v);
    setEditCouleur(v.couleur);
    setEditPlaces(String(v.nombre_places));
    setEditClim(v.climatise);
  };

  const handleUpdateVehicule = async () => {
    if (!editTarget) return;
    const places = parseInt(editPlaces, 10);
    if (isNaN(places) || places < 1 || places > 20) {
      showToast("Nombre de places invalide (1-20)", "error");
      return;
    }
    try {
      await updateVehicule({
        id: editTarget.id,
        payload: { couleur: editCouleur.trim(), nombre_places: places, climatise: editClim },
      });
      showToast("Véhicule modifié", "success");
      setEditTarget(null);
    } catch (e) {
      showToast(getErrorMessage(e), "error");
    }
  };

  const handleDeleteVehicule = (v: Vehicule) => {
    Alert.alert(
      "Supprimer le véhicule",
      `Supprimer ${v.marque} ${v.modele} ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteVehicule(v.id);
              showToast("Véhicule supprimé", "info");
            } catch (e) {
              showToast(getErrorMessage(e), "error");
            }
          },
        },
      ]
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Paramètres chauffeur</Text>
      </View>

      {/* ── Section 1 : Profil chauffeur ─────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mes informations</Text>
          <Pressable style={styles.editBtn} onPress={openProfileEdit}>
            <Text style={styles.editBtnText}>Modifier</Text>
          </Pressable>
        </View>

        {chauffeurLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <View style={styles.infoList}>
            <InfoRow label="N° CIN" value={chauffeur?.cin_numero ?? "Non renseigné"} />
            <InfoRow label="N° Permis" value={chauffeur?.permis_numero ?? "Non renseigné"} />
            <InfoRow
              label="Expiration permis"
              value={chauffeur?.permis_expiration ?? "Non renseigné"}
            />
            <InfoRow
              label="KYC"
              value={chauffeur?.kyc_valide ? "✓ Validé" : "En attente de validation"}
              valueColor={chauffeur?.kyc_valide ? colors.success : colors.warning}
            />
          </View>
        )}
      </View>

      {/* ── Section 2 : Documents KYC ────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Documents KYC</Text>
          {chauffeur?.kyc_valide && (
            <View style={styles.kycValidBadge}>
              <Text style={styles.kycValidBadgeText}>✓ Validé</Text>
            </View>
          )}
        </View>
        <Text style={styles.sectionSub}>
          {chauffeur?.kyc_valide
            ? "Vos documents ont été validés par l'équipe GoTaxi."
            : "Soumettez vos documents pour valider votre compte chauffeur."}
        </Text>

        <KycDocRow
          label="Carte d'identité (CIN)"
          existingUrl={chauffeur?.cin_url ?? null}
          newUri={cinUri}
          onPick={() => pickKycDoc(setCinUri)}
          onClearNew={() => setCinUri(null)}
        />
        <KycDocRow
          label="Permis de conduire"
          existingUrl={chauffeur?.permis_url ?? null}
          newUri={permisUri}
          onPick={() => pickKycDoc(setPermisUri)}
          onClearNew={() => setPermisUri(null)}
        />
        <KycDocRow
          label="Casier judiciaire"
          existingUrl={chauffeur?.casier_judiciaire_url ?? null}
          newUri={casierUri}
          onPick={() => pickKycDoc(setCasierUri)}
          onClearNew={() => setCasierUri(null)}
        />

        {(cinUri || permisUri || casierUri) && (
          <Pressable
            style={[styles.submitBtn, uploadingDocs && styles.submitBtnDisabled]}
            onPress={handleUploadDocs}
            disabled={uploadingDocs}
          >
            {uploadingDocs ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitBtnText}>
                Envoyer{" "}
                {[cinUri, permisUri, casierUri].filter(Boolean).length > 1
                  ? `${[cinUri, permisUri, casierUri].filter(Boolean).length} documents`
                  : "le document"}
              </Text>
            )}
          </Pressable>
        )}
      </View>

      {/* ── Section 3 : Véhicules ─────────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mes véhicules</Text>
          <Pressable style={styles.addBtn} onPress={() => setShowAddModal(true)}>
            <Text style={styles.addBtnText}>+ Ajouter</Text>
          </Pressable>
        </View>

        {vehiculesLoading ? (
          <ActivityIndicator color={colors.primary} style={{ margin: spacing.lg }} />
        ) : vehicules && vehicules.length > 0 ? (
          vehicules.map((v) => (
            <View key={v.id} style={styles.vehiculeCard}>
              {v.photo_url ? (
                <Image source={{ uri: resolveMediaUrl(v.photo_url)! }} style={styles.vehiculePhoto} />
              ) : (
                <Text style={styles.vehiculeIcon}>{TYPE_ICON[v.type_vehicule]}</Text>
              )}
              <View style={styles.vehiculeInfo}>
                <Text style={styles.vehiculeName}>
                  {v.marque} {v.modele} ({v.annee})
                </Text>
                <Text style={styles.vehiculePlate}>
                  {v.immatriculation} · {v.couleur}
                </Text>
                <View style={styles.vehiculeTags}>
                  <Tag label={v.type_vehicule} />
                  <Tag label={`${v.nombre_places} places`} />
                  {v.climatise && <Tag label="❄ Clim" />}
                </View>
              </View>
              <View style={styles.vehiculeActions}>
                <Pressable
                  style={styles.iconBtn}
                  onPress={() => openEditVehicule(v)}
                >
                  <Text style={styles.iconBtnText}>✏️</Text>
                </Pressable>
                <Pressable
                  style={styles.iconBtn}
                  onPress={() => handleDeleteVehicule(v)}
                  disabled={deleting}
                >
                  <Text style={styles.iconBtnText}>🗑</Text>
                </Pressable>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🚗</Text>
            <Text style={styles.emptyTitle}>Aucun véhicule</Text>
            <Text style={styles.emptyText}>
              Ajoutez votre véhicule pour pouvoir publier des trajets
            </Text>
          </View>
        )}
      </View>

      {/* ── Section 4 : Compte de paiement ──────────────────────────────── */}
      <Pressable
        style={styles.payoutSection}
        onPress={() => router.push("/(chauffeur)/payout-account")}
      >
        <View style={styles.payoutIconBox}>
          <Text style={styles.payoutIcon}>💳</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.payoutTitle}>Compte de paiement</Text>
          <Text style={styles.payoutSub}>
            Configurez où recevoir vos revenus (MoMo, FedaPay…)
          </Text>
        </View>
        <Text style={styles.payoutArrow}>›</Text>
      </Pressable>

      {/* ── Modal : modifier profil ──────────────────────────────────────── */}
      <Modal visible={showProfileModal} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
          <ModalHeader
            title="Mes informations"
            onClose={() => setShowProfileModal(false)}
          />
          <FormField label="N° CIN" value={cinInput} onChange={setCinInput} placeholder="Ex: BE1234567" />
          <FormField label="N° Permis" value={permisInput} onChange={setPermisInput} placeholder="Ex: P987654" />
          <DatePickerField
            label="Expiration permis"
            value={permisExpInput}
            onChange={setPermisExpInput}
            minimumDate={new Date()}
          />
          <Pressable
            style={[styles.submitBtn, updatingProfile && styles.submitBtnDisabled]}
            onPress={handleSaveProfile}
            disabled={updatingProfile}
          >
            {updatingProfile ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitBtnText}>Enregistrer</Text>
            )}
          </Pressable>
        </ScrollView>
      </Modal>

      {/* ── Modal : modifier véhicule ────────────────────────────────────── */}
      <Modal visible={!!editTarget} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
          <ModalHeader
            title={editTarget ? `Modifier ${editTarget.marque} ${editTarget.modele}` : ""}
            onClose={() => setEditTarget(null)}
          />
          <FormField label="Couleur" value={editCouleur} onChange={setEditCouleur} placeholder="Ex: Blanc" />
          <FormField
            label="Nombre de places"
            value={editPlaces}
            onChange={setEditPlaces}
            placeholder="Ex: 4"
            keyboard="number-pad"
          />
          <View style={styles.switchRow}>
            <Text style={styles.formLabel}>Climatisé</Text>
            <Switch
              value={editClim}
              onValueChange={setEditClim}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.white}
            />
          </View>
          <Pressable
            style={[styles.submitBtn, updating && styles.submitBtnDisabled]}
            onPress={handleUpdateVehicule}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitBtnText}>Enregistrer les modifications</Text>
            )}
          </Pressable>
        </ScrollView>
      </Modal>

      {/* ── Modal : ajouter véhicule ─────────────────────────────────────── */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
          <ModalHeader title="Ajouter un véhicule" onClose={() => { setShowAddModal(false); setAddForm(EMPTY_VEHICULE); setAddPhoto(null); }} />

          <FormField label="Marque *" value={addForm.marque} onChange={(v) => setAddForm((f) => ({ ...f, marque: v }))} placeholder="Ex: Toyota" />
          <FormField label="Modèle *" value={addForm.modele} onChange={(v) => setAddForm((f) => ({ ...f, modele: v }))} placeholder="Ex: Corolla" />

          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <FormField label="Année *" value={addForm.annee} onChange={(v) => setAddForm((f) => ({ ...f, annee: v }))} placeholder="2020" keyboard="number-pad" maxLength={4} />
            </View>
            <View style={{ flex: 1 }}>
              <FormField label="Couleur *" value={addForm.couleur} onChange={(v) => setAddForm((f) => ({ ...f, couleur: v }))} placeholder="Ex: Blanc" />
            </View>
          </View>

          <FormField
            label="Immatriculation *"
            value={addForm.immatriculation}
            onChange={(v) => setAddForm((f) => ({ ...f, immatriculation: v }))}
            placeholder="Ex: BJ-1234-A"
            autoCapitalize="characters"
          />

          <Text style={styles.formLabel}>Type de véhicule</Text>
          <View style={styles.typeGrid}>
            {TYPE_OPTIONS.map((t) => (
              <Pressable
                key={t}
                style={[styles.typeOption, addForm.type_vehicule === t && styles.typeOptionActive]}
                onPress={() => setAddForm((f) => ({ ...f, type_vehicule: t }))}
              >
                <Text style={styles.typeIcon}>{TYPE_ICON[t]}</Text>
                <Text style={[styles.typeLabel, addForm.type_vehicule === t && styles.typeLabelActive]}>{t}</Text>
              </Pressable>
            ))}
          </View>

          <FormField
            label="Nombre de places *"
            value={addForm.nombre_places}
            onChange={(v) => setAddForm((f) => ({ ...f, nombre_places: v }))}
            placeholder="4"
            keyboard="number-pad"
            maxLength={2}
          />

          <View style={styles.switchRow}>
            <Text style={styles.formLabel}>Climatisé</Text>
            <Switch
              value={addForm.climatise}
              onValueChange={(v) => setAddForm((f) => ({ ...f, climatise: v }))}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.white}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Photo du véhicule</Text>
            {addPhoto ? (
              <View style={styles.photoPreviewRow}>
                <Image source={{ uri: addPhoto }} style={styles.photoPreview} />
                <View style={styles.photoPreviewActions}>
                  <Pressable style={styles.photoChangeBtn} onPress={pickVehiculePhoto}>
                    <Text style={styles.photoChangeBtnText}>Changer</Text>
                  </Pressable>
                  <Pressable style={styles.photoRemoveBtn} onPress={() => setAddPhoto(null)}>
                    <Text style={styles.photoRemoveBtnText}>Supprimer</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable style={styles.photoPlaceholder} onPress={pickVehiculePhoto}>
                <Text style={styles.photoPlaceholderIcon}>📷</Text>
                <Text style={styles.photoPlaceholderText}>Ajouter une photo</Text>
                <Text style={styles.photoPlaceholderSub}>Galerie ou appareil photo</Text>
              </Pressable>
            )}
          </View>

          <Pressable
            style={[styles.submitBtn, adding && styles.submitBtnDisabled]}
            onPress={handleAddVehicule}
            disabled={adding}
          >
            {adding ? <ActivityIndicator color={colors.white} /> : <Text style={styles.submitBtnText}>Ajouter le véhicule</Text>}
          </Pressable>
        </ScrollView>
      </Modal>
    </ScrollView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{label}</Text>
    </View>
  );
}

function KycDocRow({
  label,
  existingUrl,
  newUri,
  onPick,
  onClearNew,
}: {
  label: string;
  existingUrl: string | null;
  newUri: string | null;
  onPick: () => void;
  onClearNew: () => void;
}) {
  const resolvedExisting = resolveMediaUrl(existingUrl);
  const displayUri = newUri ?? resolvedExisting;
  const isNew = !!newUri;
  const isExisting = !newUri && !!resolvedExisting;

  return (
    <View style={styles.docRow}>
      <View style={styles.docInfo}>
        <Text style={styles.docLabel}>{label}</Text>
        {isNew ? (
          <Text style={styles.docNew}>Nouveau fichier — non encore envoyé</Text>
        ) : isExisting ? (
          <Text style={styles.docSubmitted}>✓ Document soumis</Text>
        ) : (
          <Text style={styles.docNone}>Non soumis</Text>
        )}
      </View>

      <View style={styles.docButtons}>
        {displayUri && (
          <Image
            source={{ uri: displayUri }}
            style={[styles.docThumb, isNew && styles.docThumbNew]}
          />
        )}
        {isNew ? (
          <Pressable style={styles.docClearBtn} onPress={onClearNew}>
            <Text style={styles.docClearText}>✕</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.docPickBtn, isExisting && styles.docChangeBtn]}
            onPress={onPick}
          >
            <Text style={[styles.docPickText, isExisting && styles.docChangeBtnText]}>
              {isExisting ? "Changer" : "Ajouter"}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <View style={styles.modalHeader}>
      <Text style={styles.modalTitle}>{title}</Text>
      <Pressable onPress={onClose}>
        <Text style={styles.modalClose}>✕</Text>
      </Pressable>
    </View>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  keyboard = "default",
  maxLength,
  autoCapitalize = "sentences",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboard?: "default" | "number-pad" | "email-address";
  maxLength?: number;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  return (
    <View style={styles.formGroup}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboard}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { paddingBottom: 48 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing["2xl"],
    paddingTop: 56,
    paddingBottom: spacing.xl,
    backgroundColor: colors.white,
    gap: spacing.md,
    ...shadows.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: {
    fontSize: typography.fontSize["2xl"],
    color: colors.textPrimary,
    lineHeight: 28,
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  section: {
    backgroundColor: colors.white,
    margin: spacing["2xl"],
    marginBottom: 0,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  sectionSub: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: -spacing.xs,
  },
  editBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  editBtnText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
  },
  addBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  addBtnText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.white,
  },
  // Info rows
  infoList: { gap: spacing.sm },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
    maxWidth: "60%",
    textAlign: "right",
  },
  // KYC docs
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  docInfo: { flex: 1, gap: 2 },
  docLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },
  docSubmitted: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.success,
  },
  docNew: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.primary,
  },
  docNone: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  docButtons: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  docThumb: { width: 44, height: 44, borderRadius: radii.sm, backgroundColor: colors.border },
  docThumbNew: { borderWidth: 2, borderColor: colors.primary },
  docClearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.errorBg,
    alignItems: "center",
    justifyContent: "center",
  },
  docClearText: { fontSize: 12, color: colors.error, fontFamily: typography.fontFamily.bold },
  docPickBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  docPickText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textSecondary,
  },
  docChangeBtn: { borderColor: colors.primary },
  docChangeBtnText: { color: colors.primary },
  kycValidBadge: {
    backgroundColor: colors.successBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.success,
  },
  kycValidBadgeText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.success,
  },
  // Submit button
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    alignItems: "center",
    minHeight: 52,
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  // Vehicles
  vehiculeCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  vehiculeIcon: { fontSize: 32, marginTop: 4 },
  vehiculePhoto: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    backgroundColor: colors.border,
  },
  vehiculeInfo: { flex: 1, gap: spacing.xs },
  vehiculeName: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  vehiculePlate: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  vehiculeTags: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: 2 },
  vehiculeActions: { gap: spacing.xs },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnText: { fontSize: 16 },
  tag: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing["3xl"],
    gap: spacing.sm,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    textAlign: "center",
  },
  // Modal
  modal: { flex: 1, backgroundColor: colors.white },
  modalContent: { padding: spacing["2xl"], paddingBottom: 48, gap: spacing.md },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    flex: 1,
    paddingRight: spacing.sm,
  },
  modalClose: {
    fontSize: typography.fontSize.xl,
    color: colors.textMuted,
    padding: spacing.sm,
  },
  formGroup: { gap: spacing.xs },
  formRow: { flexDirection: "row", gap: spacing.md },
  formLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  typeOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  typeOptionActive: { borderColor: colors.primary, backgroundColor: colors.successBg },
  typeIcon: { fontSize: 16 },
  typeLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  typeLabelActive: { color: colors.primary, fontFamily: typography.fontFamily.semiBold },
  // Vehicle photo picker
  photoPlaceholder: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: "dashed",
    borderRadius: radii.md,
    paddingVertical: spacing["2xl"],
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface,
  },
  photoPlaceholderIcon: { fontSize: 32 },
  photoPlaceholderText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.textSecondary,
  },
  photoPlaceholderSub: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  photoPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  photoPreview: {
    width: 100,
    height: 70,
    borderRadius: radii.md,
    backgroundColor: colors.border,
  },
  photoPreviewActions: { flex: 1, gap: spacing.sm },
  photoChangeBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: "center",
  },
  photoChangeBtnText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
  },
  photoRemoveBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.error,
    alignItems: "center",
  },
  photoRemoveBtnText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.error,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  // Payout section
  payoutSection: {
    backgroundColor: colors.white,
    margin: spacing["2xl"],
    marginBottom: 0,
    borderRadius: radii.xl,
    padding: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    ...shadows.sm,
  },
  payoutIconBox: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    backgroundColor: colors.successBg,
    alignItems: "center",
    justifyContent: "center",
  },
  payoutIcon: { fontSize: 24 },
  payoutTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  payoutSub: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  payoutArrow: {
    fontSize: 24,
    color: colors.textMuted,
    fontFamily: typography.fontFamily.regular,
  },
});
