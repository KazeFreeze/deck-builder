import { db } from '@/lib/firebaseAdmin';
import { DeckBuilderClient } from '@/components/DeckBuilderClient';

// --- Type Definitions ---
export interface Deck {
  id: string;
  title: string;
  type: 'flashcards' | 'multiplechoice';
  // questions will not be fetched on the main page for performance
}

export interface Set {
  id: string;
  title: string;
  description: string;
  deckIds: string[];
}

// --- Data Fetching ---
async function getDecks(): Promise<Deck[]> {
    const decksSnapshot = await db.collection('decks').get();
    // We only fetch the title and type, not the full question list
    return decksSnapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title,
        type: doc.data().type,
    }));
}

async function getSets(): Promise<Set[]> {
    const setsSnapshot = await db.collection('sets').get();
    return setsSnapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title,
        description: doc.data().description,
        deckIds: doc.data().deckIds,
    }));
}


export default async function Home() {
  const allDecks = await getDecks();
  const allSets = await getSets();

  const flashcardDecks = allDecks.filter(deck => deck.type === 'flashcards');
  const multipleChoiceDecks = allDecks.filter(deck => deck.type === 'multiplechoice');

  return (
    <main className="container mx-auto p-4 md:p-8">
      <header className="text-center my-8">
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">
          Study Deck Builder
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Select decks, arrange them, and start your study session!
        </p>
      </header>

      <DeckBuilderClient
        flashcardDecks={flashcardDecks}
        multipleChoiceDecks={multipleChoiceDecks}
        sets={allSets}
      />
    </main>
  );
}