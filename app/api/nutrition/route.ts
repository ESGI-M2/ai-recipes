import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { ingredients } = await req.json();
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json({ error: 'Ingredients are required' }, { status: 400 });
    }
    // Mocked nutrition analysis (replace with real API if needed)
    const nutrition = {
      calories: 350 + ingredients.length * 50,
      protein: 10 + ingredients.length * 2,
      carbs: 40 + ingredients.length * 3,
      fat: 15 + ingredients.length * 1.5,
      vitamins: 'A, C, D',
      minerals: 'Calcium, Iron, Magnesium',
    };
    return NextResponse.json(nutrition);
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
} 