import { NextResponse } from 'next/server';
import { getRecords, createRecord } from '@/lib/axios';
import { AirtableTables } from '@/constants/airtable';

export async function GET() {
    try {
        const ingredients = await getRecords(AirtableTables.INGREDIENTS, {
            sort: [{ field: 'Name', direction: 'asc' }],
        });
        console.log('Ingredients:', ingredients);
        return NextResponse.json(ingredients);
    } catch (error) {
        console.error('Error fetching ingredients:', error);
        return NextResponse.json({ error: 'Failed to fetch ingredients' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { name } = await req.json();
        if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        const created = await createRecord(AirtableTables.INGREDIENTS, { Name: name });
        return NextResponse.json(created);
    } catch (error) {
        console.error('Error creating ingredient:', error);
        return NextResponse.json({ error: 'Failed to create ingredient' }, { status: 500 });
    }
}