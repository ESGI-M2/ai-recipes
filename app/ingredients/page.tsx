'use client';

import { useEffect, useState } from "react";

export default function IngredientsPage() {
    // get all ingredients from Airtable
    const [ingredients, setIngredients] = useState([]);

    useEffect(() => {
        const fetchIngredients = async () => {
            try {
                const response = await fetch('/api/ingredients');
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const data = await response.json();
                setIngredients(data);
            } catch (error) {
                console.error('Error fetching ingredients:', error);
            }
        };

        fetchIngredients();
    }, []);

    return (
        <div>
            <h1>Ingredients</h1>
            <p>This page will display a list of ingredients.</p>
            {/* You can add more content here, such as a list of ingredients or a form to add new ingredients */}

            <ul>
                {ingredients && ingredients.map((ingredient) => (
                    <li key={ingredient.id}>
                        {ingredient.fields.Name} - {ingredient.fields.Description}
                    </li>
                ))}
            </ul>
        </div>
    );
}