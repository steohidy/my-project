/**
 * Système de cache quotidien pour économiser les crédits API
 * - 1 seul appel API par jour au lieu de multiples
 * - Stockage dans un fichier JSON
 * - Reset automatique à minuit
 */

import fs from 'fs';
import path from 'path';

// Chemin du fichier cache
const CACHE_DIR = path.join(process.cwd(), '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'daily-matches.json');

// Interface pour les données du cache
interface DailyCacheData {
  date: string;           // Date de création (YYYY-MM-DD)
  lastFetchTime: string;  // Heure du dernier fetch
  matches: any[];         // Matchs du jour
  timing: any;            // Infos de timing
  predictions: any[];     // Prédictions calculées
}

/**
 * Vérifie si le cache est valide (même jour)
 */
export function isCacheValid(): boolean {
  try {
    if (!fs.existsSync(CACHE_FILE)) {
      return false;
    }

    const cacheData: DailyCacheData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    const today = new Date().toISOString().split('T')[0];

    // Le cache est valide s'il a été créé aujourd'hui
    return cacheData.date === today;
  } catch {
    return false;
  }
}

/**
 * Lit les données du cache
 */
export function readCache(): DailyCacheData | null {
  try {
    if (!isCacheValid()) {
      return null;
    }

    const cacheData: DailyCacheData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    console.log(`📦 Cache lu: ${cacheData.matches.length} matchs du ${cacheData.date}`);
    return cacheData;
  } catch (error) {
    console.error('Erreur lecture cache:', error);
    return null;
  }
}

/**
 * Écrit les données dans le cache
 */
export function writeCache(matches: any[], timing: any): void {
  try {
    // Créer le dossier cache s'il n'existe pas
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }

    const today = new Date().toISOString().split('T')[0];

    const cacheData: DailyCacheData = {
      date: today,
      lastFetchTime: new Date().toISOString(),
      matches: matches,
      timing: timing,
      predictions: matches.map(m => ({
        matchId: m.id,
        goalsPrediction: m.goalsPrediction,
        cardsPrediction: m.cardsPrediction,
        riskPercentage: m.insight?.riskPercentage,
        confidence: m.insight?.confidence
      }))
    };

    fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2));
    console.log(`✅ Cache écrit: ${matches.length} matchs sauvegardés pour le ${today}`);
  } catch (error) {
    console.error('Erreur écriture cache:', error);
  }
}

/**
 * Vide le cache (pour reset quotidien)
 */
export function clearCache(): void {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      fs.unlinkSync(CACHE_FILE);
      console.log('🗑️ Cache vidé');
    }
  } catch (error) {
    console.error('Erreur vidage cache:', error);
  }
}

/**
 * Vérifie si c'est un nouveau jour et vide le cache si nécessaire
 * Appelé automatiquement au début de chaque requête
 */
export function checkAndResetDaily(): void {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const cacheData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
      const today = new Date().toISOString().split('T')[0];

      if (cacheData.date !== today) {
        console.log(`🌅 Nouveau jour détecté (${cacheData.date} → ${today}), reset du cache`);
        clearCache();
      }
    }
  } catch {
    // En cas d'erreur, on continue
  }
}

/**
 * Retourne les infos du cache pour debug
 */
export function getCacheInfo(): { exists: boolean; date: string | null; matchCount: number } {
  try {
    if (!fs.existsSync(CACHE_FILE)) {
      return { exists: false, date: null, matchCount: 0 };
    }

    const cacheData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    return {
      exists: true,
      date: cacheData.date,
      matchCount: cacheData.matches?.length || 0
    };
  } catch {
    return { exists: false, date: null, matchCount: 0 };
  }
}
