import { NextResponse } from 'next/server';
import { createRecord, createRecords, getRecords } from '@/lib/axios';
import { AirtableTables } from '@/constants/airtable';

export async function POST(req: Request) {
  try {
    const { recipe } = await req.json();
    
    if (!recipe) {
      return NextResponse.json({ error: 'La recette est obligatoire' }, { status: 400 });
    }

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
          console.warn('Certains ingrédients de la recette n\'existent pas dans Airtable et ont été ignorés:', recipe.ingredients.filter((ingredient: { id: string }) => !validIngredientIds.has(ingredient.id)));
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

    if (Array.isArray(recipe.instructions) && recipe.instructions.length > 0) {
      const instructionRecords = recipe.instructions.map((inst: { text: string; order: number }) => ({
        Instruction: inst.text,
        Order: inst.order,
        Recipe: [created.id],
      }));
      await createRecords(AirtableTables.RECIPE_INSTRUCTIONS, instructionRecords);
    }

    if (Array.isArray(recipe.intolerances) && recipe.intolerances.length > 0) {
      const allIntolerances = await getRecords(AirtableTables.FOOD_INTOLERANCES);
      const validIntoleranceIds = new Set((allIntolerances as { id: string }[]).map((intol) => intol.id));
      const filteredIntolerances = recipe.intolerances.filter((id: string) => validIntoleranceIds.has(id));
      if (filteredIntolerances.length > 0) {
        const { updateRecord } = await import('@/lib/axios');
        for (const intoleranceId of filteredIntolerances) {
          const intolerance = (allIntolerances as any[]).find((i) => i.id === intoleranceId);
          const currentRelated = intolerance?.fields?.['Related Recipes'] || [];
          const updatedRelated = Array.isArray(currentRelated)
            ? Array.from(new Set([...currentRelated, created.id]))
            : [created.id];
          await updateRecord(AirtableTables.FOOD_INTOLERANCES, intoleranceId, { 'Related Recipes': updatedRelated });
        }
      }
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