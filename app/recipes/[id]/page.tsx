"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nutrition, setNutrition] = useState<any>(null);
  const [nutritionLoading, setNutritionLoading] = useState(false);
  const [nutritionError, setNutritionError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchRecipe = async () => {
      try {
        const res = await fetch(`/api/recipes/${id}`);
        if (!res.ok) throw new Error("Failed to fetch recipe");
        const data = await res.json();
        setRecipe(data);
      } catch (e: any) {
        setError(e.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchRecipe();
  }, [id]);

  // Nutrition analysis (mocked or call your own API)
  useEffect(() => {
    if (!recipe) return;
    setNutritionLoading(true);
    setNutritionError(null);
    // Call /api/nutrition with the new ingredients array
    const fetchNutrition = async () => {
      try {
        const res = await fetch(`/api/nutrition`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ingredients: recipe.ingredients || [] })
        });
        if (!res.ok) throw new Error("Failed to fetch nutrition");
        const data = await res.json();
        setNutrition(data);
      } catch (e: any) {
        setNutritionError(e.message || "Unknown error");
      } finally {
        setNutritionLoading(false);
      }
    };
    fetchNutrition();
  }, [recipe]);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Button variant="secondary" size="sm" onClick={() => router.back()} className="mb-4">Back</Button>
      {loading && <div>Loading recipe...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {recipe && (
        <Card>
          <CardHeader>
            <CardTitle>{recipe.title || recipe.fields?.Title || "Untitled Recipe"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-2 text-gray-700">{recipe.description || recipe.fields?.Description}</div>
            <div className="mb-2">
              <strong>Ingredients:</strong>
              <ul className="list-disc list-inside">
                {Array.isArray(recipe.recipe_ingredient_quantity_records) && recipe.recipe_ingredient_quantity_records.length > 0 ? (
                  recipe.recipe_ingredient_quantity_records.map((rec: any, i: number) => (
                    <li key={i}>
                      {rec.fields.Quantity} {rec.fields.Unit} (Ingredient ID: {Array.isArray(rec.fields.Ingredient) ? rec.fields.Ingredient[0] : rec.fields.Ingredient})
                    </li>
                  ))
                ) : <li>Aucun ingrédient trouvé.</li>}
              </ul>
            </div>
            <div className="mb-2">
              <strong>Instructions:</strong>
              <ol className="relative border-l-2 border-gray-300 ml-4">
                {Array.isArray(recipe.recipe_instruction_records) && recipe.recipe_instruction_records.length > 0 ? (
                  [...recipe.recipe_instruction_records]
                    .sort((a, b) => (a.fields.Order || 0) - (b.fields.Order || 0))
                    .map((rec, i) => (
                      <li key={i} className="mb-4 ml-4">
                        <span className="absolute -left-6 flex items-center justify-center w-6 h-6 bg-blue-500 text-white rounded-full font-bold">{rec.fields.Order ?? i + 1}</span>
                        <span className="block pl-2">{rec.fields.Instruction}</span>
                      </li>
                    ))
                ) : <li>Aucune instruction trouvée.</li>}
              </ol>
            </div>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
              {(recipe.servings || recipe.fields?.Servings) && <span>Servings: {recipe.servings || recipe.fields?.Servings}</span>}
              {(recipe.prep_time_minutes || recipe.fields?.PrepTimeMinutes) && <span>Prep: {recipe.prep_time_minutes || recipe.fields?.PrepTimeMinutes} min</span>}
              {(recipe.cook_time_minutes || recipe.fields?.CookTimeMinutes) && <span>Cook: {recipe.cook_time_minutes || recipe.fields?.CookTimeMinutes} min</span>}
            </div>
            {/* Nutrition Analysis Section */}
            <div className="mt-6">
              <Card className="bg-slate-50">
                <CardHeader>
                  <CardTitle>Nutrition Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  {nutritionLoading && <div>Loading nutrition...</div>}
                  {nutritionError && <div className="text-red-600">{nutritionError}</div>}
                  {nutrition && (
                    <div className="space-y-2">
                      <div><strong>Calories:</strong> {nutrition.calories} kcal</div>
                      <div><strong>Protein:</strong> {nutrition.protein} g</div>
                      <div><strong>Carbs:</strong> {nutrition.carbs} g</div>
                      <div><strong>Fat:</strong> {nutrition.fat} g</div>
                      {nutrition.vitamins && <div><strong>Vitamins:</strong> {nutrition.vitamins}</div>}
                      {nutrition.minerals && <div><strong>Minerals:</strong> {nutrition.minerals}</div>}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 