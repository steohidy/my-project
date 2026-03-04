import { NextResponse } from 'next/server';

// Bankroll simulée pour la démo
let demoBankroll = {
  amount: 100,
  history: [
    { id: 1, type: 'deposit', amount: 100, description: 'Bankroll initiale', date: new Date().toISOString() }
  ]
};

/**
 * GET - Récupérer la bankroll
 */
export async function GET() {
  return NextResponse.json({
    amount: demoBankroll.amount,
    history: demoBankroll.history,
  });
}

/**
 * POST - Mettre à jour la bankroll
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, amount, description } = body;

    if (type === 'deposit') {
      demoBankroll.amount += amount;
    } else if (type === 'withdraw' || type === 'bet') {
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
      amount: demoBankroll.amount,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
