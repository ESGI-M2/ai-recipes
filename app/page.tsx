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

import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "./components/LoadingSpinner";

import React from "react";
import { RecipeCard } from "./components/RecipeCard";

import { toast } from "sonner";
import { Sparkles } from "lucide-react";

const INTOLERANCES = [
  { label: "Brocolis", value: "gluten" },
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

  const [progressMessage, setProgressMessage] = useState("");

  const handleRecipeSaved = (savedRecipeIndex: number) => {
    setRecipes(prevRecipes => prevRecipes.filter((_, index) => index !== savedRecipeIndex));
  };

  const handleGenerateRecipe = async () => {
    setRecipes([]);
    setRecipeError(null);
    setRecipeLoading(true);
    setProgress(0);
    setProgressMessage("Initialisation de l'IA...");

    // Very smooth progress simulation for 10-20 second generation
    const progressSteps = [
      { targetProgress: 8, message: "Analyse des ingrédients...", duration: 2000 },
      { targetProgress: 20, message: "Création des combinaisons culinaires...", duration: 4000 },
      { targetProgress: 35, message: "Génération des instructions...", duration: 4000 },
      { targetProgress: 55, message: "Optimisation des recettes...", duration: 4000 },
      { targetProgress: 75, message: "Finalisation des détails...", duration: 3000 },
      { targetProgress: 90, message: "Préparation de la réponse...", duration: 2000 },
      { targetProgress: 98, message: "Finalisation...", duration: 1000 }
    ];

    let currentStep = 0;
    let stepStartTime = Date.now();
    let stepStartProgress = 0;

    const smoothProgressInterval = setInterval(() => {
      const now = Date.now();
      
      if (currentStep < progressSteps.length) {
        const step = progressSteps[currentStep];
        const stepElapsed = now - stepStartTime;
        const stepProgress = Math.min(stepElapsed / step.duration, 1);
        
        // Smooth easing function for natural progression
        const easedProgress = stepProgress * stepProgress * (3 - 2 * stepProgress);
        const currentStepProgress = stepStartProgress + (step.targetProgress - stepStartProgress) * easedProgress;
        
        setProgress(Math.round(currentStepProgress));
        
        if (stepElapsed >= step.duration) {
          setProgressMessage(step.message);
          currentStep++;
          stepStartTime = now;
          stepStartProgress = step.targetProgress;
        }
      }
    }, 50); // Update every 50ms for very smooth animation

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
      setProgressMessage("Recettes générées avec succès !");
      toast.success("Recettes générées avec succès !");
    } catch (err: unknown) {
      const error = err as Error;
      setRecipeError(error.message || 'Unknown error');
      toast.error("Erreur lors de la génération des recettes");
    } finally {
      setRecipeLoading(false);
      clearInterval(smoothProgressInterval);
      setTimeout(() => {
        setProgress(0);
        setProgressMessage("");
      }, 1000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navigation />

      {/* Main Content */}
      <main className="container-modern section-padding">
        <div className="max-w-6xl mx-auto space-y-8 sm:space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-6 sm:space-y-8 fade-in-up">
            <div className="space-y-3 sm:space-y-4">
              <h1 className="heading-xl gradient-text px-4">
                Générez des recettes magiques avec l&apos;IA
              </h1>
              <p className="text-body text-base sm:text-lg max-w-3xl mx-auto px-4">
                Sélectionnez vos ingrédients et laissez notre IA créer des recettes personnalisées, 
                créatives et délicieuses pour vous.
              </p>
            </div>
          </div>

          {/* Form Section */}
          <div className="scale-in">
            <Card className="modern-card max-w-4xl mx-auto">
              <CardHeader className="text-center pb-6 sm:pb-8">
                <CardTitle className="heading-md flex items-center justify-center gap-2 sm:gap-3">
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-pink-600">
                    <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <span className="text-lg sm:text-xl">Générer une recette</span>
                </CardTitle>
                <CardDescription className="text-body text-base sm:text-lg">
                  Sélectionnez vos ingrédients et préférences pour créer des recettes personnalisées
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 sm:space-y-8">
                {/* Ingredients Selection */}
                <div className="space-y-3">
                  <Label htmlFor="ingredients" className="text-base font-semibold text-slate-900">
                    🥕 Ingrédients disponibles
                  </Label>
                  {loading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-12 w-full rounded-lg" />
                      <Skeleton className="h-12 w-full rounded-lg" />
                      <Skeleton className="h-12 w-3/4 rounded-lg" />
                    </div>
                  ) : (
                    <MultiSelect
                      options={ingredientOptions}
                      onValueChange={setSelectedIngredients}
                      onAddAndSelectOption={handleAddAndSelectIngredientOption}
                      placeholder="Sélectionnez vos ingrédients..."
                      maxCount={50}
                    />
                  )}
                </div>

                <Separator />

                {/* Servings */}
                <div className="space-y-3">
                  <Label htmlFor="servings" className="text-base font-semibold text-slate-900">
                    👥 Nombre de portions
                  </Label>
                  <Input
                    id="servings"
                    type="number"
                    min={1}
                    max={100}
                    value={servings}
                    onChange={e => setServings(Number(e.target.value))}
                    placeholder="Nombre de portions"
                    className="input-modern text-center h-12 text-lg"
                  />
                </div>

                {/* Intolerances */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold text-slate-900">
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
                  className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold gradient-bg-ai hover:opacity-90 transition-all duration-300 ai-pulse rounded-xl"
                >
                  {recipeLoading ? (
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                      Génération en cours...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                      Générer mes recettes
                    </div>
                  )}
                </Button>

                {/* Progress Bar */}
                {recipeLoading && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm text-slate-600">
                      <span className="text-xs sm:text-sm">{progressMessage}</span>
                      <span className="text-xs sm:text-sm">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2 bg-slate-200" />
                  </div>
                )}

                {/* Error Display */}
                {recipeError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{recipeError}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Results Section */}
          <div className="scale-in">
            {recipeLoading && (
              <Card className="modern-card max-w-4xl mx-auto">
                <CardContent className="pt-8 sm:pt-12 pb-8 sm:pb-12">
                  <div className="flex items-center justify-center">
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
              <div className="space-y-6 sm:space-y-8 fade-in-up">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="heading-lg gradient-text">🎉 Vos recettes générées</h2>
                    <p className="text-body">Découvrez vos recettes personnalisées créées par l&apos;IA</p>
                  </div>
                  <Button 
                    onClick={handleGenerateRecipe} 
                    size="sm" 
                    variant="outline"
                    className="btn-secondary w-full sm:w-auto"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Régénérer
                  </Button>
                </div>
                <div className="space-y-6 sm:space-y-8">
                  {recipes.map((recipe, idx) => (
                    <div key={idx} className="fade-in-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                      <RecipeCard 
                        recipe={recipe} 
                        showSaveButton={true}
                        showDeleteButton={false}
                        isClickable={false}
                        onRecipeSaved={() => handleRecipeSaved(idx)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!recipeLoading && recipes.length === 0 && !recipeError && (
              <Card className="modern-card max-w-4xl mx-auto">
                <CardContent className="pt-12 sm:pt-16 pb-12 sm:pb-16">
                  <div className="text-center space-y-6">
                    <div className="ai-float">
                      <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-gradient-to-r from-purple-100 to-pink-100 mx-auto">
                        <span className="text-3xl sm:text-4xl">🍽️</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h3 className="heading-md">Prêt à cuisiner ?</h3>
                      <p className="text-body px-4">
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
