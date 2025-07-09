import { NextResponse } from 'next/server';
import { getRecords, getRecord } from '@/lib/axios';
import { AirtableTables } from '@/constants/airtable';

// Define types for Airtable records
interface AirtableRecord {
  id: string;
  createdTime?: string;
  fields?: Record<string, unknown>;
}

interface IngredientRecord extends AirtableRecord {
  fields?: {
    Name?: string;
  };
}

interface JoinRecord extends AirtableRecord {
  fields?: {
    Recipe?: string[];
    Ingredient?: string[];
    Quantity?: number | string;
    Unit?: string;
    Identifier?: number;
  };
}

interface InstructionRecord extends AirtableRecord {
  fields?: {
    Recipe?: string[];
    Instruction?: string;
    Order?: number;
  };
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    // Fetch the recipe
    const recipe = await getRecord(AirtableTables.RECIPES, params.id);

    // Fetch all join records for this recipe (ingredients)
    const ingredientJoins = await getRecords(AirtableTables.RECIPE_INGREDIENT_QUANTITY) as JoinRecord[];
    const recipeIngredientJoins = ingredientJoins.filter(
      (jr: JoinRecord) => Array.isArray(jr.fields?.Recipe) && jr.fields.Recipe.includes(params.id)
    );

    // Fetch all ingredients to get their names
    const allIngredients = await getRecords(AirtableTables.INGREDIENTS) as IngredientRecord[];
    const ingredientMap = Object.fromEntries(
      allIngredients.map((ing: IngredientRecord) => [ing.id, ing.fields?.Name || ing.id])
    );

    // Fetch all join records for this recipe (instructions)
    const instructionJoins = await getRecords(AirtableTables.RECIPE_INSTRUCTIONS) as InstructionRecord[];
    const recipeInstructionJoins = instructionJoins.filter(
      (ir: InstructionRecord) => Array.isArray(ir.fields?.Recipe) && ir.fields.Recipe.includes(params.id)
    );

    // Add ingredient names to the ingredient join records
    const recipeIngredientJoinsWithNames = recipeIngredientJoins.map((join: JoinRecord) => {
      const ingredientId = Array.isArray(join.fields?.Ingredient) ? join.fields.Ingredient[0] : join.fields?.Ingredient;
      return {
        ...join,
        ingredientName: ingredientId ? ingredientMap[ingredientId] || `Ingrédient ${join.fields?.Identifier}` : `Ingrédient ${join.fields?.Identifier}`
      };
    });

    // Return the raw join records with ingredient names
    return NextResponse.json({
      ...recipe,
      recipe_ingredient_quantity_records: recipeIngredientJoinsWithNames,
      recipe_instruction_records: recipeInstructionJoins,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error)?.message || 'Unknown error' }, { status: 500 });
  }
} 