import { NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { z } from 'zod';
import { getRecords } from '@/lib/axios';
import { AirtableTables } from '@/constants/airtable';

export const runtime = 'edge';

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

const missingIngredientObjectSchema = z.object({
  name: z.string().describe("Nom de l'ingrédient manquant (non fourni dans la liste d'entrée)"),
  quantity: z.number().describe("Quantité de l'ingrédient manquant"),
  unit: z.string().describe("Unité de l'ingrédient manquant"),
});

const recipeSchema = z.object({
  title: z.string().describe("Nom de la recette."),
  ingredients: z.array(ingredientObjectSchema).describe("Liste d'ingrédients, chaque ingrédient avec nom, quantité (nombre) et unité (chaîne). N'utiliser que les ingrédients fournis."),
  missing_ingredients: z.array(missingIngredientObjectSchema).optional().describe("Liste des ingrédients manquants nécessaires à la recette, non présents dans la liste d'entrée. Peut être vide ou absent si aucun ingrédient manquant."),
  instructions: z.array(instructionObjectSchema).describe("Liste d'instructions, chaque instruction est un objet avec texte et ordre."),
  description: z.string().describe("Courte description de la recette."),
  servings: z.number().describe("Nombre de portions de la recette. Toujours 1."),
  prep_time_minutes: z.number().describe("Temps de préparation en minutes."),
  cook_time_minutes: z.number().describe("Temps de cuisson en minutes."),
});
const recipesSchema = z.object({
  recipes: z.array(recipeSchema)
});

export async function GET() {
  try {
    const recipes = await getRecords(AirtableTables.RECIPES, {
      sort: [{ field: 'Title', direction: 'asc' }],
    }) as RecipeRecord[];
    const joinRecords = await getRecords(AirtableTables.RECIPE_INGREDIENT_QUANTITY) as JoinRecord[];
    const ingredientsTable = await getRecords(AirtableTables.INGREDIENTS) as IngredientRecord[];
    const ingredientMap = Object.fromEntries(
      ingredientsTable.map((ing: IngredientRecord) => [ing.id, ing.fields?.Name || ing.id])
    );
    const instructionsTable = await getRecords(AirtableTables.RECIPE_INSTRUCTIONS) as InstructionRecord[];
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
    
    if (typeof servings !== 'number' || servings <= 0) {
      return NextResponse.json({ error: 'Le nombre de portions doit être un nombre positif.' }, { status: 400 });
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

    const prompt = `Tu es un chef culinaire français expert. Tu dois TOUJOURS répondre en français.

    LANGUE OBLIGATOIRE : Français uniquement
    - Tous les titres de recettes en français
    - Toutes les descriptions en français
    - Toutes les instructions en français
    - Tous les noms d'ingrédients en français

    Crée 3-10 recettes délicieuses en utilisant UNIQUEMENT les ingrédients alimentaires fournis. Si les ingrédients fournis ne suffisent pas pour une recette cohérente, tu peux ajouter des ingrédients supplémentaires nécessaires. Dans ce cas, liste ces ingrédients supplémentaires dans le champ "missing_ingredients" de la recette générée, avec leur nom, quantité et unité. Les ingrédients du champ "ingredients" doivent TOUJOURS être issus de la liste d'entrée. Les ingrédients du champ "missing_ingredients" ne doivent JAMAIS être dans la liste d'entrée.

    NOMBRE DE RECETTES :
    - Génère 3 recettes minimum
    - Génère jusqu'à 10 recettes maximum
    - Adapte le nombre selon la créativité possible avec les ingrédients
    - Plus d'ingrédients = plus de recettes possibles
    - Varie les styles : entrées, plats, desserts, boissons, snacks

    ⚠️ RÈGLE ABSOLUE : Utilise SEULEMENT des ingrédients comestibles/alimentaires !
    - IGNORE complètement tout ingrédient qui n'est pas de la nourriture
    - N'utilise que les fruits, légumes, viandes, poissons, céréales, épices, produits laitiers, etc.
    - Si un ingrédient n'est pas comestible, ne l'utilise PAS dans tes recettes

    CONTRAINTES STRICTES :
    - Utilise UNIQUEMENT les ingrédients alimentaires fournis dans le champ "ingredients"
    - N'ajoute AUCUN ingrédient supplémentaire dans "ingredients"
    - Si tu ajoutes des ingrédients nécessaires, liste-les dans "missing_ingredients" (nom, quantité, unité)
    - Respecte les intolérances : ${Array.isArray(intolerances) && intolerances.length > 0 ? intolerances.map((i: unknown) => typeof i === 'object' && i !== null && 'name' in i ? (i as { name: string }).name : i).join(", ") : "aucune"}
    - Portions : ${servings} personne(s) par recette

    INGRÉDIENTS DISPONIBLES : ${ingredientListJson}

    RÈGLES DE CRÉATION :
    1. Utilise SEULEMENT des ingrédients comestibles/alimentaires dans "ingredients"
    2. Si tu ajoutes des ingrédients nécessaires, liste-les dans "missing_ingredients" (nom, quantité, unité)
    3. Varie les techniques culinaires (cru, cuit, mixé, sauté, grillé, rôti, braisé, frit, vapeur)
    4. Propose une grande variété de styles (entrée, plat principal, dessert, boisson, snack, apéritif)
    5. Équilibre les saveurs dans chaque recette
    6. Instructions claires et séquentielles (numérotées à partir de 1)
    7. ⚠️ QUANTITÉS OBLIGATOIRES : Adapte TOUTES les quantités d'ingrédients au nombre de personnes (${servings})
       - Pour ${servings} personne(s), calcule les quantités proportionnellement
       - Exemple : si 1 portion = 100g, alors ${servings} portions = ${servings * 100}g
       - Utilise des quantités réalistes et précises pour ${servings} personne(s)
    8. Créativité : Plus il y a d'ingrédients, plus tu peux être créatif et proposer de recettes

    FORMAT JSON EXACT ATTENDU :
    {
      "recipes": [
        {
          "title": "Nom de la recette",
          "ingredients": [
            {
              "id": "ID_ingredient",
              "name": "Nom ingredient",
              "quantity": 1,
              "unit": "portion"
            }
          ],
          "missing_ingredients": [
            {
              "name": "Nom ingrédient manquant",
              "quantity": 1,
              "unit": "g"
            }
          ],
          "instructions": [
            {
              "text": "Description de l'étape",
              "order": 1
            },
            {
              "text": "Description de l'étape suivante",
              "order": 2
            }
          ],
          "description": "Description courte de la recette",
          "servings": ${servings},
          "prep_time_minutes": 15,
          "cook_time_minutes": 30
        }
      ]
    }

    CHAMPS OBLIGATOIRES POUR CHAQUE RECETTE :
    - title : nom de la recette (string)
    - ingredients : array d'objets avec id, name, quantity (number), unit (string)
      ⚠️ IMPORTANT : Les quantités doivent être calculées pour ${servings} personne(s)
    - missing_ingredients : array d'objets (nom, quantité, unité) si besoin, sinon [] ou absent
    - instructions : array d'objets avec text (string) et order (number) OBLIGATOIRE
      ⚠️ CRUCIAL : Chaque instruction DOIT avoir un champ "order" commençant à 1 et s'incrémentant
    - description : description courte (string)
    - servings : ${servings} (number)
    - prep_time_minutes : temps préparation en minutes (number)
    - cook_time_minutes : temps cuisson en minutes (number)

    ⚠️ ATTENTION : Chaque instruction dans le tableau "instructions" DOIT avoir un champ "order" avec un numéro séquentiel (1, 2, 3, etc.). Ne jamais oublier ce champ !

    EXEMPLES DE BONNES PRATIQUES (en français) :
    - Avec pomme + banane → Smoothie pomme-banane + Compote de fruits mixés
    - Avec poulet + carotte → Poulet sauté aux carottes + Salade de poulet
    - Avec tomate + mozzarella (si mozzarella manquante) → Salade caprese (mozzarella dans missing_ingredients)

    RÉPONSE FINALE :
    - Réponds UNIQUEMENT en JSON valide
    - TOUT en français (titres, descriptions, instructions)
    - Sans texte supplémentaire`;

    const result = await agent.invoke({
      messages: [{ type: 'human', content: prompt }]
    });

    try {
      // Retourner les recettes sans analyse nutritionnelle automatique
      const result = await agent.invoke({messages: [{ type: 'human', content: prompt }]});      
      return NextResponse.json({ recipes: result.structuredResponse?.recipes || [] });
    } catch (e) {
      return NextResponse.json({ error: "Erreur d'analyse ou réponse invalide", details: e }, { status: 500 });
    }
    
  } catch (error) {
    return NextResponse.json({ error: (error as Error)?.message || 'Erreur inconnue' }, { status: 500 });
  }
} 