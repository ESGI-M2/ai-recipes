import { NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { z } from 'zod';

export const runtime = 'edge';

const nutritionSchema = z.object({
  calories: z.number().min(0).max(5000).describe("Calories totales en kcal"),
  protein: z.number().min(0).max(200).describe("Protéines en grammes"),
  carbs: z.number().min(0).max(500).describe("Glucides en grammes"),
  fat: z.number().min(0).max(200).describe("Lipides en grammes"),
  fiber: z.number().min(0).max(100).describe("Fibres en grammes"),
  sugar: z.number().min(0).max(200).describe("Sucres en grammes"),
  sodium: z.number().min(0).max(5000).describe("Sodium en mg"),
  vitamins: z.object({
    A: z.number().min(0).max(10000).optional().describe("Vitamine A en µg"),
    C: z.number().min(0).max(1000).optional().describe("Vitamine C en mg"),
    D: z.number().min(0).max(100).optional().describe("Vitamine D en µg"),
    E: z.number().min(0).max(100).optional().describe("Vitamine E en mg"),
    K: z.number().min(0).max(1000).optional().describe("Vitamine K en µg"),
    B1: z.number().min(0).max(10).optional().describe("Vitamine B1 en mg"),
    B2: z.number().min(0).max(10).optional().describe("Vitamine B2 en mg"),
    B3: z.number().min(0).max(100).optional().describe("Vitamine B3 en mg"),
    B6: z.number().min(0).max(10).optional().describe("Vitamine B6 en mg"),
    B12: z.number().min(0).max(100).optional().describe("Vitamine B12 en µg"),
    folate: z.number().min(0).max(1000).optional().describe("Folate en µg")
  }).describe("Vitamines présentes"),
  minerals: z.object({
    calcium: z.number().min(0).max(2000).optional().describe("Calcium en mg"),
    iron: z.number().min(0).max(100).optional().describe("Fer en mg"),
    magnesium: z.number().min(0).max(1000).optional().describe("Magnésium en mg"),
    phosphorus: z.number().min(0).max(2000).optional().describe("Phosphore en mg"),
    potassium: z.number().min(0).max(5000).optional().describe("Potassium en mg"),
    zinc: z.number().min(0).max(50).optional().describe("Zinc en mg"),
    copper: z.number().min(0).max(10).optional().describe("Cuivre en mg"),
    manganese: z.number().min(0).max(10).optional().describe("Manganèse en mg"),
    selenium: z.number().min(0).max(200).optional().describe("Sélénium en µg")
  }).describe("Minéraux présents"),
  nutrition_notes: z.string().min(10).max(500).describe("Notes nutritionnelles en français")
});

export async function POST(req: Request) {
  try {
    const { ingredients, servings, recipeTitle } = await req.json();
    
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
        model: 'gpt-4-turbo',
        temperature: 0.1,
      }),
      tools: [],
      responseFormat: nutritionSchema,
    });

    const ingredientsList = ingredients.map((ing: { name: string; quantity: number; unit: string }) => 
      `${ing.name}: ${ing.quantity} ${ing.unit}`
    ).join(', ');

    const prompt = `Tu es un nutritionniste expert français. Analyse la valeur nutritionnelle de cette recette avec PRÉCISION.

    INGRÉDIENTS : ${ingredientsList}
    PORTIONS : ${servings} personne(s)
    RECETTE : ${recipeTitle || 'Recette'}

    RÈGLES STRICTES D'ANALYSE :
    1. Calcule les valeurs nutritionnelles pour ${servings} portion(s) EXACTEMENT
    2. Utilise UNIQUEMENT des données nutritionnelles standardisées et vérifiées
    3. Inclus TOUTES les vitamines et minéraux présents (même si 0)
    4. Donne des notes nutritionnelles précises et factuelles en français
    5. Adapte les quantités proportionnellement au nombre de portions

    DONNÉES NUTRITIONNELLES DE RÉFÉRENCE (pour 100g) :
    - Pomme : 52 kcal, 0.3g protéines, 14g glucides, 0.2g lipides, 2.4g fibres
    - Banane : 89 kcal, 1.1g protéines, 23g glucides, 0.3g lipides, 2.6g fibres
    - Poulet (blanc) : 165 kcal, 31g protéines, 0g glucides, 3.6g lipides
    - Riz cuit : 130 kcal, 2.7g protéines, 28g glucides, 0.3g lipides
    - Tomate : 18 kcal, 0.9g protéines, 3.9g glucides, 0.2g lipides, 1.2g fibres
    - Fromage (type emmental) : 402 kcal, 28g protéines, 1.3g glucides, 32g lipides
    - Carotte : 41 kcal, 0.9g protéines, 10g glucides, 0.2g lipides, 2.8g fibres
    - Citron : 29 kcal, 1.1g protéines, 9g glucides, 0.3g lipides, 2.8g fibres
    - Persil : 36 kcal, 3g protéines, 6g glucides, 0.8g lipides, 3.3g fibres
    - Chocolat noir : 546 kcal, 4.9g protéines, 61g glucides, 31g lipides

    CALCULS REQUIS (avec précision) :
    - Calories totales (kcal) : somme des calories de tous les ingrédients
    - Macronutriments : protéines, glucides, lipides (g) - additionner les valeurs
    - Micronutriments : fibres, sucres, sodium (mg) - additionner les valeurs
    - Vitamines : A, C, D, E, K, B1, B2, B3, B6, B12, folate - additionner les valeurs
    - Minéraux : calcium, fer, magnésium, phosphore, potassium, zinc, cuivre, manganèse, sélénium - additionner les valeurs

    CONTRAINTES DE CALCUL :
    - Multiplier les valeurs par (quantité en g / 100) pour chaque ingrédient
    - Additionner toutes les valeurs pour obtenir le total
    - Multiplier par le nombre de portions (${servings})
    - Arrondir à 1 décimale pour les macronutriments, 0 décimale pour les vitamines/minéraux
    - Si un ingrédient n'est pas dans la liste de référence, utiliser des valeurs moyennes réalistes

    Réponds UNIQUEMENT en JSON valide, sans texte supplémentaire.`;

    const result = await agent.invoke({
      messages: [{ type: 'human', content: prompt }]
    });

    return NextResponse.json(result.structuredResponse);
  } catch (error) {
    return NextResponse.json({ error: (error as Error)?.message || 'Erreur inconnue' }, { status: 500 });
  }
} 