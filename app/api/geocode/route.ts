import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    if (!q) {
        return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    try {
        // app/api/geocode/route.ts
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&extratags=1&limit=10`,
            {
                headers: {
                    'User-Agent': 'SL-Business-Index-App',
                    'Accept-Language': 'en,ta,si', // தமிழ் மற்றும் சிங்களப் பெயர்களையும் தேட உதவும்
                },
            }
        );
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }
}