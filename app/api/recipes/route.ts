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
        temperature: 0.7,
        maxTokens: 1200,
      }),
      tools: [],
      responseFormat: recipesSchema,
    });

    // Correction : transmettre la liste complète des ingrédients (id, name) et demander d'utiliser exactement ces noms
    const ingredientListJson = JSON.stringify(ingredients);
    let prompt = `Contexte
Tu es un assistant culinaire francophone chargé de proposer des recettes françaises authentiques.

Je te fournis :
- Une liste d'ingrédients disponibles (format JSON, propriétés id et name).
- Des intolérances (ex. lactose, gluten, fruits à coque).

Objectif : Générer une ou plusieurs recettes (pour ${servings} personne(s) chacune) utilisant uniquement les ingrédients fournis et aucun autre. Les recettes doivent être reconnues en France ; n'invente ni recettes, ni ingrédients.

Règles absolues
- Langue : réponds uniquement en français.
- Vérification des intolérances : écarte tout ingrédient contenant un composant interdit. Si aucun ingrédient compatible ne reste, réponds avec un objet JSON {"error":"Aucune recette possible avec les intolérances données."}.
- Structure JSON obligatoire (sans Markdown, ni texte hors JSON).
- Ordre et granularité des étapes :
  * Les étapes sont séquentielles et obligatoires ; ne saute rien.
  * Chaque étape décrit une seule action culinaire majeure (préparer, couper, chauffer, servir…).
  * Numérote-les via le champ order, en partant de 1 et en incrémentant de 1 ; aucun doublon ni saut de numéro.
- Champ ingredients : tableau d'objets {id, name, quantity, unit} où id et name doivent correspondre exactement à la liste fournie.
- Champ instructions : tableau d'objets {text, order} conformément à la règle 4.
- Champ servings : toujours la valeur ${servings}.
- Ajuster les quantités d'ingrédients proportionnellement au nombre de portions.
- Ajuster les temps de préparation et de cuisson en fonction du nombre de portions (légèrement plus long pour plus de portions).
- Aucun champ supplémentaire n'est autorisé.

RÈGLE CRITIQUE - INGRÉDIENTS STRICTEMENT LIMITÉS :
- Tu ne peux utiliser QUE les ingrédients fournis dans la liste.
- Tu ne peux PAS inventer, suggérer, ou utiliser d'autres ingrédients.
- Si une recette nécessite des ingrédients supplémentaires (farine, œufs, lait, etc.), tu ne peux PAS la proposer.
- Exemples d'erreurs à éviter :
  * Si on te donne seulement "banane", ne propose PAS de "pain à la banane" (nécessite farine, œufs, etc.)
  * Si on te donne seulement "pomme", ne propose PAS de "tarte aux pommes" (nécessite pâte, sucre, etc.)
  * Si on te donne seulement "poulet", ne propose PAS de "poulet rôti" (nécessite huile, épices, etc.)
- Propose uniquement des recettes qui peuvent être réalisées avec les ingrédients fournis, sans ajout.
- Si les ingrédients sont insuffisants pour une recette complète, propose des préparations simples (salade, compote, etc.)

RÈGLE CRITIQUE - INSTRUCTIONS STRICTEMENT LIMITÉES :
- Dans les instructions, tu ne peux mentionner QUE les ingrédients fournis dans la liste.
- Tu ne peux PAS mentionner d'autres ingrédients dans les instructions (glace, chantilly, sauce, épices, etc.)
- Exemples d'erreurs dans les instructions à éviter :
  * "Ajouter de la glace vanille" (glace non fournie)
  * "Napper de sauce chocolat" (sauce non fournie)
  * "Ajouter de la chantilly" (chantilly non fournie)
  * "Saler et poivrer" (sel et poivre non fournis)
  * "Ajouter des épices" (épices non fournies)
  * "Verser de l'huile" (huile non fournie)
- Les instructions doivent décrire uniquement la manipulation des ingrédients fournis.
- Si un ingrédient n'est pas dans la liste fournie, il ne doit PAS apparaître dans les instructions.

Ingrédients disponibles : ${ingredientListJson}`;

    if (Array.isArray(intolerances) && intolerances.length > 0) {
      prompt += `\n\nIntolérances à respecter : ${intolerances.map((i: any) => typeof i === 'object' ? i.name : i).join(", ")}.`;
    }

    prompt += `\n\nRéponds UNIQUEMENT en JSON valide avec la structure suivante :
{
  "recipes": [
    {
      "title": "Nom de la recette",
      "description": "Description courte",
      "ingredients": [
        {"id": "exact_id_from_list", "name": "exact_name_from_list", "quantity": 100, "unit": "g"}
      ],
      "instructions": [
        {"text": "Première étape", "order": 1},
        {"text": "Deuxième étape", "order": 2}
      ],
      "servings": ${servings},
      "prep_time_minutes": 10,
      "cook_time_minutes": 15
    }
  ]
}`;

    // Add specific instructions for servings adjustment
    if (servings > 1) {
      prompt += `\n\nIMPORTANT - Ajustement pour ${servings} portions :
      - Multiplier les quantités d'ingrédients par ${servings}
      - Augmenter légèrement les temps de préparation et cuisson (ex: +2-3 min pour 2 portions, +5-8 min pour 4 portions)
      - Maintenir les proportions et équilibres de la recette`;
    }

    const result = await agent.invoke({
      messages: [{ type: 'human', content: prompt }]
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as any)?.message || 'Erreur inconnue' }, { status: 500 });
  }
} 