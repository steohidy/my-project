# Steo Élite Predictor - Historique du Projet

## 📋 Résumé du Projet

**Application:** Steo Élite Predictor - PWA de pronostics sportifs  
**Stack:** Next.js 16 + TypeScript + Vercel  
**Dépôt:** https://github.com/steohidy/my-project

---

## 🔧 Configuration API

### The Odds API
- **Quota:** 500 crédits gratuits/mois (reset mensuel)
- **Consommation actuelle:** ~5 crédits/jour
- **Stratégie:** 3 ligues Football + 1 NBA par jour

### Ligues Football (10 configurées, 3 sélectionnées/jour)
- Premier League, Ligue 1, La Liga, Bundesliga
- Liga Portugal, Jupiler Pro League
- Champions League, Europa League
- Coupe du Monde, Euro

### NBA
- Basketball NBA uniquement (matchs de nuit 20h-00h GMT)

---

## 👥 Système Utilisateurs

### Comptes Configurés

| Login | Mot de passe | Rôle | Validité |
|-------|--------------|------|----------|
| admin | admin123 | admin | Permanent |
| demo | demo123 | demo | Permanent |
| DD | 112233 | user | 3 mois après 1ère connexion |
| Lyno | 223345 | user | 3 mois après 1ère connexion |
| Elcapo | 234673 | user | 3 mois après 1ère connexion |
| PJ | 775553 | user | 3 mois après 1ère connexion |
| Hans | 547633 | user | 3 mois après 1ère connexion |

### Règles de Sécurité
- **Session unique:** 1 compte = 1 session active (pas de multi-appareils)
- **Durée session:** 20 minutes
- **Expiration:** Comptes user expirent après 3 mois

---

## 💾 Persistance JSON

### Configuration requise
Variable d'environnement dans Vercel:
```
GITHUB_TOKEN=ghp_votre_token_ici
```

### Fichier de données
- `data/users.json` - Utilisateurs + sessions actives + logs d'activité

---

## 🏦 Bankroll

- **Valeur initiale:** 0€ (l'utilisateur entre son capital)
- **Bouton réinitialisation:** Disponible (icône orange 🔄)
- **Types de transactions:** Dépôt, Pari, Gain, Retrait

---

## 📊 Plan Matchs (15/jour max)

| Période GMT | Sport | Matchs |
|-------------|-------|--------|
| 00h-20h | Football | 10 |
| 20h-00h | NBA | 5 |

---

## 📂 Fichiers Clés

| Fichier | Description |
|---------|-------------|
| `src/lib/users.ts` | Gestion utilisateurs |
| `src/lib/userPersistence.ts` | Persistance JSON + sessions |
| `src/lib/crossValidation.ts` | API Odds + distribution matchs |
| `src/components/MatchCard.tsx` | Affichage matchs |
| `src/components/BankrollManager.tsx` | Gestion bankroll |
| `src/app/api/admin/users/route.ts` | API Admin |
| `data/users.json` | Données persistantes |

---

## 🔄 Dernières Modifications

### 2024-03-03 (Suite)
- ✅ Ajout prédictions de BUTS (Over/Under 2.5, 1.5, BTTS)
- ✅ Ajout prédictions de CARTONS (Over/Under 4.5, Risque rouge)
- ✅ Ajout prédictions de CORNERS (Over/Under 8.5, 9.5)
- ✅ Ajout prédictions AVANCÉES (Score exact, Résultat MT)
- ✅ Interface MatchCardCompact enrichie avec grille d'options
- ✅ Bouton "Plus d'options avancées" dépliable
- ✅ Indicateurs visuels avec couleurs pour chaque type de pari

### 2024-03-03
- ✅ Blocage connexions simultanées (1 compte = 1 session)
- ✅ Bankroll initial à 0€ + bouton reset
- ✅ Plan 10 Football + 5 NBA (5 crédits/jour)
- ✅ Affichage complet noms équipes

---

## 🚀 Déploiement

- **Plateforme:** Vercel
- **Auto-déploiement:** Oui, à chaque push sur `master`
- **Repo:** https://github.com/steohidy/my-project

---

## 📝 Notes pour le futur

1. **Ajouter utilisateur:** Via panneau admin (connecté en admin)
2. **Prolonger validité:** Panneau admin → bouton "Ajouter temps"
3. **Vérifier sessions:** Fichier `data/users.json` → `activeSessions`
4. **Logs d'activité:** Fichier `data/users.json` → `logs`
