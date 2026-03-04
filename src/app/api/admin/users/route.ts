import { NextRequest, NextResponse } from 'next/server';
import {
  getAllUsers,
  getUserStats,
  extendUserValidity,
  deactivateUser,
  reactivateUser,
  addUser,
  updateUser,
  deleteUser
} from '@/lib/users';

/**
 * Vérifie si l'utilisateur est admin
 */
function isAdmin(request: NextRequest): boolean {
  const sessionData = request.cookies.get('steo_elite_session_data');
  if (!sessionData) return false;

  try {
    const data = JSON.parse(decodeURIComponent(sessionData.value));
    return data.role === 'admin';
  } catch {
    return false;
  }
}

/**
 * GET - Récupérer tous les utilisateurs (admin uniquement)
 */
export async function GET(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
  }

  const users = getAllUsers();
  const stats = getUserStats();

  return NextResponse.json({
    users,
    stats
  });
}

/**
 * POST - Actions sur les utilisateurs (admin uniquement)
 */
export async function POST(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, login, data } = body;

    switch (action) {
      case 'extend':
        // Prolonger la validité
        const months = data?.months || 1;
        if (extendUserValidity(login, months)) {
          return NextResponse.json({
            success: true,
            message: `Validité prolongée de ${months} mois pour ${login}`
          });
        }
        return NextResponse.json({
          success: false,
          error: 'Impossible de prolonger ce compte'
        }, { status: 400 });

      case 'deactivate':
        if (deactivateUser(login)) {
          return NextResponse.json({
            success: true,
            message: `Compte ${login} désactivé`
          });
        }
        return NextResponse.json({
          success: false,
          error: 'Impossible de désactiver ce compte'
        }, { status: 400 });

      case 'reactivate':
        if (reactivateUser(login)) {
          return NextResponse.json({
            success: true,
            message: `Compte ${login} réactivé`
          });
        }
        return NextResponse.json({
          success: false,
          error: 'Impossible de réactiver ce compte'
        }, { status: 400 });

      case 'add':
        // Ajouter un nouvel utilisateur
        if (!data?.login || !data?.password) {
          return NextResponse.json({
            success: false,
            error: 'Login et mot de passe requis'
          }, { status: 400 });
        }
        if (addUser({
          login: data.login,
          password: data.password,
          role: data.role || 'user',
          isActive: true
        })) {
          return NextResponse.json({
            success: true,
            message: `Utilisateur ${data.login} créé`
          });
        }
        return NextResponse.json({
          success: false,
          error: 'Cet identifiant existe déjà'
        }, { status: 400 });

      case 'update':
        // Modifier un utilisateur
        if (updateUser(login, data)) {
          return NextResponse.json({
            success: true,
            message: `Utilisateur ${login} modifié`
          });
        }
        return NextResponse.json({
          success: false,
          error: 'Impossible de modifier cet utilisateur'
        }, { status: 400 });

      case 'delete':
        // Supprimer un utilisateur
        if (deleteUser(login)) {
          return NextResponse.json({
            success: true,
            message: `Utilisateur ${login} supprimé`
          });
        }
        return NextResponse.json({
          success: false,
          error: 'Impossible de supprimer cet utilisateur'
        }, { status: 400 });

      default:
        return NextResponse.json({
          success: false,
          error: 'Action inconnue'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Erreur admin:', error);
    return NextResponse.json({
      success: false,
      error: 'Erreur serveur'
    }, { status: 500 });
  }
}
