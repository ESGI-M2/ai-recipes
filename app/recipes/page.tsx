"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RecipesListPage() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const res = await fetch("/api/recipes");
        if (!res.ok) throw new Error("Failed to fetch recipes");
        const data = await res.json();
        setRecipes(data);
      } catch (e: any) {
        setError(e.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchRecipes();
  }, []);

  const filtered = recipes.filter((recipe: any) => {
    // Support both flat and legacy Airtable structure
    const name = (recipe.title || recipe.fields?.Title || '').toLowerCase();
    const description = (recipe.description || recipe.fields?.Description || '').toLowerCase();
    // Prefer flat structure for ingredients, fallback to fields.Ingredients (array of names)
    const ingredients = Array.isArray(recipe.ingredients)
      ? recipe.ingredients.map((ing: any) => ing.name).join(", ").toLowerCase()
      : Array.isArray(recipe.fields?.Ingredients)
        ? recipe.fields.Ingredients.join(", ").toLowerCase()
        : '';
    const q = search.toLowerCase();
    return (
      name.includes(q) ||
      description.includes(q) ||
      ingredients.includes(q)
    );
  });

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">All Recipes</h1>
      <div className="mb-6 flex gap-2 items-center">
        <Input
          placeholder="Search by name, ingredient, or description..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1"
        />
        <Button variant="outline" onClick={() => setSearch("")}>Clear</Button>
      </div>
      {loading && <div>Loading recipes...</div>}
      {error && <div className="text-red-600">{error}</div>}
      <div className="grid gap-6">
        {filtered.map((recipe: any) => (
          <Link key={recipe.id} href={`/recipes/${recipe.id}`} passHref>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle>{recipe.title || recipe.fields?.Title || "Untitled Recipe"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-gray-700 mb-2">
                  {recipe.description || recipe.fields?.Description || "No description."}
                </div>
                {/* Show all ingredients with quantity/unit/name if available, else fallback to names */}
                {Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0 ? (
                  <div className="mb-2 text-sm text-gray-600">
                    <strong>Ingredients:</strong> {recipe.ingredients.map((ing: any) => `${ing.quantity ? ing.quantity + ' ' : ''}${ing.unit ? ing.unit + ' ' : ''}${ing.name}`).join(', ')}
                  </div>
                ) : Array.isArray(recipe.fields?.Ingredients) && recipe.fields.Ingredients.length > 0 ? (
                  <div className="mb-2 text-sm text-gray-600">
                    <strong>Ingredients:</strong> {recipe.fields.Ingredients.join(', ')}
                  </div>
                ) : null}

                {/* Show servings, prep time, cook time if available */}
                <div className="mb-2 flex flex-wrap gap-4 text-xs text-gray-500">
                  {recipe.servings && <span>Servings: {recipe.servings}</span>}
                  {recipe.prep_time_minutes && <span>Prep: {recipe.prep_time_minutes} min</span>}
                  {recipe.cook_time_minutes && <span>Cook: {recipe.cook_time_minutes} min</span>}
                </div>

                {/* Show all instructions if available */}
                {Array.isArray(recipe.instructions) && recipe.instructions.length > 0 && (
                  <ol className="mb-2 text-xs text-gray-700 list-decimal list-inside">
                    {[...recipe.instructions]
                      .sort((a, b) => (a.order || 0) - (b.order || 0))
                      .map((inst, i) => (
                        <li key={i}>{inst.text}</li>
                      ))}
                  </ol>
                )}

                <Button variant="secondary" size="sm">View Details</Button>
              </CardContent>
            </Card>
          </Link>
        ))}
        {!loading && filtered.length === 0 && (
          <div className="text-gray-500 text-center">No recipes found.</div>
        )}
      </div>
    </div>
  );
} 