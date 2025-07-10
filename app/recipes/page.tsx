"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navigation } from "../components/Navigation";
import { RecipeCard } from "../components/RecipeCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ChefHat } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Recipe extends Record<string, unknown> {
  id: string;
  fields?: {
    Title?: string;
    Description?: string;
    Servings?: number;
    PrepTimeMinutes?: number;
    CookTimeMinutes?: number;
  };
  ingredients?: Array<{
    id: string;
    name: string;
    quantity?: number;
    unit?: string;
  }>;
  instructions?: Array<{
    text: string;
    order: number;
  }>;
  servings?: number;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  title?: string;
  description?: string;
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/recipes');
      if (!response.ok) throw new Error('Failed to fetch recipes');
      const data = await response.json();
      setRecipes(Array.isArray(data) ? data : []);
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to load recipes');
      toast.error("Erreur lors du chargement des recettes");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecipe = (deletedRecipeId: string) => {
    setRecipes(prevRecipes => prevRecipes.filter(recipe => recipe.id !== deletedRecipeId));
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold gradient-text">Mes Recettes</h1>
                <p className="text-muted-foreground">Vos recettes sauvegardées</p>
              </div>
              <Skeleton className="h-10 w-32" />
            </div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-48 w-full" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Erreur</h1>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={fetchRecipes} variant="outline">
              Réessayer
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navigation />
      <main className="container-modern section-padding">
        <div className="max-w-6xl mx-auto space-y-8 sm:space-y-12">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="heading-lg gradient-text flex items-center gap-2 sm:gap-3">
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-pink-600">
                  <ChefHat className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <span className="text-xl sm:text-2xl">Mes Recettes</span>
              </h1>
              <p className="text-body mt-2">
                {recipes.length} recette{recipes.length > 1 ? 's' : ''} sauvegardée{recipes.length > 1 ? 's' : ''}
              </p>
            </div>
            <Link href="/">
              <Button className="btn-primary w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2 lucide-plus" />
                Nouvelle recette
              </Button>
            </Link>
          </div>

          {/* Recipes List */}
          {recipes.length > 0 ? (
            <div className="space-y-6 sm:space-y-8">
              {recipes.map((recipe) => (
                <RecipeCard 
                  key={recipe.id} 
                  recipe={recipe} 
                  onDelete={handleDeleteRecipe}
                  showDeleteButton={true}
                  showSaveButton={false}
                  isClickable={true}
                />
              ))}
            </div>
          ) : (
            <Card className="modern-card max-w-4xl mx-auto">
              <CardContent className="pt-12 sm:pt-16 pb-12 sm:pb-16">
                <div className="text-center space-y-6">
                  <div className="ai-float">
                    <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-gradient-to-r from-purple-100 to-pink-100 mx-auto">
                      <span className="text-3xl sm:text-4xl">🍽️</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="heading-md">Aucune recette sauvegardée</h3>
                    <p className="text-body px-4">
                      Commencez par générer et sauvegarder vos premières recettes
                    </p>
                  </div>
                  <Link href="/">
                    <Button className="btn-primary w-full sm:w-auto">
                      <Plus className="w-4 h-4 mr-2" />
                      Créer ma première recette
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
} 