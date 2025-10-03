"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// --- Type Definitions ---
interface Deck {
  id: string;
  title: string;
  type: 'flashcards' | 'multiplechoice';
}

interface Set {
  id: string;
  title: string;
  description: string;
  deckIds: string[];
}

interface DeckBuilderClientProps {
  flashcardDecks: Deck[];
  multipleChoiceDecks: Deck[];
  sets: Set[];
}

export function DeckBuilderClient({ flashcardDecks, multipleChoiceDecks, sets }: DeckBuilderClientProps) {
  const router = useRouter();
  const [selectedDecks, setSelectedDecks] = useState<Deck[]>([]);
  const [shuffle, setShuffle] = useState(true);
  const [timer, setTimer] = useState(true);
  const [showExplanation, setShowExplanation] = useState(false);

  const handleStartStudying = () => {
    if (selectedDecks.length === 0) {
      alert("Please select at least one deck to start studying.");
      return;
    }
    const deckIds = selectedDecks.map(deck => deck.id).join(',');
    const params = new URLSearchParams({
        shuffle: String(shuffle),
        timer: String(timer),
        showExplanation: String(showExplanation),
    });
    router.push(`/study/${deckIds}?${params.toString()}`);
  };

  const handleSetSelection = (setId: string) => {
    const selectedSet = sets.find(s => s.id === setId);
    if (selectedSet) {
        const allDecks = [...flashcardDecks, ...multipleChoiceDecks];
        const decksForSet = selectedSet.deckIds.map(id => allDecks.find(d => d.id === id)).filter(Boolean) as Deck[];
        setSelectedDecks(decksForSet);
    }
  };

  const toggleDeckSelection = (deck: Deck) => {
    setSelectedDecks(prev =>
        prev.some(d => d.id === deck.id)
            ? prev.filter(d => d.id !== deck.id)
            : [...prev, deck]
    );
  };


  return (
    <div className="space-y-8">
      {/* Pre-configured Sets */}
      <Card>
        <CardHeader>
          <CardTitle>Pre-configured Sets</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup onValueChange={handleSetSelection}>
            {sets.map(set => (
              <div key={set.id} className="flex items-center space-x-2">
                <RadioGroupItem value={set.id} id={set.id} />
                <Label htmlFor={set.id} className="font-medium">{set.title}</Label>
                <p className="text-sm text-muted-foreground ml-4">- {set.description}</p>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Available Decks */}
        <Card>
          <CardHeader>
            <CardTitle>Available Decks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Multiple Choice Decks</h3>
              <div className="space-y-2">
                {multipleChoiceDecks.map(deck => (
                    <Button key={deck.id} variant={selectedDecks.some(d=>d.id === deck.id) ? "default" : "outline"} onClick={() => toggleDeckSelection(deck)} className="w-full justify-start">
                        {deck.title}
                    </Button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Flashcard Decks</h3>
               <div className="space-y-2">
                {flashcardDecks.map(deck => (
                    <Button key={deck.id} variant={selectedDecks.some(d=>d.id === deck.id) ? "default" : "outline"} onClick={() => toggleDeckSelection(deck)} className="w-full justify-start">
                        {deck.title}
                    </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selected Decks */}
        <Card>
          <CardHeader>
            <CardTitle>Selected Study Plan</CardTitle>
          </CardHeader>
          <CardContent>
             {selectedDecks.length === 0 ? (
                <p className="text-muted-foreground">Select decks to add them to your plan.</p>
             ) : (
                <ul className="space-y-2">
                    {selectedDecks.map(deck => (
                        <li key={deck.id} className="flex items-center justify-between bg-secondary p-2 rounded-md">
                            <span>{deck.title}</span>
                            <Button variant="ghost" size="sm" onClick={() => toggleDeckSelection(deck)}>Remove</Button>
                        </li>
                    ))}
                </ul>
             )}
          </CardContent>
        </Card>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
                <Switch id="shuffle-toggle" checked={shuffle} onCheckedChange={setShuffle} />
                <Label htmlFor="shuffle-toggle">Shuffle All Items</Label>
            </div>
            <div className="flex items-center space-x-2">
                <Switch id="timer-toggle" checked={timer} onCheckedChange={setTimer} />
                <Label htmlFor="timer-toggle">Enable Timer</Label>
            </div>
            <div className="flex items-center space-x-2">
                <Switch id="show-explanation-toggle" checked={showExplanation} onCheckedChange={setShowExplanation} />
                <Label htmlFor="show-explanation-toggle">Show Explanation Immediately</Label>
            </div>
        </CardContent>
      </Card>

      {/* Start Button */}
      <div className="text-center">
        <Button size="lg" onClick={handleStartStudying}>
          Start Studying
        </Button>
      </div>
    </div>
  );
}