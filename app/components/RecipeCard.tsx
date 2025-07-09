"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Clock, Users, ChefHat } from "lucide-react";

import { useState } from "react";

interface RecipeCardProps {
  recipe: Record<string, unknown>;
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Extract recipe data with proper typing
  const title = (recipe.title as string) || "Recette sans titre";
  const description = (recipe.description as string) || "";
  const ingredients = (recipe.ingredients as Array<{ name: string; quantity: string; unit: string }>) || [];
  const instructions = (recipe.instructions as Array<{ text: string; order: number }>) || [];
  const cookingTime = (recipe.cookingTime as string) || "";
  const servings = (recipe.servings as number) || 1;
  const difficulty = (recipe.difficulty as string) || "Moyenne";
  const cuisine = (recipe.cuisine as string) || "Française";

  // Helper function to get ingredient display name
  const getIngredientName = (ingredient: unknown) => {
    if (typeof ingredient === 'string') return ingredient;
    if (ingredient && typeof ingredient === 'object') {
      const obj = ingredient as Record<string, unknown>;
      return (obj.name as string) || ((obj.fields as Record<string, unknown>)?.Name as string) || (obj.id as string) || 'Ingrédient inconnu';
    }
    return 'Ingrédient inconnu';
  };

  // Helper function to get instruction text
  const getInstructionText = (instruction: unknown) => {
    if (typeof instruction === 'string') return instruction;
    if (instruction && typeof instruction === 'object') {
      const obj = instruction as Record<string, unknown>;
      return (obj.text as string) || ((obj.fields as Record<string, unknown>)?.Text as string) || (obj.id as string) || 'Instruction inconnue';
    }
    return 'Instruction inconnue';
  };

  // Process ingredients for display
  const displayIngredients = Array.isArray(ingredients) 
    ? ingredients.map(ing => ({
        name: getIngredientName(ing),
        quantity: ing.quantity || '',
        unit: ing.unit || ''
      }))
    : [];

  // Process instructions for display
  const displayInstructions = Array.isArray(instructions)
    ? instructions
        .map(inst => ({
          text: getInstructionText(inst),
          order: inst.order || 0
        }))
        .sort((a, b) => a.order - b.order)
    : [];

  const handleSaveRecipe = async () => {
    try {
      const response = await fetch('/api/recipes/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe }),
      });
      
      if (!response.ok) throw new Error('Failed to save recipe');
      
      const savedRecipe = await response.json();
      console.log('Recipe saved:', savedRecipe);
    } catch (error) {
      console.error('Error saving recipe:', error);
    }
  };

  return (
    <Card className="modern-card hover-lift transition-all duration-300 overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl font-bold gradient-text mb-2">
              {title}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground mb-3">
              {description}
            </CardDescription>
            
            {/* Recipe metadata */}
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {cookingTime}
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {servings} portion{servings > 1 ? 's' : ''}
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <ChefHat className="w-3 h-3" />
                {difficulty}
              </Badge>
              <Badge variant="outline" className="gradient-text">
                {cuisine}
              </Badge>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 ml-4">
            <Button
              onClick={handleSaveRecipe}
              size="sm"
              variant="outline"
              className="hover-lift"
            >
              💾 Sauvegarder
            </Button>
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              size="sm"
              variant="ghost"
              className="hover-lift"
            >
              {isExpanded ? "👁️ Masquer" : "👁️ Voir détails"}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 fade-in-up">
          <Separator className="mb-6" />
          
          {/* Ingredients Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">🥕</span>
              <h3 className="text-lg font-semibold">Ingrédients</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {displayIngredients.map((ingredient, index) => (
                <div 
                  key={index} 
                  className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg hover-lift"
                >
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="font-medium">{ingredient.name}</span>
                  {ingredient.quantity && (
                    <span className="text-sm text-muted-foreground">
                      {ingredient.quantity} {ingredient.unit}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator className="my-6" />

          {/* Instructions Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">📝</span>
              <h3 className="text-lg font-semibold">Instructions</h3>
            </div>
            <div className="space-y-4">
              {displayInstructions.map((instruction, index) => (
                <div 
                  key={index} 
                  className="flex gap-4 p-4 bg-muted/30 rounded-lg hover-lift"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-relaxed">{instruction.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Nutrition Section */}
          {recipe.nutrition && (
            <>
              <Separator className="my-6" />
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📊</span>
                  <h3 className="text-lg font-semibold">Informations nutritionnelles</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(recipe.nutrition as Record<string, string>).map(([key, value]) => (
                    <div key={key} className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-sm font-medium text-muted-foreground capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                      <div className="text-lg font-bold">{String(value)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6 pt-6 border-t">
            <Button 
              onClick={handleSaveRecipe}
              className="flex-1 gradient-bg hover:opacity-90"
            >
              💾 Sauvegarder la recette
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
} 