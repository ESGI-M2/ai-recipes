import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Define types for ingredient and instruction
interface Ingredient {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
}

interface Instruction {
  text: string;
  order: number;
}

interface Recipe {
  title?: string;
  description?: string;
  ingredients?: Ingredient[];
  instructions?: Instruction[];
  intolerances?: string[];
  servings?: number;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  missing_ingredients?: string[];
  [key: string]: unknown; // for legacy/extra fields
}

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  const [saving, setSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);
    try {
      // Use the id returned by the AI for each ingredient
      const ingredientsWithIds = recipe.ingredients?.filter((ing: Ingredient) => ing.id && ing.quantity && ing.unit);
      const recipeToSave = { ...recipe, ingredients: ingredientsWithIds, intolerances: recipe.intolerances };
      const response = await fetch('/api/recipes/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe: recipeToSave }),
      });
      if (!response.ok) throw new Error('Failed to save recipe');
    } catch (err: unknown) {
      const error = err as Error;
      setSaveError(error.message || 'Unknown error');
      console.error('error', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{recipe.title || 'Recette générée'}</CardTitle>
        {recipe.description && <CardDescription>{recipe.description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ingredients */}
        <div>
          <h3 className="font-semibold mb-2">Ingrédients</h3>
          <ul className="space-y-1">
            {recipe.ingredients?.map((ing: Ingredient, i: number) => (
              <li key={i} className="text-sm">
                {ing.quantity && ing.unit
                  ? `${ing.quantity} ${ing.unit} ${ing.name}`
                  : ing.quantity
                  ? `${ing.quantity} ${ing.name}`
                  : ing.name}
              </li>
            ))}
          </ul>
        </div>

        {/* Intolerances */}
        {recipe.intolerances && recipe.intolerances.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <span className="text-sm font-medium">Intolérances :</span>
            {recipe.intolerances.map((intolerance, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {intolerance}
              </Badge>
            ))}
          </div>
        )}

        {/* Missing Ingredients */}
        {recipe.missing_ingredients && recipe.missing_ingredients.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <h4 className="font-medium text-red-800 mb-2">Ingrédients manquants</h4>
            <div className="flex flex-wrap gap-1">
              {recipe.missing_ingredients.map((ing: string, i: number) => (
                <Badge key={i} variant="destructive" className="text-xs">
                  {ing}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div>
          <h3 className="font-semibold mb-2">Instructions</h3>
          {Array.isArray(recipe.instructions) && recipe.instructions.length > 0 ? (
            <ol className="space-y-3">
              {[...recipe.instructions]
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map((inst, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                      {inst.order}
                    </span>
                    <span className="text-sm">{inst.text}</span>
                  </li>
                ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune instruction disponible.</p>
          )}
        </div>

        <Separator />

        {/* Recipe Info */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          {recipe.servings && <span>Portions de base : {recipe.servings}</span>}
          {recipe.prep_time_minutes && <span>Préparation : {recipe.prep_time_minutes} min</span>}
          {recipe.cook_time_minutes && <span>Cuisson : {recipe.cook_time_minutes} min</span>}
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-4">
          <Button
            variant="default"
            onClick={handleSave}
            disabled={saving || saveSuccess}
            className="flex-1"
          >
            {saving ? 'Enregistrement...' : saveSuccess ? 'Enregistré !' : 'Enregistrer sur Airtable'}
          </Button>
          {saveError && <span className="text-sm text-destructive">{saveError}</span>}
        </div>
      </CardContent>
    </Card>
  );
} 