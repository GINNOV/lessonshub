// file: src/app/api/dictionary/route.ts
import { NextResponse } from 'next/server';

const DICTIONARY_ENDPOINT = 'https://api.dictionaryapi.dev/api/v2/entries/en';

const extractDefinition = (payload: any): string | null => {
  if (!Array.isArray(payload) || payload.length === 0) return null;
  for (const entry of payload) {
    const meanings = Array.isArray(entry?.meanings) ? entry.meanings : [];
    for (const meaning of meanings) {
      const definitions = Array.isArray(meaning?.definitions) ? meaning.definitions : [];
      for (const def of definitions) {
        const definition = typeof def?.definition === 'string' ? def.definition.trim() : '';
        if (definition) return definition;
      }
    }
  }
  return null;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const word = (searchParams.get('word') || '').trim();
  if (!word) {
    return new NextResponse(JSON.stringify({ error: 'Missing word.' }), { status: 400 });
  }

  try {
    const response = await fetch(`${DICTIONARY_ENDPOINT}/${encodeURIComponent(word)}`);
    if (!response.ok) {
      return NextResponse.json({ definition: 'No definition available.' }, { status: 200 });
    }
    const data = await response.json();
    const definition = extractDefinition(data) || 'No definition available.';
    return NextResponse.json({ definition }, { status: 200 });
  } catch (error) {
    console.error('DICTIONARY_LOOKUP_ERROR', error);
    return NextResponse.json({ definition: 'No definition available.' }, { status: 200 });
  }
}
