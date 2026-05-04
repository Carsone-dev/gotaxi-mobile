# Module Authentification — GoTaxi Mobile

Guide complet du flux auth, de la conception jusqu'à la maintenance.

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture des fichiers](#2-architecture-des-fichiers)
3. [Flux utilisateur de A à Z](#3-flux-utilisateur-de-a-à-z)
4. [Couche API](#4-couche-api)
5. [Store Zustand (état global)](#5-store-zustand-état-global)
6. [Gestion des tokens](#6-gestion-des-tokens)
7. [Validation des données](#7-validation-des-données)
8. [Gestion des erreurs](#8-gestion-des-erreurs)
9. [Internationalisation](#9-internationalisation)
10. [Ajouter ou modifier un écran auth](#10-ajouter-ou-modifier-un-écran-auth)
11. [Points de vigilance](#11-points-de-vigilance)

---

## 1. Vue d'ensemble

L'authentification GoTaxi repose sur :

- **JWT** (access token 30 min + refresh token 30 jours) stockés dans `expo-secure-store`
- **OTP par SMS** pour vérifier le numéro de téléphone à l'inscription
- **Expo Router** pour la navigation entre écrans (Stack)
- **Zustand** pour l'état global de session
- **Zod + react-hook-form** pour la validation des formulaires
- **Axios** avec intercepteurs pour le rafraîchissement automatique des tokens

---

## 2. Architecture des fichiers

```
app/(auth)/               ← écrans (Expo Router file-based routing)
  _layout.tsx             ← Stack navigation, animation slide_from_right
  splash.tsx              ← écran de démarrage (logo + chargement session)
  onboarding.tsx          ← présentation de l'app (1ère ouverture)
  login.tsx               ← connexion téléphone + mot de passe
  register.tsx            ← inscription (téléphone, nom, prénom, mdp, email)
  otp.tsx                 ← vérification code OTP 6 chiffres
  forgot-password.tsx     ← demande de reset par téléphone
  reset-password.tsx      ← saisie code OTP + nouveau mot de passe

src/api/
  client.ts               ← instance Axios + intercepteurs request/response
  endpoints/auth.ts       ← toutes les fonctions d'appel API auth
  types.ts                ← interfaces TypeScript (User, AuthTokens, payloads…)

src/stores/
  authStore.ts            ← store Zustand (état session + actions)

src/utils/
  validators.ts           ← schémas Zod (phoneSchema, loginSchema, registerSchema…)
  secure-storage.ts       ← wrapper expo-secure-store (get/set/delete)
  error-handler.ts        ← getErrorMessage() et getErrorCode()
```

---

## 3. Flux utilisateur de A à Z

### 3.1 Première ouverture

```
splash.tsx
  └─ restoreSession() depuis authStore
       ├─ tokens trouvés → getMe() → isAuthenticated = true
       │     └─ redirect /(client)/home ou /(chauffeur)/dashboard
       └─ pas de tokens → redirect /(auth)/onboarding
```

`restoreSession()` tente de récupérer les tokens depuis `expo-secure-store`, appelle `GET /users/me` pour valider que le token est encore bon. En cas d'échec (token expiré et refresh impossible), `logout()` est appelé automatiquement et l'utilisateur est renvoyé à l'onboarding.

### 3.2 Inscription

```
register.tsx
  └─ Formulaire validé par registerSchema (Zod)
       └─ authApi.register() → POST /auth/register
            └─ Succès → redirect /(auth)/otp?telephone=...&context=register

otp.tsx
  └─ Saisie du code 6 chiffres (focus automatique champ par champ)
       └─ authApi.verifyOtp() → POST /auth/otp/verify
            └─ Succès → redirect /(auth)/login
```

L'inscription ne connecte **pas** l'utilisateur directement. Il doit d'abord vérifier son numéro via OTP, puis se connecter.

### 3.3 Connexion

```
login.tsx
  └─ Formulaire validé par loginSchema (Zod)
       └─ authStore.login(telephone, password)
            └─ authApi.login() → POST /auth/login → { access_token, refresh_token }
                 └─ Tokens sauvegardés dans SecureStore
                      └─ authApi.getMe() → GET /users/me → User
                           └─ isAuthenticated = true
                                └─ redirect selon user.role
                                     ├─ "CHAUFFEUR" → /(chauffeur)/dashboard
                                     └─ autres → /(client)/home
```

### 3.4 Réinitialisation de mot de passe

```
forgot-password.tsx
  └─ Saisie du numéro → authApi.forgotPassword() → POST /auth/password/forgot
       └─ redirect /(auth)/reset-password?telephone=...

reset-password.tsx
  └─ Saisie code OTP + nouveau mot de passe
       └─ authApi.resetPassword() → POST /auth/password/reset
            └─ Succès → redirect /(auth)/login
```

Le backend envoie le code par SMS même si le numéro n'est pas enregistré (réponse neutre pour éviter l'énumération).

### 3.5 Déconnexion

```
authStore.logout()
  └─ authApi.logout() → POST /auth/logout (best-effort, erreur ignorée)
       └─ SecureStore.delete(access_token)
            └─ SecureStore.delete(refresh_token)
                 └─ Reset de l'état Zustand → isAuthenticated = false
```

---

## 4. Couche API

**Fichier :** `src/api/endpoints/auth.ts`

Toutes les fonctions utilisent l'instance `apiClient` (Axios). Elles retournent directement `data` (pas la réponse entière).

| Fonction | Méthode | Endpoint | Usage |
|---|---|---|---|
| `register()` | POST | `/auth/register` | Créer un compte |
| `login()` | POST | `/auth/login` | Obtenir les tokens |
| `logout()` | POST | `/auth/logout` | Invalider le refresh token |
| `refresh()` | POST | `/auth/refresh` | Renouveler les tokens |
| `getMe()` | GET | `/users/me` | Récupérer le profil courant |
| `sendOtp()` | POST | `/auth/otp/send` | Renvoyer un OTP |
| `verifyOtp()` | POST | `/auth/otp/verify` | Valider un OTP |
| `forgotPassword()` | POST | `/auth/password/forgot` | Demander un reset |
| `resetPassword()` | POST | `/auth/password/reset` | Appliquer le reset |
| `changePassword()` | POST | `/auth/password/change` | Changer le mot de passe (connecté) |

**URL de base :** lue depuis `EXPO_PUBLIC_API_URL` dans `.env.development` via `src/constants/app.ts`.

---

## 5. Store Zustand (état global)

**Fichier :** `src/stores/authStore.ts`

```typescript
// État
user: User | null           // profil complet de l'utilisateur connecté
accessToken: string | null  // JWT court (30 min)
refreshToken: string | null // JWT long (30 jours)
isAuthenticated: boolean    // true si session active
isLoading: boolean          // true pendant restoreSession() au démarrage
isChauffeurMode: boolean    // bascule client ↔ chauffeur (rôle CHAUFFEUR uniquement)

// Actions
login(telephone, password)   // connexion complète (tokens + profil)
register(...)                // délègue à authApi.register() sans sauvegarder de session
logout()                     // nettoie tokens + état
restoreSession()             // appelé au démarrage par splash.tsx
toggleChauffeurMode()        // bascule le mode (vérifie user.role === "CHAUFFEUR")
refreshAccessToken()         // utilisé par l'intercepteur Axios
```

**Important :** `register()` dans le store est un simple pass-through — il ne stocke pas de tokens. La session commence uniquement après `login()`.

---

## 6. Gestion des tokens

### Stockage

Les tokens sont dans `expo-secure-store` (chiffré par le système d'exploitation) via `src/utils/secure-storage.ts`.

Clés : `"access_token"` et `"refresh_token"` (constantes dans `STORAGE_KEYS`).

### Rafraîchissement automatique

**Fichier :** `src/api/client.ts`

L'intercepteur `response` d'Axios gère le cas `401` :

1. Si la requête n'a pas encore été retentée (`_retry === false`), elle est mise de côté
2. `isRefreshing` passe à `true` pour éviter plusieurs rafraîchissements en parallèle
3. Les requêtes en attente sont stockées dans `failedQueue`
4. `refreshAccessToken()` est appelé → `POST /auth/refresh`
5. Si le refresh réussit : toutes les requêtes en attente repartent avec le nouveau token
6. Si le refresh échoue : `logout()` est appelé → l'utilisateur est renvoyé au login

### Durée de vie

| Token | Durée | Configuré dans |
|---|---|---|
| Access token | 30 minutes | `.env` backend `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` |
| Refresh token | 30 jours | `.env` backend `JWT_REFRESH_TOKEN_EXPIRE_DAYS` |

---

## 7. Validation des données

**Fichier :** `src/utils/validators.ts`

```typescript
phoneSchema     // +229 + 10 chiffres (Bénin) OU +228 + 8 chiffres (Togo)
passwordSchema  // minimum 8 caractères
loginSchema     // { telephone, password }
registerSchema  // { telephone, nom, prenom, password, email? }
otpSchema       // code 6 chiffres numériques
resetPasswordSchema // { code: 6 chiffres, new_password }
```

**Format téléphone Bénin :** `+22901XXXXXXXX` (préfixe `01` obligatoire depuis la migration à 10 chiffres).

La même regex est présente côté backend dans :
- `backend/app/schemas/auth.py` (champ Pydantic `RegisterRequest.telephone`)
- `backend/app/utils/validators.py` (fonction `is_valid_phone()`)

**Règle :** toujours modifier les trois en même temps si le format change.

---

## 8. Gestion des erreurs

**Fichier :** `src/utils/error-handler.ts`

Deux fonctions utilitaires :

- `getErrorMessage(error)` → retourne un message lisible en français
- `getErrorCode(error)` → retourne le code métier du backend (ex: `"PHONE_ALREADY_EXISTS"`)

**Codes métier gérés dans les écrans :**

| Code | Écran | Comportement |
|---|---|---|
| `PHONE_ALREADY_EXISTS` | register.tsx | Toast "numéro déjà utilisé" |
| `INVALID_CREDENTIALS` | login.tsx | Toast "identifiants invalides" |
| `ACCOUNT_SUSPENDED` | login.tsx | Toast "compte suspendu" |
| `OTP_MAX_ATTEMPTS` | otp.tsx | Toast "trop de tentatives" |

**Cas réseau :** si `error.response` est `undefined` (pas de réponse du serveur), `getErrorMessage()` retourne `"Pas de connexion internet"`. Cela peut aussi indiquer que le backend est inaccessible depuis le téléphone — vérifier `EXPO_PUBLIC_API_URL` dans `.env.development`.

---

## 9. Internationalisation

Toutes les chaînes visibles utilisent `useTranslation()` depuis `react-i18next`. Les clés sont préfixées `auth.*`.

Structure des clés dans les fichiers de traduction :

```
auth.login.*
auth.register.*
auth.otp.*
auth.forgot_password.*
auth.reset_password.*
```

Les fichiers de traduction se trouvent dans `src/i18n/`.

---

## 10. Ajouter ou modifier un écran auth

### Ajouter un écran

1. Créer `app/(auth)/mon-ecran.tsx`
2. Ajouter `<Stack.Screen name="mon-ecran" />` dans `app/(auth)/_layout.tsx`
3. Naviguer vers lui avec `router.push("/(auth)/mon-ecran")`

### Ajouter un endpoint API

1. Ajouter l'interface du payload dans `src/api/types.ts`
2. Ajouter la fonction dans `src/api/endpoints/auth.ts`
3. Si ça modifie l'état de session, ajouter une action dans `src/stores/authStore.ts`

### Modifier la validation téléphone

Modifier la regex dans ces **trois** fichiers simultanément :
- `src/utils/validators.ts` → `phoneSchema`
- `backend/app/schemas/auth.py` → `RegisterRequest.telephone`
- `backend/app/utils/validators.py` → `PHONE_PATTERN`

---

## 11. Points de vigilance

**`isLoading` au démarrage**
`splash.tsx` doit attendre que `restoreSession()` termine avant de rediriger. Si l'écran se charge trop vite, l'utilisateur voit un flash du login avant d'être redirigé.

**`isChauffeurMode` après login**
Le mode est déterminé par `user.role === "CHAUFFEUR"` au moment du login. Si le rôle change côté backend, il faut rappeler `restoreSession()` ou `getMe()` pour mettre à jour l'état.

**`failedQueue` dans l'intercepteur**
Le tableau `failedQueue` est module-level (non réinitialisé entre les sessions). En cas de `logout()` pendant un refresh, les callbacks en attente seront ignorés car `newToken` sera `null`.

**Environnement réseau**
`EXPO_PUBLIC_API_URL` dans `.env.development` doit pointer vers l'IP LAN de la machine de développement (pas `127.0.0.1` ni `10.0.2.2` qui est réservé à l'émulateur Android). Relancer `npx expo start --clear` après tout changement de `.env`.

**Tokens non révoqués côté backend au logout**
`authApi.logout()` est appelé en best-effort. Si la requête échoue (réseau coupé), le refresh token reste valide côté backend jusqu'à expiration naturelle.