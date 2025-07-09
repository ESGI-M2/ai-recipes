"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, navigationMenuTriggerStyle } from "@/components/ui/navigation-menu";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
          {/* Back Button */}
          <div>
            <Link href="/recipes">
              <Button variant="outline" size="sm">
                ← Retour aux recettes
              </Button>
            </Link>
          </div>

          {/* Recipe Detail */}
          <div>
            {loading && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-sm text-muted-foreground">Chargement de la recette...</p>
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

            {!loading && !error && recipe && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">{getRecipeTitle(recipe)}</CardTitle>
                  {getRecipeDescription(recipe) && (
                    <CardDescription className="text-base">
                      {getRecipeDescription(recipe)}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Recipe Info */}
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {getRecipeServings(recipe) && <span>Portions : {getRecipeServings(recipe)}</span>}
                    {getRecipePrepTime(recipe) && <span>Préparation : {getRecipePrepTime(recipe)} min</span>}
                    {getRecipeCookTime(recipe) && <span>Cuisson : {getRecipeCookTime(recipe)} min</span>}
                    {getRecipeCreatedAt(recipe) && (
                      <span>Créée le : {new Date(getRecipeCreatedAt(recipe)!).toLocaleDateString('fr-FR')}</span>
                    )}
                  </div>

                  {/* Intolerances */}
                  {recipe.intolerances && recipe.intolerances.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Intolérances</h3>
                      <div className="flex flex-wrap gap-1">
                        {recipe.intolerances.map((intolerance, i) => (
                          <Badge key={i} variant="secondary">
                            {intolerance}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Ingredients */}
                  {(() => {
                    const ingredients = getIngredients(recipe);
                    return ingredients.length > 0 ? (
                      <div>
                        <h3 className="font-semibold mb-3">Ingrédients</h3>
                        <ul className="space-y-2">
                          {ingredients.map((ingredient, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <span className="w-2 h-2 bg-primary rounded-full"></span>
                              <span className="text-sm">
                                {ingredient.quantity && ingredient.unit
                                  ? `${ingredient.quantity} ${ingredient.unit} ${ingredient.name}`
                                  : ingredient.quantity
                                  ? `${ingredient.quantity} ${ingredient.name}`
                                  : ingredient.name}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null;
                  })()}

                  <Separator />

                  {/* Instructions */}
                  {(() => {
                    const instructions = getInstructions(recipe);
                    return instructions.length > 0 ? (
                      <div>
                        <h3 className="font-semibold mb-3">Instructions</h3>
                        <ol className="space-y-4">
                          {instructions.map((instruction, i) => (
                            <li key={i} className="flex gap-4">
                              <span className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                                {instruction.order}
                              </span>
                              <span className="text-sm leading-relaxed">{instruction.text}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    ) : null;
                  })()}

                  {getIngredients(recipe).length === 0 && getInstructions(recipe).length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">
                        Aucun détail disponible pour cette recette
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {!loading && !error && !recipe && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">
                      Recette non trouvée
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