/**
 * Types métier partagés
 */

export type UserRole = 'ADMIN' | 'ENSEIGNANT' | 'PARENT';
export type UserStatus = 'INVITED' | 'ACTIVE' | 'DISABLED';
export type InscriptionStatus = 'CANDIDATURE' | 'EN_COURS' | 'ACTIF' | 'REJETEE';
export type PresenceStatus = 'Present' | 'Absent' | 'Justifie';
export type MenuStatus = 'Brouillon' | 'Publie';
export type EventAudience = 'Parents' | 'Enseignants' | 'Tous';

// Daily Resume Enums
export type AppetitLevel = 'Excellent' | 'Bon' | 'Moyen' | 'Faible' | 'Refus';
export type HumeurLevel = 'Excellent' | 'Bon' | 'Moyen' | 'Difficile' | 'Tres_difficile';
export type SiesteLevel = 'Excellent' | 'Bon' | 'Moyen' | 'Difficile' | 'Pas_de_sieste';
export type ParticipationLevel = 'Excellent' | 'Bon' | 'Moyen' | 'Faible' | 'Absent';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  statut: UserStatus;
  nom?: string;
  prenom?: string;
  telephone?: string;
  creeLe: Date;
  modifieLe: Date;
}

export interface Classe {
  id: string;
  nom: string;
  capacite?: number;
  trancheAge?: string;
  active: boolean;
}

export interface Enfant {
  id: string;
  nom: string;
  prenom: string;
  dateNaissance: Date;
  classeId: string;
  classe?: Classe;
}

export interface Inscription {
  id: string;
  statut: InscriptionStatus;
  creeLe: Date;
  modifieLe: Date;
  famille: {
    nom: string;
    prenom: string;
    email: string;
  };
  enfants: Enfant[];
}

export interface Presence {
  id: string;
  enfantId: string;
  date: Date;
  statut: PresenceStatus;
  observations?: string;
}

export interface DailyResume {
  id: string;
  enfantId: string;
  enfantPrenom: string;
  enfantNom: string;
  date: Date;
  appetit?: AppetitLevel;
  humeur?: HumeurLevel;
  sieste?: SiesteLevel;
  participation?: ParticipationLevel;
  observations: string[];
  /** API parent : dernier résumé ≤ date demandée */
  isFallback?: boolean;
  requestedDate?: string;
  creePar?: string;
  creeLe: Date;
  modifieLe: Date;
}

export interface Menu {
  id: string;
  date: Date;
  entree?: string;
  plat?: string;
  dessert?: string;
  statut: MenuStatus;
  allergenes: string[];
  creeLe: Date;
  modifieLe: Date;
}

export interface Event {
  id: string;
  titre: string;
  description: string;
  date: Date;
  audience: EventAudience;
  classeId?: string;
  creeLe: Date;
  modifieLe: Date;
}

export interface ClassDailySummary {
  id: string;
  classeId: string;
  date: Date;
  activites: string;
  apprentissages: string;
  humeurGroupe: string;
  observations?: string;
  statut: MenuStatus;
  creeLe: Date;
  modifieLe: Date;
}

