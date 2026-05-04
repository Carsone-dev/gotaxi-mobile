# Spécification API — Volet Colis (GoTaxi Mobile)

> **Destinataire** : Développeur Backend Senior  
> **Date** : 03 mai 2026  
> **Version mobile** : Expo 54 / React Native 0.81  
> **Auteur** : Équipe Mobile GoTaxi

---

## Contexte

Le volet **colis** de GoTaxi permet à un client d'envoyer un colis via un chauffeur qui effectue déjà un voyage entre deux villes. Ce document décrit **exactement** ce que l'application mobile attend du backend — les endpoints, les formats de données, les transitions d'état, et les règles métier — afin d'assurer une compatibilité totale.

---

## Configuration de base

| Paramètre | Valeur |
|-----------|--------|
| Base URL | `http://<host>:8001/api/v1` |
| Variable d'env | `EXPO_PUBLIC_API_URL` |
| Content-Type | `application/json` |
| Authentification | `Authorization: Bearer {accessToken}` |
| Timeout client | 15 secondes |

> Tous les endpoints listés dans ce document sont **préfixés par `/api/v1`** et nécessitent un token Bearer valide.

---

## Modèle de données

### Enums

```
ColisStatut    = "EN_ATTENTE" | "CONFIRME" | "EN_TRANSIT" | "LIVRE" | "ANNULE"
ColisCategorie = "DOCUMENTS" | "VETEMENTS" | "ELECTRONIQUE" | "ALIMENTAIRE" | "FRAGILE" | "AUTRE"
```

### Objet `Colis` (réponse standard)

Tous les endpoints retournent cet objet (ou un tableau de cet objet).

```json
{
  "id": "string",
  "voyage_id": "string",
  "expediteur_id": "string",
  "ville_depart": "string",
  "ville_arrivee": "string",
  "description": "string",
  "categorie": "ColisCategorie",
  "poids_kg": "number | null",
  "fragile": "boolean",
  "destinataire_nom": "string",
  "destinataire_telephone": "string",
  "prix": "number | null",
  "statut": "ColisStatut",
  "code_suivi": "string",
  "photo_url": "string | null",
  "voyage": "Voyage | undefined",
  "created_at": "string (ISO 8601)",
  "updated_at": "string (ISO 8601)"
}
```

**Notes sur les champs :**

| Champ | Notes |
|-------|-------|
| `id` | UUID généré par le backend |
| `expediteur_id` | ID de l'utilisateur authentifié (client) |
| `code_suivi` | Code alphanumérique court, généré automatiquement à la création |
| `prix` | Peut être `null` à la création ; fixé ultérieurement par le chauffeur |
| `photo_url` | Champ présent dans le modèle mais l'upload n'est pas encore implémenté côté mobile |
| `voyage` | Objet voyage imbriqué, retourné en option selon l'endpoint |
| `created_at` / `updated_at` | Format ISO 8601 (ex: `"2026-05-03T10:30:00Z"`) |

---

## Machine d'états du statut

```
                     ┌─────────────────────────────────────────┐
                     │                                         │
                     ▼                                         │
              [ EN_ATTENTE ]                              (annuler)
                /         \                                    │
     (confirmer)           (annuler)                          │
          │                    │                               │
          ▼                    ▼                               │
     [ CONFIRME ]         [ ANNULE ]                           │
          │                                                    │
     (en_transit)                                              │
   (voyage EN_COURS)                                           │
          │                                                    │
          ▼                                                    │
    [ EN_TRANSIT ] ────────────────────────────────────────────┘
          │
       (livrer)
          │
          ▼
       [ LIVRE ]
```

**Règles de transition (à valider côté backend) :**

| Action | Statut requis | Nouveau statut | Qui peut agir |
|--------|---------------|----------------|---------------|
| `confirmer` | `EN_ATTENTE` | `CONFIRME` | Chauffeur du voyage |
| `annuler` | `EN_ATTENTE` | `ANNULE` | Client **ou** Chauffeur |
| `en_transit` | `CONFIRME` | `EN_TRANSIT` | Chauffeur du voyage + voyage doit être `EN_COURS` |
| `livrer` | `EN_TRANSIT` | `LIVRE` | Chauffeur du voyage |

> **Important** : Le backend doit rejeter toute transition invalide avec un `HTTP 422` ou `HTTP 409` et un message d'erreur explicite.

---

## Endpoints — Vue d'ensemble

| # | Méthode | Endpoint | Rôle | Acteur |
|---|---------|----------|------|--------|
| 1 | `POST` | `/colis` | Créer un colis | Client |
| 2 | `GET` | `/colis/me` | Lister ses colis | Client |
| 3 | `GET` | `/colis/{id}` | Détail d'un colis | Client |
| 4 | `POST` | `/colis/{id}/annuler` | Annuler un colis | Client / Chauffeur |
| 5 | `GET` | `/colis/voyage/{voyageId}` | Colis d'un voyage | Chauffeur |
| 6 | `POST` | `/colis/{id}/confirmer` | Accepter un colis | Chauffeur |
| 7 | `POST` | `/colis/{id}/en_transit` | Mettre en transit | Chauffeur |
| 8 | `POST` | `/colis/{id}/livrer` | Marquer comme livré | Chauffeur |

---

## Endpoints — Détail

---

### 1. Créer un colis

```
POST /api/v1/colis
Authorization: Bearer {token}
Content-Type: application/json
```

**Corps de la requête :**

```json
{
  "voyage_id": "uuid — requis",
  "description": "string — requis",
  "categorie": "ColisCategorie — requis",
  "poids_kg": "number — optionnel",
  "fragile": "boolean — optionnel (défaut: false)",
  "destinataire_nom": "string — requis",
  "destinataire_telephone": "string — requis"
}
```

**Réponse `201 Created` :**

```json
{
  "id": "uuid",
  "voyage_id": "uuid",
  "expediteur_id": "uuid (depuis le token)",
  "ville_depart": "string (depuis le voyage)",
  "ville_arrivee": "string (depuis le voyage)",
  "description": "string",
  "categorie": "ColisCategorie",
  "poids_kg": null,
  "fragile": false,
  "destinataire_nom": "string",
  "destinataire_telephone": "string",
  "prix": null,
  "statut": "EN_ATTENTE",
  "code_suivi": "GTX-XXXXXX",
  "photo_url": null,
  "voyage": { ...objetVoyage },
  "created_at": "2026-05-03T10:00:00Z",
  "updated_at": "2026-05-03T10:00:00Z"
}
```

**Règles backend :**
- `expediteur_id` est extrait du token JWT (ne pas accepter un `expediteur_id` dans le body)
- `ville_depart` et `ville_arrivee` sont déduits du voyage associé (`voyage_id`)
- `statut` initialisé à `EN_ATTENTE`
- `code_suivi` généré automatiquement (format suggéré : `GTX-XXXXXX`)
- `prix` initialisé à `null`

**Erreurs possibles :**

| Code | Cas |
|------|-----|
| `400` | Champs requis manquants ou invalides |
| `404` | `voyage_id` inexistant |
| `422` | Le voyage n'accepte pas les colis (`accepte_colis = false`) |

---

### 2. Lister les colis du client connecté

```
GET /api/v1/colis/me
Authorization: Bearer {token}
```

**Paramètres :** aucun

**Réponse `200 OK` :**

```json
[
  { ...Colis },
  { ...Colis }
]
```

**Règles backend :**
- Filtre sur `expediteur_id` = ID utilisateur extrait du token
- Retourne tous les statuts confondus (le tri actif/archivé est fait côté mobile)
- Aucune pagination n'est attendue pour l'instant (le mobile charge tout)

---

### 3. Détail d'un colis

```
GET /api/v1/colis/{id}
Authorization: Bearer {token}
```

**Paramètres URL :** `id` (UUID du colis)

**Réponse `200 OK` :**

```json
{ ...Colis }
```

**Règles backend :**
- Vérifier que l'utilisateur authentifié est soit l'expéditeur, soit le chauffeur du voyage lié
- Retourner l'objet voyage imbriqué (`voyage`) dans la réponse

**Erreurs possibles :**

| Code | Cas |
|------|-----|
| `404` | Colis inexistant |
| `403` | L'utilisateur n'est pas l'expéditeur ni le chauffeur |

---

### 4. Annuler un colis

```
POST /api/v1/colis/{id}/annuler
Authorization: Bearer {token}
```

**Paramètres URL :** `id` (UUID du colis)  
**Corps :** aucun

**Réponse `200 OK` :**

```json
{ ...Colis, "statut": "ANNULE" }
```

**Règles backend :**
- Autorisé pour le **client (expéditeur)** ET pour le **chauffeur du voyage**
- Statut requis : `EN_ATTENTE` uniquement
- Rejeter avec `409 Conflict` si le statut est différent de `EN_ATTENTE`

---

### 5. Colis d'un voyage (vue chauffeur)

```
GET /api/v1/colis/voyage/{voyageId}
Authorization: Bearer {token}
```

**Paramètres URL :** `voyageId` (UUID du voyage)

**Réponse `200 OK` :**

```json
[
  { ...Colis },
  { ...Colis }
]
```

**Règles backend :**
- Vérifier que le chauffeur authentifié est bien le chauffeur du voyage (`voyageId`)
- Retourner tous les colis liés à ce voyage, tous statuts confondus

**Erreurs possibles :**

| Code | Cas |
|------|-----|
| `403` | L'utilisateur n'est pas le chauffeur du voyage |
| `404` | Voyage inexistant |

---

### 6. Confirmer un colis (chauffeur accepte)

```
POST /api/v1/colis/{id}/confirmer
Authorization: Bearer {token}
```

**Paramètres URL :** `id` (UUID du colis)  
**Corps :** aucun

**Réponse `200 OK` :**

```json
{ ...Colis, "statut": "CONFIRME" }
```

**Règles backend :**
- Seul le chauffeur du voyage associé peut confirmer
- Statut requis : `EN_ATTENTE`

---

### 7. Mettre en transit (départ effectif)

```
POST /api/v1/colis/{id}/en_transit
Authorization: Bearer {token}
```

**Paramètres URL :** `id` (UUID du colis)  
**Corps :** aucun

**Réponse `200 OK` :**

```json
{ ...Colis, "statut": "EN_TRANSIT" }
```

**Règles backend :**
- Seul le chauffeur du voyage associé peut effectuer cette action
- Statut requis : `CONFIRME`
- Condition supplémentaire côté mobile : le voyage doit être en statut `EN_COURS` (la vérification peut être faite côté backend aussi pour plus de robustesse)

---

### 8. Marquer comme livré

```
POST /api/v1/colis/{id}/livrer
Authorization: Bearer {token}
```

**Paramètres URL :** `id` (UUID du colis)  
**Corps :** aucun

**Réponse `200 OK` :**

```json
{ ...Colis, "statut": "LIVRE" }
```

**Règles backend :**
- Seul le chauffeur du voyage associé peut effectuer cette action
- Statut requis : `EN_TRANSIT`

---

## Endpoint voyages lié au colis

Le mobile appelle cet endpoint existant avec un filtre spécifique au colis :

```
GET /api/v1/voyages/search
Authorization: Bearer {token}
```

**Query parameters attendus :**

```
ville_depart=string      (requis)
ville_arrivee=string     (requis)
date_depart=YYYY-MM-DD   (requis — date du jour)
accepte_colis=true       (requis — filtre les voyages acceptant les colis)
size=50                  (pagination)
```

**Réponse attendue :** tableau de `Voyage[]`

> Le backend doit obligatoirement supporter le paramètre `accepte_colis=true` sur cet endpoint de recherche. En cas d'indisponibilité, le mobile effectue un fallback sur `GET /voyages/route?...` avec filtrage côté client.

---

## Format des erreurs

Le mobile utilise un utilitaire `getErrorMessage()` qui parse les réponses d'erreur Axios. Le format attendu pour les erreurs backend :

```json
{
  "detail": "Message d'erreur lisible"
}
```

ou (format FastAPI standard) :

```json
{
  "detail": [
    {
      "loc": ["body", "champ"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

---

## Stratégie de cache (pour information)

Le mobile utilise TanStack React Query. Les durées de cache configurées sont :

| Requête | Clé de cache | Stale time |
|---------|--------------|------------|
| `/colis/me` | `["colis", "me"]` | 30 secondes |
| `/colis/{id}` | `["colis", "{id}"]` | par défaut |
| `/colis/voyage/{id}` | `["colis", "voyage", "{id}"]` | 30 secondes |
| `/voyages/search?accepte_colis=true` | `["voyages", "colis", "{dep}", "{arr}"]` | 60 secondes |

Toutes les mutations (`POST`) invalident la clé `["colis"]`, déclenchant un rechargement automatique.

---

## Flux utilisateur complet

### Côté Client — Envoyer un colis

```
1. Saisie des informations du colis (description, catégorie, poids, destinataire)
2. Recherche de voyages  →  GET /voyages/search?...&accepte_colis=true
3. Sélection d'un voyage
4. Confirmation                →  POST /colis
5. Redirection vers le détail  →  GET /colis/{id}
6. Possibilité d'annuler       →  POST /colis/{id}/annuler  (si EN_ATTENTE)
```

### Côté Chauffeur — Gérer les colis de son voyage

```
1. Ouverture du détail du voyage  →  GET /colis/voyage/{voyageId}
2. Pour chaque colis EN_ATTENTE :
   - Accepter  →  POST /colis/{id}/confirmer
   - Refuser   →  POST /colis/{id}/annuler
3. Au départ du voyage (voyage EN_COURS) :
   - Mettre en transit  →  POST /colis/{id}/en_transit
4. À l'arrivée, après remise au destinataire :
   - Marquer livré  →  POST /colis/{id}/livrer
```

---

## Checklist d'implémentation backend

- [ ] `POST /colis` — création avec génération automatique du `code_suivi`
- [ ] `GET /colis/me` — filtrage par `expediteur_id` depuis le token
- [ ] `GET /colis/{id}` — avec objet `voyage` imbriqué
- [ ] `POST /colis/{id}/annuler` — accessible client ET chauffeur
- [ ] `GET /colis/voyage/{voyageId}` — avec vérification chauffeur
- [ ] `POST /colis/{id}/confirmer` — transition `EN_ATTENTE → CONFIRME`
- [ ] `POST /colis/{id}/en_transit` — transition `CONFIRME → EN_TRANSIT`
- [ ] `POST /colis/{id}/livrer` — transition `EN_TRANSIT → LIVRE`
- [ ] `GET /voyages/search` — support du filtre `accepte_colis=true`
- [ ] Validation des transitions d'état (rejeter les transitions invalides)
- [ ] Protection des endpoints chauffeur (vérifier ownership du voyage)
- [ ] Format d'erreur standard (`{ "detail": "..." }`)
