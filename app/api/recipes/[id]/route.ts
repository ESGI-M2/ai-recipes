import { NextResponse } from 'next/server';
import { getRecords, getRecord } from '@/lib/axios';
import { AirtableTables } from '@/constants/airtable';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    // Fetch the recipe
    const recipe = await getRecord(AirtableTables.RECIPES, params.id);

    // Fetch all join records for this recipe (ingredients)
    const ingredientJoins = await getRecords(AirtableTables.RECIPE_INGREDIENT_QUANTITY);
    const recipeIngredientJoins = ingredientJoins.filter(
      (jr: any) => Array.isArray(jr.fields?.Recipe) && jr.fields.Recipe.includes(params.id)
    );

    // Fetch all join records for this recipe (instructions)
    const instructionJoins = await getRecords(AirtableTables.RECIPE_INSTRUCTIONS);
    const recipeInstructionJoins = instructionJoins.filter(
      (ir: any) => Array.isArray(ir.fields?.Recipe) && ir.fields.Recipe.includes(params.id)
    );

    // Return the raw join records
    return NextResponse.json({
      ...recipe,
      recipe_ingredient_quantity_records: recipeIngredientJoins,
      recipe_instruction_records: recipeInstructionJoins,
    });
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
} 