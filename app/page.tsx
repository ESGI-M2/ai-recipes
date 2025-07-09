"use client";

import { useEffect, useState } from "react";
import { MultiSelect } from "@/components/ui/multi-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, navigationMenuTriggerStyle } from "@/components/ui/navigation-menu";
import React from "react";
import { RecipeCard } from "./components/RecipeCard";
import Link from "next/link";

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

export default function Home() {
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [ingredientOptions, setIngredientOptions] = useState<{ label: string; value: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState<Record<string, unknown>[]>([]);
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
      setRecipes(Array.isArray(recipesArr) ? recipesArr.map((r: Record<string, unknown>) => ({ ...r, ingredientIdMap: selectedIngredientObjects })) : []);
    } catch (err: unknown) {
      const error = err as Error;
      setRecipeError(error.message || 'Unknown error');
    } finally {
      setRecipeLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Menu */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <Link href="/" legacyBehavior passHref>
                  <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                    AI Recipe Generator
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link href="/recipes" legacyBehavior passHref>
                  <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                    Mes Recettes
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Form Section */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Générer une recette</CardTitle>
                <CardDescription>
                  Sélectionnez vos ingrédients et préférences pour créer une recette personnalisée
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Ingredients Selection */}
                <div className="space-y-2">
                  <Label htmlFor="ingredients">Ingrédients</Label>
                  {loading ? (
                    <div className="text-sm text-muted-foreground">Chargement des ingrédients...</div>
                  ) : (
                    <MultiSelect
                      options={ingredientOptions}
                      onValueChange={setSelectedIngredients}
                      onAddAndSelectOption={handleAddAndSelectIngredientOption}
                      placeholder="Sélectionnez les ingrédients"
                      maxCount={20}
                    />
                  )}
                </div>

                {/* Servings */}
                <div className="space-y-2">
                  <Label htmlFor="servings">Nombre de portions</Label>
                  <Input
                    id="servings"
                    type="number"
                    min={1}
                    max={20}
                    value={servings}
                    onChange={e => setServings(Number(e.target.value))}
                    placeholder="Nombre de portions"
                  />
                </div>

                {/* Intolerances */}
                <div className="space-y-2">
                  <Label>Intolérances</Label>
                  <MultiSelect
                    options={INTOLERANCES}
                    value={intolerances}
                    onValueChange={setIntolerances}
                    placeholder="Sélectionnez les intolérances (optionnel)"
                    maxCount={10}
                  />
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerateRecipe}
                  disabled={selectedIngredients.length === 0 || recipeLoading}
                  className="w-full"
                >
                  {recipeLoading ? "Génération..." : "Générer la recette"}
                </Button>

                {/* Error Display */}
                {recipeError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{recipeError}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Results Section */}
          <div>
            {recipeLoading && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-sm text-muted-foreground">Génération de la recette...</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {recipes.length > 0 && !recipeError && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Résultats</h2>
                  <Button onClick={handleGenerateRecipe} size="sm" variant="outline">
                    Régénérer
                  </Button>
                </div>
                {recipes.map((recipe, idx) => (
                  <RecipeCard key={idx} recipe={recipe} />
                ))}
              </div>
            )}

            {!recipeLoading && recipes.length === 0 && !recipeError && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">
                      Sélectionnez des ingrédients et cliquez sur &quot;Générer la recette&quot; pour commencer
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
