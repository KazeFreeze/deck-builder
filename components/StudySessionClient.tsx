"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Home, Clock, Star, CheckCircle, XCircle } from 'lucide-react';

// --- Type Definitions ---
interface Question {
    [key: string]: any;
}

interface Deck {
    id: string;
    title: string;
    type: 'flashcards' | 'multiplechoice';
    questions: Question[];
}

interface StudySessionProps {
    decks: Deck[];
    config: {
        shuffle: boolean;
        timer: boolean;
        showExplanation: boolean;
    };
}

interface StudyItem {
    deckTitle: string;
    type: 'flashcards' | 'multiplechoice';
    question: Question;
}

// --- Helper Functions ---
function shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// --- Main Component ---
export function StudySessionClient({ decks, config }: StudySessionProps) {
    const router = useRouter();
    const [isFlipped, setIsFlipped] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [score, setScore] = useState(0);
    const [time, setTime] = useState(0);
    const [userAnswers, setUserAnswers] = useState<(string | null)[]>([]);

    const studyItems: StudyItem[] = useMemo(() => {
        let allItems: StudyItem[] = [];
        decks.forEach(deck => {
            deck.questions.forEach(question => {
                allItems.push({
                    deckTitle: deck.title,
                    type: deck.type,
                    question: question,
                });
            });
        });
        return config.shuffle ? shuffleArray(allItems) : allItems;
    }, [decks, config.shuffle]);

    const [currentIndex, setCurrentIndex] = useState(0);
    const currentItem = studyItems[currentIndex];

    // Timer Logic
    useEffect(() => {
        if (!config.timer) return;
        const interval = setInterval(() => {
            setTime(prevTime => prevTime + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [config.timer]);

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const handleNext = () => {
        if (currentItem.type === 'multiplechoice' && selectedAnswer) {
             const isCorrect = selectedAnswer === currentItem.question.correctAnswer;
             if(isCorrect) setScore(s => s + 1);
        }
        if (currentIndex < studyItems.length - 1) {
            setCurrentIndex(i => i + 1);
            setIsFlipped(false);
            setSelectedAnswer(null);
        }
    };

    const handleBack = () => {
        if (currentIndex > 0) {
            setCurrentIndex(i => i - 1);
            setIsFlipped(false);
            setSelectedAnswer(null);
        }
    };

    const renderFlashcard = (item: StudyItem) => (
        <div className="perspective-1000">
            <Card
                className={`transform-style-3d transition-transform duration-700 ${isFlipped ? 'rotate-y-180' : ''}`}
                onClick={() => setIsFlipped(!isFlipped)}
            >
                {/* Front of the card */}
                <div className="backface-hidden w-full h-full p-6 flex items-center justify-center text-center">
                    <p className="text-xl md:text-2xl">{item.question.q}</p>
                </div>
                {/* Back of the card */}
                <div className="backface-hidden w-full h-full p-6 flex items-center justify-center text-center absolute top-0 left-0 rotate-y-180 bg-card">
                    <p className="text-xl md:text-2xl font-semibold">{item.question.a}</p>
                </div>
            </Card>
        </div>
    );

    const renderMultipleChoice = (item: StudyItem) => {
        const isAnswered = selectedAnswer !== null;
        const choices = Object.entries(item.question.choices as Record<string, string>);

        return (
            <Card>
                <CardHeader>
                    <CardTitle>{item.question.question}</CardTitle>
                </CardHeader>
                <CardContent>
                    <RadioGroup value={selectedAnswer ?? undefined} onValueChange={setSelectedAnswer} disabled={isAnswered}>
                        {choices.map(([key, value]) => {
                            const isCorrect = key === item.question.correctAnswer;
                            const isSelected = key === selectedAnswer;
                            let stateIndicator = null;
                            if(isAnswered) {
                                if(isCorrect) stateIndicator = <CheckCircle className="text-green-500"/>;
                                else if(isSelected) stateIndicator = <XCircle className="text-red-500"/>;
                            }

                            return (
                                <div key={key} className="flex items-center space-x-2 p-2 rounded-md">
                                    <RadioGroupItem value={key} id={key} />
                                    <Label htmlFor={key} className="flex-1">{value}</Label>
                                    {stateIndicator}
                                </div>
                            );
                        })}
                    </RadioGroup>
                </CardContent>
                {isAnswered && config.showExplanation && (
                    <CardFooter>
                        <p className="text-sm text-muted-foreground"><span className="font-bold">Explanation:</span> {item.question.explanation}</p>
                    </CardFooter>
                )}
            </Card>
        );
    };

    if (studyItems.length === 0) {
        return <div>Loading...</div>
    }

    return (
        <div className="container mx-auto p-4 md:p-8 flex flex-col h-screen">
            <header className="flex justify-between items-center mb-4">
                <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
                    <Home className="h-6 w-6" />
                </Button>
                <h1 className="text-xl font-bold text-center truncate px-4">{decks.length > 1 ? "Combined Study Session" : decks[0].title}</h1>
                 <div className="w-10"></div>
            </header>

            {/* Status Bar */}
            <Card className="mb-4">
                <CardContent className="p-4 flex justify-around items-center text-sm md:text-base">
                    {config.timer && (
                        <div className="flex items-center space-x-2">
                            <Clock className="h-5 w-5" />
                            <span>{formatTime(time)}</span>
                        </div>
                    )}
                     <div className="flex flex-col items-center w-1/3">
                        <span>Progress: {currentIndex + 1} / {studyItems.length}</span>
                        <Progress value={((currentIndex + 1) / studyItems.length) * 100} className="w-full mt-1" />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Star className="h-5 w-5" />
                        <span>Score: {score}</span>
                    </div>
                </CardContent>
            </Card>

            {/* Study Area */}
            <main className="flex-grow flex flex-col justify-center">
                 <p className="text-center text-muted-foreground mb-2">{currentItem.deckTitle}</p>
                {currentItem.type === 'flashcards' ? renderFlashcard(currentItem) : renderMultipleChoice(currentItem)}
            </main>

            {/* Navigation */}
            <footer className="flex justify-between items-center mt-4">
                <Button onClick={handleBack} disabled={currentIndex === 0}>Back</Button>
                <Button onClick={handleNext} disabled={currentIndex === studyItems.length - 1}>Next</Button>
            </footer>
        </div>
    );
}