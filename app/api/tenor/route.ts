import { NextRequest, NextResponse } from 'next/server';

const GIPHY_API_URL = 'https://api.giphy.com/v1';

export async function GET(request: NextRequest) {
    const apiKey = process.env.GIPHY_API_KEY;

    if (!apiKey) {
        return NextResponse.json({ error: 'GIPHY_API_KEY not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const contentType = searchParams.get('content') || 'gifs'; // 'gifs' or 'stickers'

    try {
        let url: string;
        const endpoint = contentType === 'stickers' ? 'stickers' : 'gifs';

        if (!query) {
            // Get trending
            url = `${GIPHY_API_URL}/${endpoint}/trending?api_key=${apiKey}&limit=20&rating=pg-13`;
        } else {
            // Search
            url = `${GIPHY_API_URL}/${endpoint}/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=20&rating=pg-13`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json({ error: data.message || 'GIPHY API error' }, { status: response.status });
        }

        // Extract just the data we need
        const gifs = data.data?.map((item: {
            id: string;
            title: string;
            images: {
                fixed_height_small: { url: string };
                fixed_height: { url: string };
                original: { url: string };
            };
        }) => ({
            id: item.id,
            title: item.title,
            preview: item.images.fixed_height_small?.url || item.images.fixed_height?.url,
            url: item.images.fixed_height?.url || item.images.original?.url,
        })) || [];

        return NextResponse.json({ gifs });
    } catch (error) {
        console.error('GIPHY API error:', error);
        return NextResponse.json({ error: 'Failed to fetch GIFs' }, { status: 500 });
    }
}
