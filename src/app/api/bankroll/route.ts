import { NextResponse } from 'next/server';

// Bankroll - démarre à 0, l'utilisateur entre son capital
let demoBankroll = {
  amount: 0,
  history: [] as any[]
};

/**
 * GET - Récupérer la bankroll
 */
export async function GET() {
  return NextResponse.json({
    balance: demoBankroll.amount,
    transactions: demoBankroll.history,
    stats: {
      totalDeposits: demoBankroll.history
        .filter((h: any) => h.type === 'deposit')
        .reduce((sum: number, h: any) => sum + h.amount, 0),
      totalBets: demoBankroll.history
        .filter((h: any) => h.type === 'bet')
        .reduce((sum: number, h: any) => sum + h.amount, 0),
      totalWinnings: demoBankroll.history
        .filter((h: any) => h.type === 'winning')
        .reduce((sum: number, h: any) => sum + h.amount, 0),
      totalWithdrawals: demoBankroll.history
        .filter((h: any) => h.type === 'withdrawal')
        .reduce((sum: number, h: any) => sum + h.amount, 0),
      profit: demoBankroll.amount - demoBankroll.history
        .filter((h: any) => h.type === 'deposit')
        .reduce((sum: number, h: any) => sum + h.amount, 0),
      roi: calculateROI(),
    },
  });
}

function calculateROI(): number {
  const totalDeposits = demoBankroll.history
    .filter((h: any) => h.type === 'deposit')
    .reduce((sum: number, h: any) => sum + h.amount, 0);
  if (totalDeposits === 0) return 0;
  const profit = demoBankroll.amount - totalDeposits;
  return (profit / totalDeposits) * 100;
}

/**
 * POST - Mettre à jour la bankroll
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, amount, description, action } = body;

    // Action de réinitialisation
    if (action === 'reset') {
      demoBankroll = {
        amount: 0,
        history: []
      };
      return NextResponse.json({
        success: true,
        message: 'Bankroll réinitialisée',
        balance: 0,
      });
    }

    if (type === 'deposit') {
      demoBankroll.amount += amount;
    } else if (type === 'withdrawal' || type === 'bet') {
      demoBankroll.amount -= amount;
    } else if (type === 'winning') {
      demoBankroll.amount += amount;
    }

    demoBankroll.history.unshift({
      id: Date.now(),
      type,
      amount,
      description,
      date: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      balance: demoBankroll.amount,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
