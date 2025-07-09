import { NextResponse } from 'next/server';
import { createRecord, createRecords } from '@/lib/axios';
import { AirtableTables } from '@/constants/airtable';

export async function POST(req: Request) {
  try {
    const { recipe } = await req.json();
    
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

    // Save ingredients to join table
    if (Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0) {
      const joinRecords = recipe.ingredients
        .map((ingredient: any) => ({
          Recipe: [created.id],
          Ingredient: [ingredient.id],
          Quantity: ingredient.quantity,
          Unit: ingredient.unit,
        }));
      
        if (joinRecords.length !== recipe.ingredients.length) {
        console.warn('Some ingredients are missing an id and will not be saved to the join table.');
      }
      if (joinRecords.length > 0) {
        try {
          const joinResult = await createRecords(AirtableTables.RECIPE_INGREDIENT_QUANTITY, joinRecords);
        } catch (err) {
          console.error('Error creating join records:', err, joinRecords);
          return NextResponse.json({ error: 'Failed to save recipe ingredients', details: err }, { status: 500 });
        }
      }
    }

    // Save instructions to join table
    if (Array.isArray(recipe.instructions) && recipe.instructions.length > 0) {
      const instructionRecords = recipe.instructions.map((inst: any) => ({
        Instruction: inst.text,
        Order: inst.order,
        Recipe: [created.id],
      }));
      await createRecords(AirtableTables.RECIPE_INSTRUCTIONS, instructionRecords);
    }
    return NextResponse.json(created);
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
} 