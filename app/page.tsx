"use client";

import { useEffect, useState } from "react";
import { MultiSelect } from "@/components/ui/multi-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navigation } from "./components/Navigation";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "./components/LoadingSpinner";

import React from "react";
import { RecipeCard } from "./components/RecipeCard";

import { toast } from "sonner";

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
  const [progress, setProgress] = useState(0);

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
      toast.success("Ingrédient ajouté avec succès !");
    } catch {
      setIngredientOptions((prev) => [option, ...prev]);
      select([option.value]);
      setSelectedIngredients([option.value]);
      toast.error("Erreur lors de l'ajout de l'ingrédient");
    }
  };

  const handleGenerateRecipe = async () => {
    setRecipes([]);
    setRecipeError(null);
    setRecipeLoading(true);
    setProgress(0);

    // Simulate progress for AI generation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 200);

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
      setProgress(100);
      toast.success("Recettes générées avec succès !");
    } catch (err: unknown) {
      const error = err as Error;
      setRecipeError(error.message || 'Unknown error');
      toast.error("Erreur lors de la génération des recettes");
    } finally {
      setRecipeLoading(false);
      clearInterval(progressInterval);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  return (
    <div className="min-h-screen">
      <Navigation />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4 fade-in-up">
            <h1 className="text-4xl font-bold gradient-text">
              Générez des recettes magiques avec l&apos;IA
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Sélectionnez vos ingrédients et laissez notre IA créer des recettes personnalisées, 
              créatives et délicieuses pour vous.
            </p>
          </div>

          {/* Form Section */}
          <div className="scale-in">
            <Card className="modern-card hover-lift">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl flex items-center justify-center gap-2">
                  <span className="ai-pulse">🤖</span>
                  Générer une recette
                </CardTitle>
                <CardDescription>
                  Sélectionnez vos ingrédients et préférences pour créer des recettes personnalisées
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Ingredients Selection */}
                <div className="space-y-2">
                  <Label htmlFor="ingredients" className="text-base font-medium">
                    🥕 Ingrédients disponibles
                  </Label>
                  {loading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-3/4" />
                    </div>
                  ) : (
                    <MultiSelect
                      options={ingredientOptions}
                      onValueChange={setSelectedIngredients}
                      onAddAndSelectOption={handleAddAndSelectIngredientOption}
                      placeholder="Sélectionnez vos ingrédients..."
                      maxCount={20}
                    />
                  )}
                  {selectedIngredients.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedIngredients.map((id) => {
                        const ingredient = ingredientOptions.find(opt => opt.value === id);
                        return (
                          <Badge key={id} variant="secondary" className="ai-float">
                            {ingredient?.label || id}
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Servings */}
                <div className="space-y-2">
                  <Label htmlFor="servings" className="text-base font-medium">
                    👥 Nombre de portions
                  </Label>
                  <Input
                    id="servings"
                    type="number"
                    min={1}
                    max={20}
                    value={servings}
                    onChange={e => setServings(Number(e.target.value))}
                    placeholder="Nombre de portions"
                    className="text-center"
                  />
                </div>

                {/* Intolerances */}
                <div className="space-y-2">
                  <Label className="text-base font-medium">
                    ⚠️ Intolérances alimentaires
                  </Label>
                  <MultiSelect
                    options={INTOLERANCES}
                    value={intolerances}
                    onValueChange={setIntolerances}
                    placeholder="Sélectionnez vos intolérances (optionnel)"
                    maxCount={10}
                  />
                </div>

                <Separator />

                {/* Generate Button */}
                <Button
                  onClick={handleGenerateRecipe}
                  disabled={selectedIngredients.length === 0 || recipeLoading}
                  className="w-full h-12 text-lg font-semibold gradient-bg-ai hover:opacity-90 transition-all duration-300 ai-pulse"
                >
                  {recipeLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Génération en cours...
                    </div>
                  ) : (
                    "🚀 Générer mes recettes"
                  )}
                </Button>

                {/* Progress Bar */}
                {recipeLoading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Analyse des ingrédients...</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}

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
          <div className="scale-in">
            {recipeLoading && (
              <Card className="modern-card">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner 
                      size="lg" 
                      text="L'IA cuisine pour vous..." 
                      showProgress={true}
                      progress={progress}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {recipes.length > 0 && !recipeError && (
              <div className="space-y-6 fade-in-up">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold gradient-text">🎉 Vos recettes générées</h2>
                    <p className="text-muted-foreground">Découvrez vos recettes personnalisées créées par l&apos;IA</p>
                  </div>
                  <Button 
                    onClick={handleGenerateRecipe} 
                    size="sm" 
                    variant="outline"
                    className="hover-lift"
                  >
                    🔄 Régénérer
                  </Button>
                </div>
                <div className="space-y-6">
                  {recipes.map((recipe, idx) => (
                    <div key={idx} className="fade-in-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                      <RecipeCard recipe={recipe} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!recipeLoading && recipes.length === 0 && !recipeError && (
              <Card className="modern-card">
                <CardContent className="pt-6">
                  <div className="text-center py-12 space-y-4">
                    <div className="ai-float">
                      <span className="text-6xl">🍽️</span>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold">Prêt à cuisiner ?</h3>
                                             <p className="text-muted-foreground">
                         Sélectionnez vos ingrédients et cliquez sur &quot;Générer mes recettes&quot; pour commencer
                       </p>
                    </div>
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
