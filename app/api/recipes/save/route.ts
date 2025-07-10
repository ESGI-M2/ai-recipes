import { NextResponse } from 'next/server';
import { createRecord, createRecords, getRecords } from '@/lib/axios';
import { AirtableTables } from '@/constants/airtable';

export async function POST(req: Request) {
  try {
    const { recipe } = await req.json();

    console.log('recipe', recipe);
    
    if (!recipe) {
      return NextResponse.json({ error: 'Recipe is required' }, { status: 400 });
    }
    // Map recipe fields to Airtable fields (remove Ingredients)
    const fields = {
      Title: recipe.title,
      Description: recipe.description,
      Servings: recipe.servings,
      PrepTimeMinutes: recipe.prep_time_minutes,
      CookTimeMinutes: recipe.cook_time_minutes,
    };
    const created = await createRecord(AirtableTables.RECIPES, fields);

    const allIngredients = await getRecords(AirtableTables.INGREDIENTS);
    const validIngredientIds = new Set(
      (allIngredients as { id: string }[]).map((ing) => ing.id)
    );

    const filteredIngredients = Array.isArray(recipe.ingredients)
      ? recipe.ingredients.filter((ingredient: { id: string }) => validIngredientIds.has(ingredient.id))
      : [];

    if (filteredIngredients.length > 0) {
      const joinRecords = filteredIngredients
        .map((ingredient: { id: string; quantity: number; unit: string }) => ({
          Recipe: [created.id],
          Ingredient: [ingredient.id],
          Quantity: ingredient.quantity,
          Unit: ingredient.unit,
        }));
      
        if (joinRecords.length !== filteredIngredients.length) {
        console.warn('Certains ingrédients de la recette n&apos;existent pas dans Airtable et ont été ignorés:', recipe.ingredients.filter((ingredient: { id: string }) => !validIngredientIds.has(ingredient.id)));
      }
      if (joinRecords.length > 0) {
        try {
          await createRecords(AirtableTables.RECIPE_INGREDIENT_QUANTITY, joinRecords);
        } catch (err) {
          console.error('Error creating join records:', err, joinRecords);
          return NextResponse.json({ error: 'Failed to save recipe ingredients', details: err }, { status: 500 });
        }
      }
    }

    // Save instructions to join table
    if (Array.isArray(recipe.instructions) && recipe.instructions.length > 0) {
      const instructionRecords = recipe.instructions.map((inst: { text: string; order: number }) => ({
        Instruction: inst.text,
        Order: inst.order,
        Recipe: [created.id],
      }));
      await createRecords(AirtableTables.RECIPE_INSTRUCTIONS, instructionRecords);
    }
    return NextResponse.json(created);
  } catch (error) {
    let message = 'Unknown error';
    if (error instanceof Error) {
      message = error.message;
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
} 