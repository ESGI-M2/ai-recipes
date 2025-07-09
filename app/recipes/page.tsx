"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navigation } from "../components/Navigation";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Clock, Users, ChefHat, Calendar, Search } from "lucide-react";
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
  const [searchTerm, setSearchTerm] = useState("");

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

  // Filter recipes based on search term
  const filteredRecipes = recipes.filter(recipe => 
    getRecipeTitle(recipe).toLowerCase().includes(searchTerm.toLowerCase()) ||
    (getRecipeDescription(recipe) && getRecipeDescription(recipe)!.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen">
      <Navigation />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4 fade-in-up">
            <h1 className="text-4xl font-bold gradient-text">
              📚 Mes Recettes
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Toutes vos recettes générées et sauvegardées, organisées pour vous
            </p>
          </div>

          {/* Search Bar */}
          <div className="scale-in">
            <Card className="modern-card">
              <CardContent className="pt-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Rechercher une recette..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recipes List */}
          <div className="scale-in">
            {loading && (
              <div className="space-y-4">
                {[...Array(3)].map((_, index) => (
                  <Card key={index} className="modern-card">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                          </div>
                          <Skeleton className="h-8 w-20" />
                        </div>
                        <div className="flex gap-2">
                          <Skeleton className="h-6 w-16" />
                          <Skeleton className="h-6 w-20" />
                          <Skeleton className="h-6 w-24" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {error && (
              <Card className="modern-card">
                <CardContent className="pt-6">
                  <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {!loading && !error && filteredRecipes.length === 0 && (
              <Card className="modern-card">
                <CardContent className="pt-6">
                  <div className="text-center py-12 space-y-4">
                    <div className="ai-float">
                      <span className="text-6xl">📚</span>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold">
                        {searchTerm ? "Aucune recette trouvée" : "Aucune recette sauvegardée"}
                      </h3>
                      <p className="text-muted-foreground">
                        {searchTerm 
                          ? "Essayez de modifier vos critères de recherche"
                          : "Commencez par générer votre première recette"
                        }
                      </p>
                    </div>
                    <Link href="/">
                      <Button className="gradient-bg hover:opacity-90">
                        🚀 Générer ma première recette
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {!loading && !error && filteredRecipes.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {filteredRecipes.length} recette{filteredRecipes.length > 1 ? 's' : ''} trouvée{filteredRecipes.length > 1 ? 's' : ''}
                  </p>
                </div>
                
                <div className="space-y-4">
                  {filteredRecipes.map((recipe, index) => (
                    <div key={recipe.id} className="fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
                      <Card className="modern-card hover-lift transition-all duration-300">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="mb-2">
                                <Link 
                                  href={`/recipes/${recipe.id}`} 
                                  className="hover:underline gradient-text font-bold"
                                >
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
                              <Button variant="outline" size="sm" className="hover-lift">
                                👁️ Voir détails
                              </Button>
                            </Link>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {/* Recipe Info */}
                          <div className="flex flex-wrap gap-3 mb-4">
                            {getRecipeServings(recipe) && (
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {getRecipeServings(recipe)} portion{getRecipeServings(recipe)! > 1 ? 's' : ''}
                              </Badge>
                            )}
                            {getRecipePrepTime(recipe) && (
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Préparation: {getRecipePrepTime(recipe)} min
                              </Badge>
                            )}
                            {getRecipeCookTime(recipe) && (
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <ChefHat className="w-3 h-3" />
                                Cuisson: {getRecipeCookTime(recipe)} min
                              </Badge>
                            )}
                            {getRecipeCreatedAt(recipe) && (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(getRecipeCreatedAt(recipe)!).toLocaleDateString('fr-FR')}
                              </Badge>
                            )}
                          </div>

                          <Separator />

                                                     {/* Quick Actions */}
                           <div className="flex gap-3 mt-4">
                             <Link href={`/recipes/${recipe.id}`} className="flex-1">
                               <Button variant="outline" className="w-full hover-lift">
                                 📖 Lire la recette
                               </Button>
                             </Link>
                           </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 