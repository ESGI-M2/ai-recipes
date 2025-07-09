"use client";

import { useEffect, useState } from "react";
import { MultiSelect } from "@/components/ui/multi-select";
import { Button } from "@/components/ui/button";
import React from "react";

const INTOLERANCES = [
  { label: "Gluten", value: "gluten" },
  { label: "Lactose", value: "lactose" },
  { label: "Fruits à coque", value: "nuts" },
  { label: "Oeufs", value: "eggs" },
  { label: "Poisson", value: "fish" },
  { label: "Soja", value: "soy" },
  { label: "Fruits de mer", value: "shellfish" },
  { label: "Cacao", value: "cacao" },
  { label: "Chocolat", value: "chocolate" },
];

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
  [key: string]: any; // for legacy/extra fields
}

export default function Home() {
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [ingredientOptions, setIngredientOptions] = useState<{ label: string; value: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [recipeError, setRecipeError] = useState<string | null>(null);
  const [intolerances, setIntolerances] = useState<string[]>([]);
  const [servings, setServings] = useState(1);

  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        const response = await fetch("/api/ingredients");
        if (!response.ok) throw new Error("Failed to fetch ingredients");
        const data: Array<{ fields?: { Name?: string }; id: string }> = await response.json();
        // Map Airtable records to MultiSelect options
        const options = (data || []).map((record) => ({
          label: record.fields?.Name || record.id,
          value: record.id,
        }));
        setIngredientOptions(options);
      } catch {
        setIngredientOptions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchIngredients();
  }, []);

  const handleAddAndSelectIngredientOption = async (
    option: { label: string; value: string },
    select: (values: string[]) => void
  ) => {
    try {
      const response = await fetch('/api/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: option.label }),
      });
      if (!response.ok) throw new Error('Failed to add ingredient');
      const record = await response.json();
      const newOption = { label: record.fields?.Name || record.id, value: record.id };
      setIngredientOptions((prev) => [newOption, ...prev]);
      const merged = [...selectedIngredients, newOption.value];
      select(merged);
      setSelectedIngredients(merged);
    } catch {
      setIngredientOptions((prev) => [option, ...prev]);
      select([option.value]);
      setSelectedIngredients([option.value]);
    }
  };

  const handleGenerateRecipe = async () => {
    setRecipes([]);
    setRecipeError(null);
    setRecipeLoading(true);
    try {
      // Send both id and name for each selected ingredient
      const selectedIngredientObjects = selectedIngredients.map(id => {
        const found = ingredientOptions.find(opt => opt.value === id);
        return found ? { id: found.value, name: found.label } : { id, name: id };
      });
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients: selectedIngredientObjects,
          intolerances,
          servings,
        }),
      });
      if (!response.ok) throw new Error('Failed to generate recipe');
      const data = await response.json();
      // Use structuredResponse.recipes if present, else fallback
      const recipesArr = data.structuredResponse?.recipes || data.recipes || [];
      // Attach the ingredient id mapping to each recipe for later use
      setRecipes(Array.isArray(recipesArr) ? recipesArr.map((r: Recipe) => ({ ...r, ingredientIdMap: selectedIngredientObjects })) : []);
    } catch (err: unknown) {
      const error = err as Error;
      setRecipeError(error.message || 'Unknown error');
    } finally {
      setRecipeLoading(false);
    }
  };

  return (
    <div className="">
      <main className="">
        <div className="max-w-md mx-auto mt-10 p-4 border rounded shadow bg-white">
          <h1 className="text-2xl font-bold mb-4">Choisissez les ingrédients</h1>
          {loading ? (
            <div>Chargement des ingrédients...</div>
          ) : (
            <MultiSelect
              options={ingredientOptions}
              onValueChange={setSelectedIngredients}
              onAddAndSelectOption={handleAddAndSelectIngredientOption}
              placeholder="Sélectionnez les ingrédients"
              maxCount={20}
            />
          )}
          <div className="mt-4 flex flex-col gap-4">
            <div>
              <label className="block mb-1 font-medium">Nombre de portions</label>
              <input
                type="number"
                min={1}
                max={20}
                value={servings}
                onChange={e => setServings(Number(e.target.value))}
                className="w-full border rounded px-3 py-2"
                placeholder="Nombre de portions"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">Intolérances</label>
              <MultiSelect
                options={INTOLERANCES}
                value={intolerances}
                onValueChange={setIntolerances}
                placeholder="Sélectionnez les intolérances (optionnel)"
                maxCount={10}
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleGenerateRecipe}
              disabled={selectedIngredients.length === 0}
            >
              Générer
            </Button>
          </div>
          {recipeLoading && (
            <div className="mt-6 text-center text-gray-500">Génération de la recette...</div>
          )}
          {recipeError && (
            <div className="mt-6 text-center text-red-500">{recipeError}</div>
          )}
          {recipes.length > 0 && !recipeError && (
            <div className="mt-6">
              <div className="flex justify-end mb-2">
                <Button onClick={handleGenerateRecipe} size="sm" variant="secondary">Régénérer</Button>
              </div>
              {recipes.map((recipe, idx) => (
                <RecipeCard key={idx} recipe={recipe} />
              ))}
            </div>
          )}
        </div>
      </main>
      <footer className="">
        
      </footer>
    </div>
  );
}

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const [saving, setSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [servings, setServings] = React.useState(1);

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
    <div className="mb-8 p-4 border rounded bg-gray-50">
      <h2 className="text-xl font-bold mb-2">{recipe.title || 'Recette générée'}</h2>
      {recipe.description && <p className="mb-2">{recipe.description}</p>}
      <div className="mb-2 flex items-center gap-2">
        <label className="font-medium">Portions :</label>
        <input
          type="number"
          min={1}
          value={servings}
          onChange={e => setServings(Number(e.target.value))}
          className="w-16 border rounded px-2 py-1"
        />
      </div>
      <div className="mb-2">
        <strong>Ingrédients :</strong>
        <ul className="list-disc list-inside">
          {recipe.ingredients?.map((ing: Ingredient, i: number) => (
            <li key={i}>
              {ing.quantity && ing.unit
                ? `${ing.quantity * servings} ${ing.unit} ${ing.name}`
                : ing.quantity
                ? `${ing.quantity} ${ing.name}`
                : ing.name}
            </li>
          ))}
        </ul>
      </div>
      {recipe.intolerances && recipe.intolerances.length > 0 && (
        <div className="mb-2 text-blue-700"><strong>Intolérances :</strong> {recipe.intolerances.join(", ")}</div>
      )}
      {recipe.missing_ingredients && recipe.missing_ingredients.length > 0 && (
        <div className="mb-2 text-red-600 flex items-center gap-2">
          <span className="font-semibold">Ingrédients manquants :</span>
          <ul className="list-disc list-inside inline">
            {recipe.missing_ingredients.map((ing: string, i: number) => (
              <li key={i} className="inline ml-2">{ing}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="mb-2">
        <strong>Instructions :</strong>
        {Array.isArray(recipe.instructions) && recipe.instructions.length > 0 ? (
          <ol className="relative border-l-2 border-gray-300 ml-4">
            {[...recipe.instructions]
              .sort((a, b) => (a.order || 0) - (b.order || 0))
              .map((inst, i) => (
                <li key={i} className="mb-2 ml-4">
                  <span className="font-bold mr-2">{inst.order}.</span>
                  {inst.text}
                </li>
              ))}
          </ol>
        ) : (
          <div className="text-gray-500">Aucune instruction disponible.</div>
        )}
      </div>
      <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
        {recipe.servings && <span>Portions de base : {recipe.servings}</span>}
        {recipe.prep_time_minutes && <span>Préparation : {recipe.prep_time_minutes} min</span>}
        {recipe.cook_time_minutes && <span>Cuisson : {recipe.cook_time_minutes} min</span>}
        {recipe.intolerances && recipe.intolerances.length > 0 && (
          <span>Intolérances : {recipe.intolerances.join(", ")}</span>
        )}
      </div>
      <div className="mt-4 flex items-center gap-4">
        <button
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          onClick={handleSave}
          disabled={saving || saveSuccess}
        >
          {saving ? 'Enregistrement...' : saveSuccess ? 'Enregistré !' : 'Enregistrer sur Airtable'}
        </button>
        {saveError && <span className="text-red-600 text-sm">{saveError}</span>}
      </div>
    </div>
  );
}
