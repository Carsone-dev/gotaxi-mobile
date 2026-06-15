export type UserRole = "CLIENT" | "CHAUFFEUR" | "ADMIN" | "SUPER_ADMIN";
export type UserStatus = "ACTIF" | "SUSPENDU" | "EN_ATTENTE_KYC" | "SUPPRIME";
export type VoyageStatus = "PUBLIE" | "COMPLET" | "EN_COURS" | "TERMINE" | "ANNULE";
export type ReservationStatus = "EN_ATTENTE" | "CONFIRMEE" | "REFUSEE" | "ANNULEE" | "TERMINEE";
export type TypeVehicule = "BERLINE" | "SUV" | "MINIBUS" | "BUS" | "MOTO";

// ─── Users ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  telephone: string;
  email: string | null;
  nom: string;
  prenom: string;
  photo_url: string | null;
  role: UserRole;
  statut: UserStatus;
  telephone_verifie: boolean;
  email_verifie: boolean;
  note_moyenne: number;
  nombre_avis: number;
  langue: string;
  created_at: string;
  updated_at: string;
}

export interface UserPublic {
  id: string;
  nom: string;
  prenom: string;
  photo_url: string | null;
  role: UserRole;
  note_moyenne: number;
  nombre_avis: number;
}

export interface UserUpdatePayload {
  nom?: string;
  prenom?: string;
  email?: string;
  langue?: string;
}

export interface Avis {
  id: string;
  auteur_id: string;
  cible_id: string;
  voyage_id: string;
  note: number;
  commentaire: string | null;
  tags: string[];
  signale: boolean;
  visible: boolean;
  created_at: string;
}

// ─── Véhicules ────────────────────────────────────────────────────────────────

export interface Vehicule {
  id: string;
  marque: string;
  modele: string;
  annee: number;
  immatriculation: string;
  couleur: string;
  type_vehicule: TypeVehicule;
  nombre_places: number;
  climatise: boolean;
  photo_url: string | null;
  photos_interieures: string[];
  assurance_url: string | null;
  assurance_expiration: string | null;
  visite_technique_url: string | null;
  visite_technique_expiration: string | null;
  titre_url: string | null;
  titre_expiration: string | null;
  livret_bord_url: string | null;
  docs_vehicule_valides: boolean;
  docs_vehicule_valides_le: string | null;
  actif: boolean;
}

export interface VehiculeCreatePayload {
  marque: string;
  modele: string;
  annee: number;
  immatriculation: string;
  couleur: string;
  type_vehicule: TypeVehicule;
  nombre_places: number;
  climatise: boolean;
}

export interface VehiculeUpdatePayload {
  couleur?: string;
  nombre_places?: number;
  climatise?: boolean;
}

// ─── Chauffeurs ───────────────────────────────────────────────────────────────

export interface Chauffeur {
  id: string;
  user_id: string;
  cin_numero: string | null;
  cin_url: string | null;
  permis_numero: string | null;
  permis_url: string | null;
  permis_expiration: string | null;
  casier_judiciaire_url: string | null;
  kyc_valide: boolean;
  kyc_valide_le: string | null;
  autorisation_transfrontaliere: boolean;
  en_ligne: boolean;
  derniere_position_lat: number | null;
  derniere_position_lng: number | null;
  nombre_trajets: number;
  revenus_total: number;
  vehicules: Vehicule[];
}

export interface ChauffeurPublic {
  id: string;
  nom: string;
  prenom: string;
  photo_url: string | null;
  note_moyenne: number;
  nombre_avis: number;
  nombre_trajets: number;
  en_ligne: boolean;
}

export interface ChauffeurStats {
  nombre_trajets: number;
  revenus_total: number;
  note_moyenne: number;
  nombre_avis: number;
  en_ligne: boolean;
}

export interface ChauffeurRevenus {
  aujourd_hui: number;
  semaine: number;
  mois: number;
  total: number;
}

export interface ChauffeurUpdatePayload {
  cin_numero?: string;
  permis_numero?: string;
  permis_expiration?: string;
}

export interface PositionPayload {
  lat: number;
  lng: number;
  vitesse?: number;
  heading?: number;
}

// ─── Voyages ──────────────────────────────────────────────────────────────────

export interface Voyage {
  id: string;
  chauffeur_id: string;
  vehicule_id: string;
  ville_depart: string;
  ville_arrivee: string;
  point_depart: string;
  point_arrivee: string;
  lat_depart: number;
  lng_depart: number;
  lat_arrivee: number;
  lng_arrivee: number;
  date_depart: string;
  date_arrivee_estimee: string | null;
  prix_par_place: number;
  nombre_places_total: number;
  nombre_places_restantes: number;
  accepte_colis: boolean;
  climatise: boolean;
  non_fumeur: boolean;
  statut: VoyageStatus;
  distance_km: number | null;
  created_at: string;
  vehicule: {
    photo_url: string | null;
    type_vehicule: TypeVehicule;
    marque: string;
    modele: string;
    photos_interieures: string[];
  } | null;
}

export interface VoyageSearchParams {
  ville_depart: string;
  ville_arrivee: string;
  date_depart: string;
  nombre_places?: number;
  accepte_colis?: boolean;
  climatise?: boolean;
  prix_max?: number;
  sort_by?: "depart_asc" | "depart_desc" | "prix_asc" | "prix_desc";
  page?: number;
  size?: number;
}

export interface VoyageSearchResult {
  items: Voyage[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface VoyageCreatePayload {
  ville_depart: string;
  ville_arrivee: string;
  point_depart: string;
  point_arrivee: string;
  lat_depart: number;
  lng_depart: number;
  lat_arrivee: number;
  lng_arrivee: number;
  date_depart: string;
  prix_par_place: number;
  nombre_places_total: number;
  vehicule_id: string;
  accepte_colis?: boolean;
  climatise?: boolean;
  non_fumeur?: boolean;
}

export interface VoyageUpdatePayload {
  prix_par_place?: number;
  point_depart?: string;
  date_depart?: string;
  accepte_colis?: boolean;
  non_fumeur?: boolean;
}

// ─── Réservations ─────────────────────────────────────────────────────────────

export interface Reservation {
  id: string;
  voyage_id: string;
  client_id: string;
  nombre_places: number;
  prix_total: number;
  statut: ReservationStatus;
  code_confirmation: string;
  created_at: string;
  voyage: Pick<Voyage, "id" | "ville_depart" | "ville_arrivee" | "date_depart" | "prix_par_place" | "statut"> | null;
  client: UserPublic | null;
}

export interface ReservationCreatePayload {
  voyage_id: string;
  nombre_places: number;
  modalite_paiement?: "WALLET" | "ESPECES";
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginPayload {
  telephone: string;
  password: string;
}

export interface RegisterPayload {
  telephone: string;
  nom: string;
  prenom: string;
  password: string;
  email?: string;
}

export interface OtpSendPayload {
  telephone: string;
}

export interface OtpVerifyPayload {
  telephone: string;
  code: string;
}

export interface PasswordForgotPayload {
  telephone: string;
}

export interface PasswordResetPayload {
  telephone: string;
  code: string;
  new_password: string;
}

export interface PasswordChangePayload {
  current_password: string;
  new_password: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    request_id?: string;
  };
}

// ─── Colis ────────────────────────────────────────────────────────────────────

export type ColisStatut = "EN_ATTENTE" | "CONFIRME" | "EN_TRANSIT" | "LIVRE" | "ANNULE";
export type ColisCategorie =
  | "DOCUMENTS"
  | "VETEMENTS"
  | "ELECTRONIQUE"
  | "ALIMENTAIRE"
  | "FRAGILE"
  | "AUTRE";
export type ColisModalitePaiement = "A_LA_CONFIRMATION" | "A_LA_LIVRAISON";

export interface Colis {
  id: string;
  voyage_id: string;
  expediteur_id: string;
  ville_depart: string;
  ville_arrivee: string;
  description: string;
  categorie: ColisCategorie;
  poids_kg: number | null;
  fragile: boolean;
  destinataire_nom: string;
  destinataire_telephone: string;
  prix: number;
  modalite_paiement: ColisModalitePaiement;
  statut: ColisStatut;
  code_suivi: string;
  photo_url: string | null;
  voyage: Voyage | null;
  created_at: string;
  updated_at: string;
}

export interface ColisCreatePayload {
  voyage_id: string;
  description: string;
  categorie: ColisCategorie;
  poids_kg?: number;
  fragile?: boolean;
  destinataire_nom: string;
  destinataire_telephone: string;
  modalite_paiement?: ColisModalitePaiement;
}

// ─── Tarifs trajets ───────────────────────────────────────────────────────────

export interface TarifTrajet {
  id: string;
  ville_depart: string;
  ville_arrivee: string;
  prix_recommande: number;
  prix_max: number;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Wallet ───────────────────────────────────────────────────────────────────

export type OperateurMM = "MTN_MOMO" | "ORANGE_MONEY" | "MOOV_MONEY" | "CELTIS" | "FEDAPAY";
export type TransactionType =
  | "RECHARGE"
  | "PAIEMENT_VOYAGE"
  | "PAIEMENT_COLIS"
  | "REVERSEMENT"
  | "REMBOURSEMENT"
  | "COMMISSION";
export type TransactionStatut = "EN_ATTENTE" | "EN_COURS" | "REUSSI" | "ECHEC" | "ANNULE";

export interface Wallet {
  id: string;
  solde: number;
  devise: string;
  actif: boolean;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  statut: TransactionStatut;
  operateur: OperateurMM | null;
  montant: number;
  created_at: string;
}

export interface TransactionListResult {
  items: Transaction[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface RechargeInitiatePayload {
  montant: number;
  operateur: OperateurMM;
  telephone: string;
}

export interface RechargeInitiateResult {
  message: string;
  payment_url?: string;
}

export interface WithdrawPayload {
  montant: number;
  telephone: string;
  operateur: OperateurMM;
}

export interface TransferPayload {
  destinataire_telephone: string;
  montant: number;
}

export interface WalletPublic {
  user_id: string;
  nom: string;
  prenom: string;
  telephone: string;
  actif: boolean;
}

// ─── Payout Account (chauffeur) ───────────────────────────────────────────────

export type PayoutOperateur = "MTN_MOMO" | "ORANGE_MONEY" | "MOOV_MONEY" | "CELTIS" | "FEDAPAY";

export interface ComptePayoutChauffeur {
  id: string;
  chauffeur_id: string;
  operateur: PayoutOperateur;
  telephone: string;
  actif: boolean;
}

export interface ComptePayoutCreatePayload {
  operateur: PayoutOperateur;
  telephone: string;
}