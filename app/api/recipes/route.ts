import { NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { z } from 'zod';
import { getRecords } from '@/lib/axios';
import { AirtableTables } from '@/constants/airtable';

export const runtime = 'edge';

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
    });
    // Fetch all join records
    const joinRecords = await getRecords(AirtableTables.RECIPE_INGREDIENT_QUANTITY);
    // Fetch all ingredients
    const ingredientsTable = await getRecords(AirtableTables.INGREDIENTS);
    // Map ingredient ID to name
    const ingredientMap = Object.fromEntries(
      ingredientsTable.map((ing: any) => [ing.id, ing.fields?.Name || ing.id])
    );
    // Fetch all instructions
    const instructionsTable = await getRecords(AirtableTables.RECIPE_INSTRUCTIONS);
    // For each recipe, attach its ingredients and instructions
    const recipesWithIngredients = recipes.map((recipe: any) => {
      const recipeIngredients = joinRecords.filter((jr: any) => {
        return Array.isArray(jr.fields?.Recipe) && jr.fields.Recipe.includes(recipe.id);
      }).map((jr: any) => {
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
          name: ingredientMap[ingredientId] || '',
          quantity,
          unit,
        };
      });
      // Fetch and order instructions for this recipe
      const recipeInstructions = instructionsTable
        .filter((inst: any) => Array.isArray(inst.fields?.Recipe) && inst.fields.Recipe.includes(recipe.id))
        .sort((a: any, b: any) => (a.fields?.Order || 0) - (b.fields?.Order || 0))
        .map((inst: any) => ({ text: inst.fields?.Instruction || '', order: inst.fields?.Order || 0 }));
      return {
        ...recipe,
        ingredients: recipeIngredients,
        instructions: recipeInstructions,
      };
    });
    return NextResponse.json(recipesWithIngredients);
  } catch (error) {
    return NextResponse.json({ error: (error as any)?.message || 'Erreur inconnue' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { ingredients, intolerances } = await req.json();
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
        temperature: 0.7,
        maxTokens: 1200,
      }),
      tools: [],
      responseFormat: recipesSchema,
    });

    // Correction : transmettre la liste complète des ingrédients (id, name) et demander d'utiliser exactement ces noms
    const ingredientListJson = JSON.stringify(ingredients);
    let prompt = `Tu dois répondre uniquement en français. En utilisant UNIQUEMENT les ingrédients suivants, génère une ou plusieurs recettes délicieuses, communes et françaises. Privilégie des recettes traditionnelles ou populaires en France, qui existent réellement et sont reconnues. N'invente pas de recettes ou d'ingrédients qui n'existent pas. Tu dois absolument utiliser uniquement les ingrédients fournis en entrée. Aucun autre ingrédient ne doit apparaître dans la recette. Voici la liste des ingrédients disponibles (format JSON) : ${ingredientListJson}
Pour chaque ingrédient utilisé dans la recette, tu dois renvoyer l'objet complet {id, name} tel qu'il apparaît dans cette liste, en plus de la quantité et de l'unité. Tu ne dois jamais inventer d'id ou de nom. Les instructions doivent être renvoyées sous forme d'un tableau d'objets, chaque objet ayant les champs {text, order} (texte de l'étape, ordre à partir de 1). Réponds UNIQUEMENT en JSON valide, sans markdown, sans texte supplémentaire. Le JSON doit être un objet avec une propriété 'recipes' contenant un tableau d'objets recette. Pour chaque recette, le champ 'ingredients' doit être un tableau d'objets avec 'id' (chaîne, identique à la liste ci-dessus), 'name' (chaîne, identique à la liste ci-dessus), 'quantity' (nombre), et 'unit' (chaîne, ex : "g", "kg", "tasse", "c.à.c."). Le champ 'instructions' doit être un tableau d'objets {text, order}. Le champ 'servings' doit toujours être 1.`;
    prompt += `\nChaque recette doit être pour 1 personne. Le champ 'servings' doit toujours être 1.`;
    if (Array.isArray(intolerances) && intolerances.length > 0) {
      prompt += `\nÉvite d'utiliser ces ingrédients à cause des intolérances : ${intolerances.map((i: any) => typeof i === 'object' ? i.name : i).join(", ")}.`;
    }

    const result = await agent.invoke({
      messages: [{ type: 'human', content: prompt }]
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as any)?.message || 'Erreur inconnue' }, { status: 500 });
  }
} 