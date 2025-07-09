"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navigation } from "../../components/Navigation";
import { Badge } from "@/components/ui/badge";

import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Users, ChefHat, Calendar, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface RecipeIngredientRecord {
  id: string;
  createdTime: string;
  fields: {
    Identifier: number;
    Recipe: string[];
    Ingredient: string[];
    Quantity: number;
    Unit: string;
  };
  ingredientName?: string;
}

interface RecipeInstructionRecord {
  id: string;
  createdTime: string;
  fields: {
    Instruction: string;
    Order: number;
    Recipe: string[];
  };
}

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
  recipe_ingredient_quantity_records?: RecipeIngredientRecord[];
  recipe_instruction_records?: RecipeInstructionRecord[];
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

export default function RecipeDetailPage() {
  const params = useParams();
  const recipeId = params.id as string;
  
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        const response = await fetch(`/api/recipes/${recipeId}`);
        if (!response.ok) throw new Error('Failed to fetch recipe');
        const data = await response.json();
        setRecipe(data.recipe || data);
      } catch (err) {
        const error = err as Error;
        setError(error.message || 'Failed to load recipe');
      } finally {
        setLoading(false);
      }
    };

    if (recipeId) {
      fetchRecipe();
    }
  }, [recipeId]);

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

  // Helper function to get ingredients from join table
  const getIngredients = (recipe: Recipe) => {
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      return recipe.ingredients;
    }
    
    if (recipe.recipe_ingredient_quantity_records && recipe.recipe_ingredient_quantity_records.length > 0) {
      return recipe.recipe_ingredient_quantity_records.map(record => ({
        id: record.id,
        name: record.ingredientName || `Ingrédient ${record.fields.Identifier}`, // Use ingredientName if available
        quantity: record.fields.Quantity,
        unit: record.fields.Unit
      }));
    }
    
    return [];
  };

  // Helper function to get instructions from join table
  const getInstructions = (recipe: Recipe) => {
    if (recipe.instructions && recipe.instructions.length > 0) {
      return recipe.instructions;
    }
    
    if (recipe.recipe_instruction_records && recipe.recipe_instruction_records.length > 0) {
      return recipe.recipe_instruction_records
        .map(record => ({
          text: record.fields.Instruction,
          order: record.fields.Order
        }))
        .sort((a, b) => a.order - b.order);
    }
    
    return [];
  };

  return (
    <div className="min-h-screen">
      <Navigation />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Back Button */}
          <div className="fade-in-up">
            <Link href="/recipes">
              <Button variant="outline" size="sm" className="hover-lift">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour aux recettes
              </Button>
            </Link>
          </div>

          {/* Recipe Detail */}
          <div className="scale-in">
            {loading && (
              <div className="space-y-6">
                <Card className="modern-card">
                  <CardHeader>
                    <Skeleton className="h-8 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-6 w-28" />
                    </div>
                    <Skeleton className="h-32 w-full" />
                  </CardContent>
                </Card>
                
                <Card className="modern-card">
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-4 w-full" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
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

            {!loading && !error && recipe && (
              <div className="space-y-8">
                {/* Recipe Header */}
                <Card className="modern-card">
                  <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-bold gradient-text mb-4">
                      {getRecipeTitle(recipe)}
                    </CardTitle>
                    {getRecipeDescription(recipe) && (
                      <CardDescription className="text-lg text-muted-foreground mb-6">
                        {getRecipeDescription(recipe)}
                      </CardDescription>
                    )}
                    
                    {/* Recipe Metadata */}
                    <div className="flex flex-wrap justify-center gap-4 mb-6">
                      {getRecipeServings(recipe) && (
                        <Badge variant="secondary" className="flex items-center gap-2 px-4 py-2">
                          <Users className="w-4 h-4" />
                          {getRecipeServings(recipe)} portion{getRecipeServings(recipe)! > 1 ? 's' : ''}
                        </Badge>
                      )}
                      {getRecipePrepTime(recipe) && (
                        <Badge variant="secondary" className="flex items-center gap-2 px-4 py-2">
                          <Clock className="w-4 h-4" />
                          Préparation: {getRecipePrepTime(recipe)} min
                        </Badge>
                      )}
                      {getRecipeCookTime(recipe) && (
                        <Badge variant="secondary" className="flex items-center gap-2 px-4 py-2">
                          <ChefHat className="w-4 h-4" />
                          Cuisson: {getRecipeCookTime(recipe)} min
                        </Badge>
                      )}
                      {getRecipeCreatedAt(recipe) && (
                        <Badge variant="outline" className="flex items-center gap-2 px-4 py-2">
                          <Calendar className="w-4 h-4" />
                          {new Date(getRecipeCreatedAt(recipe)!).toLocaleDateString('fr-FR')}
                        </Badge>
                      )}
                    </div>


                  </CardHeader>
                </Card>

                {/* Ingredients Section */}
                <Card className="modern-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-2xl">🥕</span>
                      Ingrédients
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {getIngredients(recipe).map((ingredient, index) => (
                        <div 
                          key={index} 
                          className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg hover-lift"
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          <div className="w-3 h-3 bg-primary rounded-full"></div>
                          <div className="flex-1">
                            <div className="font-medium">{ingredient.name}</div>
                            {ingredient.quantity && ingredient.unit && (
                              <div className="text-sm text-muted-foreground">
                                {ingredient.quantity} {ingredient.unit}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Instructions Section */}
                <Card className="modern-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-2xl">📝</span>
                      Instructions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {getInstructions(recipe).map((instruction, index) => (
                        <div 
                          key={index} 
                          className="flex gap-6 p-6 bg-muted/30 rounded-lg hover-lift"
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          <div className="flex-shrink-0 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-lg font-bold">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-base leading-relaxed">{instruction.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Intolerances Section */}
                {recipe.intolerances && recipe.intolerances.length > 0 && (
                  <Card className="modern-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <span className="text-2xl">⚠️</span>
                        Intolérances
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {recipe.intolerances.map((intolerance, index) => (
                          <Badge key={index} variant="destructive" className="px-3 py-1">
                            {intolerance}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 