"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, navigationMenuTriggerStyle } from "@/components/ui/navigation-menu";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Recipe {
  id: string;
  createdTime?: string;
  fields?: {
    Title?: string;
    Description?: string;
    Servings?: number;
    PrepTimeMinutes?: number;
    CookTimeMinutes?: number;
    Recipes_Ingredients?: string[];
    Recipe_Instructions?: string[];
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
  intolerances?: string[];
  servings?: number;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  created_at?: string;
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const response = await fetch('/api/recipes');
        if (!response.ok) throw new Error('Failed to fetch recipes');
        const data = await response.json();
        // Handle both array and object with recipes property
        const recipesArray = Array.isArray(data) ? data : (data.recipes || []);
        setRecipes(recipesArray);
      } catch (err) {
        const error = err as Error;
        setError(error.message || 'Failed to load recipes');
      } finally {
        setLoading(false);
      }
    };

    fetchRecipes();
  }, []);

  // Helper function to get recipe title
  const getRecipeTitle = (recipe: Recipe) => {
    return recipe.fields?.Title || 'Recette sans titre';
  };

  // Helper function to get recipe description
  const getRecipeDescription = (recipe: Recipe) => {
    return recipe.fields?.Description;
  };

  // Helper function to get recipe servings
  const getRecipeServings = (recipe: Recipe) => {
    return recipe.servings || recipe.fields?.Servings;
  };

  // Helper function to get recipe prep time
  const getRecipePrepTime = (recipe: Recipe) => {
    return recipe.prep_time_minutes || recipe.fields?.PrepTimeMinutes;
  };

  // Helper function to get recipe cook time
  const getRecipeCookTime = (recipe: Recipe) => {
    return recipe.cook_time_minutes || recipe.fields?.CookTimeMinutes;
  };

  // Helper function to get recipe creation date
  const getRecipeCreatedAt = (recipe: Recipe) => {
    return recipe.created_at || recipe.createdTime;
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
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold mb-2">Mes Recettes</h1>
            <p className="text-muted-foreground">
              Toutes vos recettes générées et sauvegardées
            </p>
          </div>

          {/* Recipes List */}
          <div>
            {loading && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-sm text-muted-foreground">Chargement des recettes...</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {error && (
              <Card>
                <CardContent className="pt-6">
                  <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {!loading && !error && recipes.length === 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground mb-4">
                      Aucune recette trouvée
                    </p>
                    <Link href="/">
                      <Button>
                        Générer votre première recette
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {!loading && !error && recipes.length > 0 && (
              <div className="grid gap-6">
                {recipes.map((recipe) => (
                  <Card key={recipe.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="mb-2">
                            <Link href={`/recipes/${recipe.id}`} className="hover:underline">
                              {getRecipeTitle(recipe)}
                            </Link>
                          </CardTitle>
                          {getRecipeDescription(recipe) && (
                            <CardDescription className="mb-3">
                              {getRecipeDescription(recipe)}
                            </CardDescription>
                          )}
                        </div>
                        <Link href={`/recipes/${recipe.id}`}>
                          <Button variant="outline" size="sm">
                            Voir détails
                          </Button>
                        </Link>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Recipe Info */}
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-4">
                        {getRecipeServings(recipe) && <span>Portions : {getRecipeServings(recipe)}</span>}
                        {getRecipePrepTime(recipe) && <span>Préparation : {getRecipePrepTime(recipe)} min</span>}
                        {getRecipeCookTime(recipe) && <span>Cuisson : {getRecipeCookTime(recipe)} min</span>}
                        {getRecipeCreatedAt(recipe) && (
                          <span>Créée le : {new Date(getRecipeCreatedAt(recipe)!).toLocaleDateString('fr-FR')}</span>
                        )}
                      </div>

                      {/* Intolerances */}
                      {recipe.intolerances && recipe.intolerances.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          <span className="text-sm font-medium">Intolérances :</span>
                          {recipe.intolerances.map((intolerance, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {intolerance}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Ingredients Preview */}
                      {recipe.ingredients && recipe.ingredients.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Ingrédients principaux</h4>
                          <div className="flex flex-wrap gap-1">
                            {recipe.ingredients.slice(0, 5).map((ingredient, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {ingredient.name}
                              </Badge>
                            ))}
                            {recipe.ingredients.length > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{recipe.ingredients.length - 5} autres
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 