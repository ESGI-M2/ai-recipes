"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Clock, Users, ChefHat, Save } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface RecipeCardProps {
  recipe: Record<string, unknown>;
  onDelete?: (recipeId: string) => void;
  showDeleteButton?: boolean;
  showSaveButton?: boolean;
  isClickable?: boolean;
  onRecipeSaved?: () => void;
}

export function RecipeCard({ recipe, onDelete, showDeleteButton = false, showSaveButton = true, isClickable = false, onRecipeSaved }: RecipeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Extract recipe data with proper typing and Airtable compatibility
  const title = (recipe.title as string) || ((recipe.fields as any)?.Title as string) || "Recette sans titre";
  const description = (recipe.description as string) || ((recipe.fields as any)?.Description as string) || "";
  const ingredients = (recipe.ingredients as Array<{ name: string; quantity: number; unit: string }>) || [];
  const instructions = (recipe.instructions as Array<{ text: string; order: number }>) || [];
  const servings = (recipe.servings as number) || ((recipe.fields as any)?.Servings as number) || 1;
  const difficulty = (recipe.difficulty as string) || "Moyenne";
  const cuisine = (recipe.cuisine as string) || "Française";
  const recipeId = (recipe.id as string) || "";
  const prepTime = (recipe.prep_time_minutes as number) || ((recipe.fields as any)?.PrepTimeMinutes as number) || 0;
  const cookTime = (recipe.cook_time_minutes as number) || ((recipe.fields as any)?.CookTimeMinutes as number) || 0;

  const handleSaveRecipe = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/recipes/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipe: {
            title,
            description,
            ingredients,
            instructions,
            servings,
            difficulty,
            cuisine,
            prep_time_minutes: prepTime,
            cook_time_minutes: cookTime,
          },
        }),
      });

      if (response.ok) {
        toast.success("Recette sauvegardée avec succès !");
        // Appeler le callback pour supprimer la recette de la liste
        if (onRecipeSaved) {
          onRecipeSaved();
        }
      } else {
        toast.error("Erreur lors de la sauvegarde");
      }
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRecipe = async () => {
    if (!recipeId || !onDelete) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/recipes/delete`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recipeId }),
      });

      if (response.ok) {
        onDelete(recipeId);
        toast.success("Recette supprimée avec succès !");
      } else {
        toast.error("Erreur lors de la suppression");
      }
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    } finally {
      setIsDeleting(false);
    }
  };

  const CardContentComponent = () => (
    <Card className="modern-card hover-lift transition-all duration-300 overflow-hidden">
      <CardHeader className="pb-4 sm:pb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="heading-md gradient-text mb-3">
              {title}
            </CardTitle>
            <CardDescription className="text-body mb-4">
              {description}
            </CardDescription>
            
            {/* Recipe metadata */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="secondary" className="badge-secondary flex items-center gap-1 text-xs">
                <Clock className="w-3 h-3" />
                {prepTime + cookTime} min
              </Badge>
              <Badge variant="secondary" className="badge-secondary flex items-center gap-1 text-xs">
                <Users className="w-3 h-3" />
                {servings} portion{servings > 1 ? 's' : ''}
              </Badge>
              <Badge variant="secondary" className="badge-secondary flex items-center gap-1 text-xs">
                <ChefHat className="w-3 h-3" />
                {difficulty}
              </Badge>
              <Badge variant="outline" className="badge-primary text-xs">
                {cuisine}
              </Badge>
            </div>
          </div>

          <div className="flex flex-row sm:flex-col gap-2 sm:gap-2 sm:ml-6">
            {showSaveButton && (
              <Button
                onClick={handleSaveRecipe}
                size="sm"
                variant="outline"
                className="btn-secondary flex-1 sm:flex-none"
                disabled={isSaving}
              >
                {isSaving ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                    <span className="hidden sm:inline">Sauvegarde...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <Save className="w-3 h-3" />
                    <span className="text-xs hidden sm:inline">Sauvegarder</span>
                  </div>
                )}
              </Button>
            )}
            
            {showDeleteButton && onDelete && (
              <Button
                onClick={handleDeleteRecipe}
                size="sm"
                variant="ghost"
                className="btn-ghost hover:text-red-600 transition-colors flex-1 sm:flex-none"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                    <span className="hidden sm:inline">Suppression...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <Trash2 className="w-3 h-3 lucide-trash" />
                    <span className="text-xs hidden sm:inline">Supprimer</span>
                  </div>
                )}
              </Button>
            )}
            
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              size="sm"
              variant="ghost"
              className="btn-ghost flex-1 sm:flex-none"
            >
              {isExpanded ? "👁️ Masquer" : "👁️ Voir détails"}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 fade-in-up">
          <Separator className="mb-6 sm:mb-8" />
          
          {/* Ingredients Section */}
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-gradient-to-r from-green-100 to-emerald-100">
                <span className="text-sm sm:text-lg">🥕</span>
              </div>
              <h3 className="heading-md text-lg sm:text-xl">Ingrédients</h3>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              {ingredients.length > 0 ? (
                ingredients.map((ingredient, index) => (
                  <div 
                    key={index} 
                    className="flex items-center gap-3 p-3 sm:p-4 bg-slate-50 rounded-lg hover-lift"
                  >
                    <div className="w-2 h-2 bg-slate-900 rounded-full"></div>
                    <span className="font-medium text-slate-900 text-sm sm:text-base">{ingredient.name}</span>
                    {ingredient.quantity && (
                      <span className="text-xs sm:text-sm text-slate-600 ml-auto">
                        {ingredient.quantity} {ingredient.unit}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-6 sm:py-8 text-slate-500">
                  Aucun ingrédient disponible
                </div>
              )}
            </div>
          </div>

          <Separator className="my-6 sm:my-8" />

          {/* Instructions Section */}
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-gradient-to-r from-blue-100 to-indigo-100">
                <span className="text-sm sm:text-lg">📝</span>
              </div>
              <h3 className="heading-md text-lg sm:text-xl">Instructions</h3>
            </div>
            <div className="space-y-3 sm:space-y-4">
              {instructions.length > 0 ? (
                instructions.map((instruction, index) => (
                  <div 
                    key={index} 
                    className="flex gap-3 sm:gap-4 p-4 sm:p-6 bg-slate-50 rounded-lg hover-lift"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-bold">
                      {index + 1}
                    </div>
                    <p className="text-body text-sm sm:text-base leading-relaxed">{instruction.text}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 sm:py-8 text-slate-500">
                  Aucune instruction disponible
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {showSaveButton && (
            <div className="flex gap-3 sm:gap-4 mt-6 sm:mt-8 pt-6 sm:pt-8 border-t">
              <Button 
                onClick={handleSaveRecipe}
                className="flex-1 btn-primary"
                disabled={isSaving}
              >
                {isSaving ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Sauvegarde en cours...
                  </div>
                ) : (
                  "💾 Sauvegarder la recette"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );

  if (isClickable) {
    return (
      <div className="relative">
        <Link href={`/recipes/${recipeId}`} className="block">
          <div className="cursor-pointer">
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
                        {prepTime + cookTime} min
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
                </div>
              </CardHeader>
            </Card>
          </div>
        </Link>
        
        {/* Boutons d'action en position absolue */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          {showSaveButton && (
            <Button
              onClick={handleSaveRecipe}
              size="sm"
              variant="outline"
              className="hover-lift bg-white/90 backdrop-blur-sm"
              disabled={isSaving}
            >
              {isSaving ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                  Sauvegarde...
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Save className="w-3 h-3" />
                  <span className="text-xs">Sauvegarder</span>
                </div>
              )}
            </Button>
          )}
          
          {showDeleteButton && onDelete && (
            <Button
              onClick={handleDeleteRecipe}
              size="sm"
              variant="ghost"
              className="hover-lift text-muted-foreground hover:text-red-600 transition-colors bg-white/90 backdrop-blur-sm"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                  Suppression...
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Trash2 className="w-3 h-3 lucide-trash" />
                  <span className="text-xs">Supprimer</span>
                </div>
              )}
            </Button>
          )}
          
          <Button
            onClick={() => setIsExpanded(!isExpanded)}
            size="sm"
            variant="ghost"
            className="hover-lift bg-white/90 backdrop-blur-sm"
          >
            {isExpanded ? "👁️ Masquer" : "👁️ Voir détails"}
          </Button>
        </div>

        {/* Section détaillée si expandée */}
        {isExpanded && (
          <Card className="modern-card mt-4">
            <CardContent className="pt-6">
              <Separator className="mb-6" />
              
              {/* Ingredients Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🥕</span>
                  <h3 className="text-lg font-semibold">Ingrédients</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ingredients.length > 0 ? (
                    ingredients.map((ingredient, index) => (
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
                    ))
                  ) : (
                    <div className="col-span-2 text-center py-4 text-muted-foreground">
                      Aucun ingrédient disponible
                    </div>
                  )}
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
                  {instructions.length > 0 ? (
                    instructions.map((instruction, index) => (
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
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      Aucune instruction disponible
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {showSaveButton && (
                <div className="flex gap-3 mt-6 pt-6 border-t">
                  <Button 
                    onClick={handleSaveRecipe}
                    className="flex-1 gradient-bg hover:opacity-90"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Sauvegarde en cours...
                      </div>
                    ) : (
                      "💾 Sauvegarder la recette"
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return <CardContentComponent />;
} 