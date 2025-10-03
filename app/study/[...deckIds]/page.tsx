import { db } from '@/lib/firebaseAdmin';
import { StudySessionClient } from '@/components/StudySessionClient';

// --- Type Definitions ---
interface Question {
  // This will vary between flashcards (q, a) and multiple choice
  [key: string]: any;
}

interface Deck {
  id: string;
  title: string;
  type: 'flashcards' | 'multiplechoice';
  questions: Question[];
}

interface StudyPageProps {
  params: { deckIds: string[] };
  searchParams: {
    shuffle?: string;
    timer?: string;
    showExplanation?: string;
  };
}

// --- Data Fetching ---
async function getStudyDecks(deckIds: string[]): Promise<Deck[]> {
  if (!deckIds || deckIds.length === 0) {
    return [];
  }

  const deckRefs = deckIds.map(id => db.collection('decks').doc(id));
  const deckSnapshots = await db.getAll(...deckRefs);

  return deckSnapshots.map(doc => {
    if (!doc.exists) return null;
    const data = doc.data();
    return {
      id: doc.id,
      title: data?.title,
      type: data?.type,
      questions: data?.questions,
    };
  }).filter((deck): deck is Deck => deck !== null);
}

export default async function StudyPage({ params, searchParams }: StudyPageProps) {
  // The deckIds are passed as a single string, comma-separated.
  const deckIds = params.deckIds[0]?.split(',') || [];

  const decks = await getStudyDecks(deckIds);

  const config = {
    shuffle: searchParams.shuffle === 'true',
    timer: searchParams.timer === 'true',
    showExplanation: searchParams.showExplanation === 'true',
  };

  if (decks.length === 0) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold">No decks found.</h1>
        <p>Please go back to the menu and select some decks to study.</p>
      </div>
    );
  }

  return <StudySessionClient decks={decks} config={config} />;
}