import { NextResponse } from 'next/server';
import { getRecords, createRecord, updateRecord, deleteRecord } from '@/lib/axios';
import { AirtableTables } from '@/constants/airtable';

export async function GET() {
    try {
        const intolerances = await getRecords(AirtableTables.FOOD_INTOLERANCES, {
            sort: [{ field: 'Name', direction: 'asc' }],
        });
        return NextResponse.json(intolerances);
    } catch (error) {
        console.error('Error fetching intolerances:', error);
        return NextResponse.json({ error: 'Failed to fetch intolerances' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { name, description, severity_level } = await req.json();
        if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        const fields: Record<string, unknown> = { Name: name };
        const created = await createRecord(AirtableTables.FOOD_INTOLERANCES, fields);
        return NextResponse.json(created);
    } catch (error) {
        console.error('Error creating intolerance:', error);
        return NextResponse.json({ error: 'Failed to create intolerance' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    try {
        const { name } = await req.json();
        if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        const updated = await updateRecord(AirtableTables.FOOD_INTOLERANCES, id, { Name: name });
        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating intolerance:', error);
        return NextResponse.json({ error: 'Failed to update intolerance' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    try {
        await deleteRecord(AirtableTables.FOOD_INTOLERANCES, id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting intolerance:', error);
        return NextResponse.json({ error: 'Failed to delete intolerance' }, { status: 500 });
    }
} 