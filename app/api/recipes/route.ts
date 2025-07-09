import { NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { z } from 'zod';
import { getRecords } from '@/lib/axios';
import { AirtableTables } from '@/constants/airtable';

export const runtime = 'edge';

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

interface RecipeRecord extends AirtableRecord {
  fields?: {
    Title?: string;
    Description?: string;
    Servings?: number;
    PrepTimeMinutes?: number;
    CookTimeMinutes?: number;
  };
}

interface JoinRecord extends AirtableRecord {
  fields?: {
    Recipe?: string[];
    Ingredient?: string[];
    Quantity?: number | string;
    Unit?: string;
  };
}

interface InstructionRecord extends AirtableRecord {
  fields?: {
    Recipe?: string[];
    Instruction?: string;
    Order?: number;
  };
}

const instructionObjectSchema = z.object({
  text: z.string().describe("Texte de l'instruction (étape)"),
  order: z.number().describe("Ordre de l'instruction dans la recette, à partir de 1"),
});

const ingredientObjectSchema = z.object({
  id: z.string().describe("ID de l'ingrédient (reprendre l'id fourni dans la liste d'entrée)"),
  name: z.string().describe("Nom de l'ingrédient (reprendre le nom fourni dans la liste d'entrée)"),
  quantity: z.number().describe("Quantité de l'ingrédient, en nombre (ex : 100, 2, 0.5)."),
  unit: z.string().describe("Unité pour la quantité, ex : 'g', 'kg', 'tasse', 'c.à.c.', 'ml', etc."),
});

const recipeSchema = z.object({
  title: z.string().describe("Nom de la recette."),
  ingredients: z.array(ingredientObjectSchema).describe("Liste d'ingrédients, chaque ingrédient avec nom, quantité (nombre) et unité (chaîne). N'utiliser que les ingrédients fournis."),
  instructions: z.array(instructionObjectSchema).describe("Liste d'instructions, chaque instruction est un objet avec texte et ordre."),
  description: z.string().describe("Courte description de la recette."),
  servings: z.number().describe("Nombre de portions de la recette. Toujours 1."),
  prep_time_minutes: z.number().describe("Temps de préparation en minutes."),
  cook_time_minutes: z.number().describe("Temps de cuisson en minutes."),
  // removed missing_ingredients
});
const recipesSchema = z.object({
  recipes: z.array(recipeSchema)
});

export async function GET() {
  try {
    // Fetch all recipes
    const recipes = await getRecords(AirtableTables.RECIPES, {
      sort: [{ field: 'Title', direction: 'asc' }],
    }) as RecipeRecord[];
    // Fetch all join records
    const joinRecords = await getRecords(AirtableTables.RECIPE_INGREDIENT_QUANTITY) as JoinRecord[];
    // Fetch all ingredients
    const ingredientsTable = await getRecords(AirtableTables.INGREDIENTS) as IngredientRecord[];
    // Map ingredient ID to name
    const ingredientMap = Object.fromEntries(
      ingredientsTable.map((ing: IngredientRecord) => [ing.id, ing.fields?.Name || ing.id])
    );
    // Fetch all instructions
    const instructionsTable = await getRecords(AirtableTables.RECIPE_INSTRUCTIONS) as InstructionRecord[];
    // For each recipe, attach its ingredients and instructions
    const recipesWithIngredients = recipes.map((recipe: RecipeRecord) => {
      const recipeIngredients = joinRecords.filter((jr: JoinRecord) => {
        return Array.isArray(jr.fields?.Recipe) && jr.fields.Recipe.includes(recipe.id);
      }).map((jr: JoinRecord) => {
        const quantityStr = jr.fields?.Quantity;
        let quantity = 0;
        let unit = '';
        if (typeof quantityStr === 'number') {
          quantity = quantityStr;
        } else if (typeof quantityStr === 'string') {
          const match = quantityStr.match(/([\d.,]+)\s*(.*)/);
          if (match) {
            quantity = parseFloat(match[1].replace(',', '.'));
            unit = match[2].trim();
          }
        }
        const ingredientId = Array.isArray(jr.fields?.Ingredient) ? jr.fields.Ingredient[0] : jr.fields?.Ingredient;
        return {
          id: ingredientId,
          name: ingredientId ? ingredientMap[ingredientId] || '' : '',
          quantity,
          unit,
        };
      });
      // Fetch and order instructions for this recipe
      const recipeInstructions = instructionsTable
        .filter((inst: InstructionRecord) => Array.isArray(inst.fields?.Recipe) && inst.fields.Recipe.includes(recipe.id))
        .sort((a: InstructionRecord, b: InstructionRecord) => (a.fields?.Order || 0) - (b.fields?.Order || 0))
        .map((inst: InstructionRecord) => ({ text: inst.fields?.Instruction || '', order: inst.fields?.Order || 0 }));
      return {
        ...recipe,
        ingredients: recipeIngredients,
        instructions: recipeInstructions,
      };
    });
    return NextResponse.json(recipesWithIngredients);
  } catch (error) {
    return NextResponse.json({ error: (error as Error)?.message || 'Erreur inconnue' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { ingredients, intolerances, servings = 1 } = await req.json();
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json({ error: 'Les ingrédients sont requis' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Clé API OpenAI non définie' }, { status: 500 });
    }

    const agent = createReactAgent({
      llm: new ChatOpenAI({
        openAIApiKey: apiKey,
        model: 'gpt-3.5-turbo',
        temperature: 1.2,
      }),
      tools: [],
      responseFormat: recipesSchema,
    });

    // Correction : transmettre la liste complète des ingrédients (id, name) et demander d'utiliser exactement ces noms
    const ingredientListJson = JSON.stringify(ingredients);

    const prompt = `Tu es un chef culinaire français expert. Crée 2-4 recettes délicieuses en utilisant UNIQUEMENT les ingrédients fournis.

    CONTRAINTES STRICTES :
    - Utilise TOUS les ingrédients fournis au moins une fois
    - N'ajoute AUCUN ingrédient supplémentaire
    - Respecte les intolérances : ${Array.isArray(intolerances) && intolerances.length > 0 ? intolerances.map((i: unknown) => typeof i === 'object' && i !== null && 'name' in i ? (i as { name: string }).name : i).join(", ") : "aucune"}
    - Portions : ${servings} personne(s) par recette

    INGRÉDIENTS DISPONIBLES : ${ingredientListJson}

    RÈGLES DE CRÉATION :
    1. Varie les techniques culinaires (cru, cuit, mixé, sauté, grillé)
    2. Propose des styles différents (entrée, plat, dessert, boisson)
    3. Équilibre les saveurs dans chaque recette
    4. Instructions claires et séquentielles (numérotées à partir de 1)
    5. Quantités adaptées à ${servings} portion(s)

    EXEMPLES DE BONNES PRATIQUES :
    - Avec pomme + banane → Smoothie pomme-banane + Compote fruits mixés
    - Avec poulet + carotte → Poulet sauté aux carottes + Salade de poulet
    - Avec tomate + mozzarella → Salade caprese + Tomates farcies

    Réponds UNIQUEMENT en JSON valide, sans texte supplémentaire.`;

    const result = await agent.invoke({
      messages: [{ type: 'human', content: prompt }]
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error)?.message || 'Erreur inconnue' }, { status: 500 });
  }
} 