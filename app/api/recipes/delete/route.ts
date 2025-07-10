import { NextResponse } from 'next/server';
import { deleteRecord } from '@/lib/axios';
import { AirtableTables } from '@/constants/airtable';

export const runtime = 'edge';

export async function DELETE(req: Request) {
  try {
    const { recipeId } = await req.json();
    
    if (!recipeId) {
      return NextResponse.json({ error: 'Recipe ID is required' }, { status: 400 });
    }

    // Supprimer la recette principale
    await deleteRecord(AirtableTables.RECIPES, recipeId);

    // Note: Les enregistrements liés (ingrédients, instructions) seront supprimés automatiquement
    // par Airtable grâce aux relations configurées

    return NextResponse.json({ success: true, message: 'Recipe deleted successfully' });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    return NextResponse.json(
      { error: (error as Error)?.message || 'Failed to delete recipe' }, 
      { status: 500 }
    );
  }
} 