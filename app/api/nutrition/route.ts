import { NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { z } from 'zod';

export const runtime = 'edge';

const nutritionSchema = z.object({
  calories: z.number().min(0).describe("Calories totales de la recette"),
  protein: z.number().min(0).describe("Protéines en grammes"),
  carbs: z.number().min(0).describe("Glucides en grammes"),
  fat: z.number().min(0).describe("Lipides en grammes"),
  fiber: z.number().min(0).describe("Fibres en grammes"),
  sugar: z.number().min(0).describe("Sucres en grammes"),
  sodium: z.number().min(0).describe("Sodium en mg"),
  vitamins: z.object({
    A: z.number().min(0).optional().describe("Vitamine A en µg"),
    C: z.number().min(0).optional().describe("Vitamine C en mg"),
    D: z.number().min(0).optional().describe("Vitamine D en µg"),
    E: z.number().min(0).optional().describe("Vitamine E en mg"),
    K: z.number().min(0).optional().describe("Vitamine K en µg"),
    B1: z.number().min(0).optional().describe("Vitamine B1 (Thiamine) en mg"),
    B2: z.number().min(0).optional().describe("Vitamine B2 (Riboflavine) en mg"),
    B3: z.number().min(0).optional().describe("Vitamine B3 (Niacine) en mg"),
    B6: z.number().min(0).optional().describe("Vitamine B6 en mg"),
    B12: z.number().min(0).optional().describe("Vitamine B12 en µg"),
    folate: z.number().min(0).optional().describe("Folate en µg"),
  }).describe("Vitamines présentes dans la recette"),
  minerals: z.object({
    calcium: z.number().min(0).optional().describe("Calcium en mg"),
    iron: z.number().min(0).optional().describe("Fer en mg"),
    magnesium: z.number().min(0).optional().describe("Magnésium en mg"),
    phosphorus: z.number().min(0).optional().describe("Phosphore en mg"),
    potassium: z.number().min(0).optional().describe("Potassium en mg"),
    zinc: z.number().min(0).optional().describe("Zinc en mg"),
    copper: z.number().min(0).optional().describe("Cuivre en mg"),
    manganese: z.number().min(0).optional().describe("Manganèse en mg"),
    selenium: z.number().min(0).optional().describe("Sélénium en µg"),
  }).describe("Minéraux présents dans la recette"),
  nutrition_notes: z.string().describe("Notes nutritionnelles et conseils"),
});

export async function POST(req: Request) {
  try {
    const { ingredients, servings = 1 } = await req.json();
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json({ error: 'Ingredients are required' }, { status: 400 });
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
        model: 'gpt-4-turbo',
        temperature: 0.1,
      }),
      tools: [],
      responseFormat: nutritionSchema,
    });

    const ingredientList = ingredients.map((ing: { name: string; quantity: number; unit: string }) => `${ing.name}: ${ing.quantity} ${ing.unit}`).join(', ');

    const prompt = `Tu es un nutritionniste expert français. Analyse la valeur nutritionnelle de cette recette.

    INGRÉDIENTS : ${ingredientList}
    PORTIONS : ${servings} personne(s)

    RÈGLES D'ANALYSE :
    1. Calcule les valeurs nutritionnelles pour ${servings} portion(s)
    2. Utilise des données nutritionnelles précises et réalistes
    3. Inclus toutes les vitamines et minéraux présents
    4. Donne des notes nutritionnelles en français
    5. Adapte les quantités selon le nombre de portions

    CALCULS REQUIS :
    - Calories totales (kcal)
    - Macronutriments : protéines, glucides, lipides (g)
    - Micronutriments : fibres, sucres, sodium
    - Vitamines : A, C, D, E, K, B1, B2, B3, B6, B12, folate
    - Minéraux : calcium, fer, magnésium, phosphore, potassium, zinc, cuivre, manganèse, sélénium

    Réponds UNIQUEMENT en JSON valide, sans texte supplémentaire.`;

    const result = await agent.invoke({
      messages: [{ type: 'human', content: prompt }]
    });

    try {
      const result = await agent.invoke({messages: [{ type: 'human', content: prompt }]});
      return NextResponse.json(result);
    } catch (e) {
      return NextResponse.json({ error: "Erreur d'analyse ou réponse invalide", details: e }, { status: 500 });
    }
    
  } catch (error) {
    return NextResponse.json({ error: (error as Error)?.message || 'Erreur inconnue' }, { status: 500 });
  }
} 