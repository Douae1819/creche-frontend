# PetitsPas — Documentation Technique

> Application SaaS de gestion de crèche — version 2026

---

## Table des matières

1. [Présentation générale](#1-présentation-générale)
2. [Technologies utilisées](#2-technologies-utilisées)
3. [Architecture du système](#3-architecture-du-système)
4. [Fonctionnalités](#4-fonctionnalités)
5. [Modèle de données](#5-modèle-de-données)
6. [Sécurité](#6-sécurité)
7. [API REST — Endpoints](#7-api-rest--endpoints)
8. [Déploiement](#8-déploiement)
9. [Variables d'environnement](#9-variables-denvironnement)

---

## 1. Présentation générale

**PetitsPas** est une application web SaaS (Software as a Service) destinée à la gestion quotidienne d'une crèche. Elle couvre :

- L'inscription des enfants et la gestion des dossiers familiaux
- Le suivi des présences (arrivée, départ, statut)
- Les menus hebdomadaires publiés aux parents
- Les résumés journaliers de chaque enfant (humeur, appétit, sieste…)
- La communication avec les familles (événements, règlement intérieur)
- Les tableaux de bord adaptés à chaque rôle (Admin, Enseignant, Parent)

L'application est bilingue **Français / Arabe** avec support RTL.

---

## 2. Technologies utilisées

### Backend

| Technologie | Version | Rôle |
|---|---|---|
| **NestJS** | 10.x | Framework API REST (Node.js) |
| **Prisma ORM** | 5.x | Accès base de données, migrations |
| **PostgreSQL** | 15 | Base de données relationnelle |
| **JWT (jsonwebtoken)** | — | Authentification sans état |
| **bcrypt** | — | Hachage des mots de passe |
| **class-validator / class-transformer** | — | Validation des DTOs entrants |
| **Swagger (OpenAPI)** | — | Documentation interactive de l'API (`/api`) |
| **Nodemailer** | — | Envoi d'e-mails (confirmation inscription, notifications) |

### Frontend

| Technologie | Version | Rôle |
|---|---|---|
| **Next.js 14** | App Router | Framework React SSR/CSR |
| **TypeScript** | 5.x | Typage statique |
| **Tailwind CSS** | 3.x | Styles utilitaires |
| **shadcn/ui** | — | Composants UI (Card, Button, Badge, Input…) |
| **next-intl** | — | Internationalisation (fr/ar, routing locale) |
| **Lucide React** | — | Icônes |
| **axios** | — | Client HTTP (`src/lib/api.ts`) |

### Infrastructure

| Service | Rôle |
|---|---|
| **Render.com** | Hébergement backend NestJS + PostgreSQL |
| **Vercel** | Hébergement frontend Next.js |
| **GitHub** | Dépôt de code, CI/CD automatique |

---

## 3. Architecture du système

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Vercel)                        │
│                      Next.js 14 App Router                      │
│                                                                 │
│  /[locale]/admin/…      → Interface administrateur             │
│  /[locale]/teacher/…    → Interface enseignant                 │
│  /[locale]/parent/…     → Dashboard parent (SPA mobile-first)  │
│  /[locale]/inscription  → Formulaire public d'inscription       │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS / JWT Bearer Token
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (Render.com)                       │
│                     NestJS REST API :3000                       │
│                                                                 │
│  /auth          Auth (login, register, refresh, change-pwd)     │
│  /admin/…       Routes admin protégées (ADMIN uniquement)       │
│  /menus         Gestion des menus                               │
│  /presences     Présences (enseignant/admin)                    │
│  /daily-resumes Résumés journaliers                             │
│  /parent/…      Routes parent (profil, enfant, événements)      │
│  /public/…      Routes publiques (inscription, règlement)       │
└────────────────────────────┬────────────────────────────────────┘
                             │ Prisma Client
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PostgreSQL (Render.com)                       │
└─────────────────────────────────────────────────────────────────┘
```

### Modules NestJS

| Module | Description |
|---|---|
| `AuthModule` | Login JWT, register, refresh token, changement de mot de passe |
| `UsersModule` | Gestion des utilisateurs (ADMIN/ENSEIGNANT/PARENT) |
| `InscriptionsModule` | Création, consultation, validation/rejet des demandes d'inscription |
| `FamillesModule` | Gestion des familles et tuteurs |
| `EnfantsModule` | Profil enfant, santé, photos |
| `ClassesModule` | Gestion des classes, affectation enseignants |
| `PresencesModule` | Suivi présence/absence par enfant et par jour |
| `DailyResumesModule` | Résumé journalier par enfant (humeur, appétit, sieste, participation) |
| `MenusModule` | Menus hebdomadaires (Brouillon → Publié) |
| `EventsModule` | Événements/sorties de la crèche |
| `ReglementInterieurModule` | Règlement intérieur (lecture publique, édition admin) |
| `DashboardModule` | Agrégats pour le tableau de bord admin |
| `ParentModule` | Profil parent, enfant, délégations, résumés |
| `ClassDailySummariesModule` | Résumé de classe par jour (journal enseignant) |

---

## 4. Fonctionnalités

### 4.1 Inscription des enfants

- **Formulaire public** en 5 étapes accessible sans connexion (`/inscription`)
  - Étape 1 : Informations enfant + photo
  - Étape 2 : Coordonnées des parents/tuteurs (CIN, téléphone, désignation responsable principal)
  - Étape 3 : Personnes autorisées à récupérer l'enfant (`sansRestriction` ou liste nommée avec CIN)
  - Étape 4 : Santé (médecin, allergies, intolérances, tags maladies/suivi, restrictions alimentaires)
  - Étape 5 : Règlement intérieur + signature électronique (déclaration sur l'honneur)
- Le formulaire envoie un payload JSON complet sauvegardé dans `Inscription.payload` (approche audit-log)
- L'admin consulte les candidatures, peut les **accepter** (crée Famille/Tuteurs/Enfant en base) ou les **rejeter** avec motif
- Statuts d'inscription : `CANDIDATURE` → `EN_COURS` → `ACTIF` | `REJETEE`

### 4.2 Gestion des présences

- **Enseignants** marquent les présences de leur classe chaque matin (Présent / Absent / Justifié)
- **Admins** consultent l'historique avec filtres : date, classe, enseignant, statut, nom de l'enfant
- Export **CSV** + impression **PDF** depuis l'interface admin
- Pagination côté serveur (25 par page par défaut)
- **Dashboard parent** : statut du jour, historique mensuel paginé avec statistiques

### 4.3 Résumés journaliers (DailyResume)

- L'enseignant renseigne pour chaque enfant : humeur, sieste, appétit, participation, observations
- **Dashboard parent** affiche le résumé du jour (onglets présence + accueil)
- Si pas encore renseigné : message "Résumé pas encore disponible"
- Navigation par date (précédent/suivant) dans la section présence du dashboard parent

### 4.4 Menus hebdomadaires

- **Admin** crée les menus par jour (collation matin, repas déjeuner, goûter)
- Workflow de publication : `Brouillon` (invisible aux parents) → `Publié` (visible aux parents)
- Options de publication :
  - Case "Publier immédiatement" lors de l'édition d'un jour (cochée par défaut)
  - Bouton "Publier la semaine" : publie tous les brouillons de la semaine en un clic
  - Bouton "Ajouter menu semaine" : crée les menus pour les 5 jours vides et les publie
- **Dashboard parent** : menu du jour + menus de la semaine en cours (filtrés lundi–dimanche)

### 4.5 Profils enseignants

- L'admin gère les enseignants : prénom, nom, fonction (dropdown), spécialité, téléphone
- Affectation des enseignants aux classes (multi-enseignant par classe)
- L'enseignant voit ses classes et peut gérer les présences et résumés journaliers

### 4.6 Dashboard parent (mobile-first)

- **Onglet Accueil** : salutation personnalisée, résumé du jour, message de classe, aperçu des prochains événements
- **Onglet Présence** : statut aujourd'hui, résumé journalier navigable par date, historique mensuel
- **Onglet Enfant** : profil complet (santé, allergies, intolérances, personnes autorisées), édition inline
- **Onglet Menu** : menu du jour + tous les menus de la semaine courante
- **Onglet Événements** : liste complète des événements à venir
- Mise à jour du profil : téléphone, adresse
- Changement de mot de passe sécurisé

### 4.7 Santé et délégations

- **Profil santé** de l'enfant : médecin traitant, notes libres, restrictions alimentaires (sans porc, végétarien, sans gluten, autre), tags prédéfinis (maladies, allergies, intolérances, suivi)
- **Allergies** et **intolérances** listées individuellement avec sévérité
- **Personnes autorisées** (`Delegation`) à récupérer l'enfant : nom, téléphone, CIN, relation
- Option `sansRestriction` : aucune restriction sur les personnes autorisées

### 4.8 Classes

- Gestion des classes : nom, niveau (TPS / PS / MS / GS)
- Affectation multi-enseignants par classe
- Statistiques : nombre d'élèves par classe

### 4.9 Règlement intérieur

- Lecture publique sans authentification : `GET /public/reglement-interieur`
- Édition admin : éditeur Markdown avec prévisualisation et versionning
- Chargé dynamiquement dans le formulaire d'inscription (étape 5)

### 4.10 Événements

- Création d'événements : titre, description, date/heure de début et fin, classe associée
- **Filtrage automatique** : seuls les événements à venir (endAt ≥ maintenant) sont affichés aux parents
- Interface admin : séparation "À venir" / "Événements passés" (section rétractable)
- Visible dans les dashboards parent et enseignant

### 4.11 Informations de l'établissement

- Page dédiée `/admin/etablissement` : nom, adresse, téléphone, email, site web, horaires, capacité d'accueil, description
- Stockée en base via un enregistrement singleton (`id = "singleton"`, table `EtablissementInfo`)
- Vue lecture (icônes) + formulaire d'édition inline
- Visible dans la sidebar admin (section "Notre établissement")

---

## 5. Modèle de données

### Principales entités Prisma

```
Utilisateur
  ├── id, email, motDePasse (hash bcrypt), role: ADMIN|ENSEIGNANT|PARENT
  ├── prenom, nom, telephone, statut (ACTIF|INACTIF)
  ├── Enseignant     (id, utilisateurId, fonction, specialite)
  │     └── EnseignantClasse (enseignantId, classeId)
  └── Tuteur         (id, familleId, lien, prenom, nom, email, telephone, cin, principal)

Famille            (id, emailPrincipal, languePreferee: fr|ar, adresseFacturation)
  ├── Tuteur[]
  └── Enfant[]
        ├── Inscription    (id, enfantId, statut: CANDIDATURE|EN_COURS|ACTIF|REJETEE, payload:Json)
        ├── ProfilSante    (id, enfantId, medecin, notes, tags:String[], restrictionAlimentaire)
        │     ├── Allergie (id, profilSanteId, nom, severite)
        │     └── Intolerance (id, profilSanteId, nom, notes)
        ├── Delegation     (id, enfantId, nom, telephone, cin, relation)
        ├── Presence       (id, enfantId, date, statut: Present|Absent|Justifie, arriveeA, departA)
        └── DailyResume    (id, enfantId, date:unique, humeur, sieste, appetit, participation, observations:String[])

Classe             (id, nom, niveau: TPS|PS|MS|GS, nbEleves)
Menu               (id, date:unique, collationMatin, repas, gouter, statut: Brouillon|Publie, publieLe)
  └── MenuAllergen (id, menuId, allergen)
Evenement          (id, titre, description, startAt, endAt, classeId?)
ReglementInterieur (id="singleton", contenu, version, modifiePar)
EtablissementInfo  (id="singleton", nom, adresse, telephone, email, siteWeb?, description?, horaires?, capacite?, modifiePar?, modifieLe)
ClassDailySummary  (id, classeId, date, activites, apprentissages, observations)
```

### Flux d'inscription → provisionnement

```
1. Parent remplit le formulaire (5 étapes)
   POST /inscriptions  →  crée Inscription { statut: CANDIDATURE, payload: {...} }

2. Admin examine le dossier
   PATCH /admin/inscriptions/:id/accept
     → lit payload
     → upsert Famille (par emailPrincipal)
     → crée Tuteur(s) avec CIN
     → crée Enfant (photo, intolerances, sansRestriction, delegations)
     → crée ProfilSante (allergies, tags)
     → crée Delegation[] (personnes autorisées)
     → Inscription.statut = ACTIF
     → envoi e-mail de bienvenue au parent
```

---

## 6. Sécurité

### Authentification JWT

- Les tokens JWT sont envoyés dans le header HTTP `Authorization: Bearer <token>`
- Signés avec `JWT_SECRET` (variable d'environnement, jamais commitée)
- Expiration configurable (`JWT_EXPIRES_IN`, par défaut `7d`)
- Mots de passe hachés avec **bcrypt** (salt rounds = 12)
- Changement de mot de passe : vérifie l'ancien mot de passe avant d'accepter le nouveau

### Contrôle d'accès par rôle (RBAC)

Géré par `RolesGuard` et le décorateur `@Roles()` :

| Rôle | Droits |
|---|---|
| `ADMIN` | Accès complet à toutes les routes admin et de gestion |
| `ENSEIGNANT` | Présences et résumés de ses classes uniquement |
| `PARENT` | Son profil, son enfant, les menus publiés, les événements |

Les routes publiques (`/auth/login`, `/auth/register`, `/inscriptions`, `/public/*`) n'ont pas de garde.

### Validation stricte des entrées

- `ValidationPipe` avec `whitelist: true, forbidNonWhitelisted: true`
- Toute propriété inconnue envoyée au backend est **rejetée avec une erreur 400**
- Chaque DTO utilise des décorateurs de validation : `@IsString()`, `@IsEmail()`, `@IsISO8601()`, `@IsEnum()`, `@IsBoolean()`, `@IsObject()`, `@ValidateNested()`

### Protection des données

- Aucun secret dans le code source — tous gérés par variables d'environnement
- `.env` listé dans `.gitignore`
- Les photos d'enfants (base64) sont limitées à 5 Mo, types JPEG/PNG/WEBP uniquement
- Les données de santé sont dans des tables relationnelles dédiées, accessibles uniquement via les routes authentifiées
- Filtrage automatique côté backend : un `PARENT` ne voit que les menus `Publie`, pas les brouillons

---

## 7. API REST — Endpoints

### Authentification

| Méthode | Route | Authentification | Description |
|---|---|---|---|
| POST | `/auth/login` | Publique | Connexion (retourne JWT) |
| POST | `/auth/register` | Publique | Création de compte parent |
| POST | `/auth/change-password` | JWT | Changement de mot de passe |

### Inscriptions

| Méthode | Route | Rôle | Description |
|---|---|---|---|
| POST | `/inscriptions` | Public | Soumettre une inscription |
| GET | `/admin/inscriptions` | ADMIN | Lister avec filtres et pagination |
| GET | `/admin/inscriptions/:id` | ADMIN | Détail d'une inscription |
| PATCH | `/admin/inscriptions/:id/accept` | ADMIN | Accepter (provisionne) |
| PATCH | `/admin/inscriptions/:id/reject` | ADMIN | Rejeter avec motif |

### Utilisateurs

| Méthode | Route | Rôle | Description |
|---|---|---|---|
| GET | `/admin/users` | ADMIN | Lister les utilisateurs |
| GET | `/admin/users/:id` | ADMIN | Profil d'un utilisateur |
| PATCH | `/admin/users/:id` | ADMIN | Mettre à jour (profil enseignant) |

### Classes

| Méthode | Route | Rôle | Description |
|---|---|---|---|
| GET | `/admin/classes` | ADMIN | Lister toutes les classes |
| POST | `/admin/classes` | ADMIN | Créer une classe |
| PATCH | `/admin/classes/:id` | ADMIN | Modifier (nom, niveau) |
| DELETE | `/admin/classes/:id` | ADMIN | Supprimer |
| POST | `/admin/classes/:id/teachers` | ADMIN | Affecter un enseignant |
| DELETE | `/admin/classes/:id/teachers/:uid` | ADMIN | Retirer un enseignant |

### Présences

| Méthode | Route | Rôle | Description |
|---|---|---|---|
| GET | `/presences` | ADMIN/ENSEIGNANT | Lister avec filtres et pagination |
| POST | `/presences` | ENSEIGNANT | Enregistrer une présence |
| PATCH | `/presences/:id` | ENSEIGNANT | Modifier une présence |

### Menus

| Méthode | Route | Rôle | Description |
|---|---|---|---|
| GET | `/menus` | JWT | Lister (PARENT → Publiés uniquement) |
| POST | `/menus` | ADMIN | Créer un menu |
| PATCH | `/menus/:id` | ADMIN | Modifier |
| POST | `/menus/:id/publish` | ADMIN | Publier |
| POST | `/menus/:id/unpublish` | ADMIN | Dépublier (→ Brouillon) |
| DELETE | `/menus/:id` | ADMIN | Supprimer (brouillon uniquement) |

### Résumés journaliers

| Méthode | Route | Rôle | Description |
|---|---|---|---|
| GET | `/daily-resumes` | ADMIN/ENSEIGNANT | Lister les résumés |
| POST | `/daily-resumes` | ENSEIGNANT | Créer un résumé |
| PATCH | `/daily-resumes/:id` | ENSEIGNANT | Modifier |
| GET | `/parent/children/:id/resume` | PARENT | Résumé d'un enfant pour une date |

### Règlement intérieur

| Méthode | Route | Rôle | Description |
|---|---|---|---|
| GET | `/public/reglement-interieur` | Public | Lire le règlement |
| PUT | `/admin/reglement-interieur` | ADMIN | Mettre à jour |

### Établissement

| Méthode | Route | Rôle | Description |
|---|---|---|---|
| GET | `/admin/users/etablissement` | ADMIN | Lire les infos de l'établissement |
| PUT | `/admin/users/etablissement` | ADMIN | Mettre à jour (upsert singleton) |

> **Note** : Ces routes sont déclarées **avant** la route dynamique `GET /admin/users/:id` dans le contrôleur NestJS pour éviter le conflit de routing.

---

## 8. Déploiement

### Processus de déploiement

1. Développeur pousse sur la branche `main`
2. **Render** détecte le push → rebuild et redéploiement automatique du backend (2–5 min)
3. **Vercel** détecte le push → rebuild et redéploiement automatique du frontend (1–2 min)

### Backend (Render.com)

```bash
# Build
npm run build      # compile TypeScript → dist/

# Start
node dist/main     # démarre le serveur NestJS

# Migrations (au démarrage)
npx prisma migrate deploy
```

### Frontend (Vercel)

```bash
# Build
next build

# Start (production)
next start
```

### Note sur Prisma (développement Windows)

Lors de `npx prisma generate` sur Windows, si le serveur NestJS tourne, la DLL Prisma est verrouillée.
**Solution** : Arrêter le serveur → `npx prisma generate` → Redémarrer le serveur.

---

## 9. Variables d'environnement

### Backend (`creche-api/.env`)

```env
# Base de données
DATABASE_URL=postgresql://user:password@host:5432/dbname

# JWT
JWT_SECRET=votre_secret_jwt_tres_long_et_aleatoire
JWT_EXPIRES_IN=7d

# SMTP (envoi d'emails)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@petitspas.com
SMTP_PASS=mot_de_passe_smtp

# URL du frontend (pour les liens dans les emails)
FRONTEND_URL=https://petitspas.vercel.app

# Environnement
NODE_ENV=production
PORT=3000
```

### Frontend (`creche-frontend/.env.local`)

```env
# URL de l'API backend
NEXT_PUBLIC_API_URL=https://petitspas-api.onrender.com
```

---

*Documentation — PetitsPas SaaS — Mars 2026*
Modification -Revue Phase 1 de PetitsPas.

changement  . Sécurité & dépendances (frontend)
Montée de version axios (ex. ^1.14.0).
npm audit / alignement des dépendances côté frontend.
vercel.json : en-têtes de sécurité (CSP ou headers associés selon ce qui a été ajouté).
2. API — contenu & hygiène
sanitize-html + config / utilitaire de sanitisation.
Interceptor (ou équivalent) pour nettoyer ou contrôler le contenu selon les flux concernés.
Tests de type preuve de concept (PoC) autour de la sanitisation.
3. API — sessions & JWT
Module Redis.
JWT : liste noire / invalidation (jti + blacklist).
Refresh / logout et adaptation du AuthService pour ce modèle.
4. Frontend — auth & cookies
api.ts : flux de refresh des tokens (aligné avec le backend).
Pages login / layout / logout : gestion des cookies cohérente avec l’auth.
5. Internationalisation — bascule de langue
LanguageSwitcher : après changement de langue, cookie NEXT_LOCALE + router.replace via hrefForLocaleFromPathname (middleware next-intl), pour que FR/عربي soit réellement appliqué (login + admin).
6. Internationalisation — messages & pages admin
fr.json / ar.json : admin.menus enrichi ; namespaces admin.classOverview, admin.classesManage, admin.eventsManage, admin.teachersManage.
Pages branchées sur useTranslations : menus semaine, vue classes, événements, classes, enseignants (liens withLocalePath, statuts traduits).
[locale]/layout.tsx : libellé de chargement FR / AR.
