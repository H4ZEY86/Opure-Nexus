import React, { useState, useEffect, useRef } from 'react';
import { useDiscord } from '../../contexts/DiscordContextDirect';

interface StoryState {
  currentScene: string;
  inventory: string[];
  health: number;
  gold: number;
  experience: number;
  level: number;
  chapter: number;
  choices: string[];
  story: string;
  gameOver: boolean;
  victory: boolean;
}

interface GameLog {
  type: 'story' | 'choice' | 'action' | 'system';
  text: string;
  timestamp: number;
}

// Predefined story branches and AI-generated content
const STORY_TEMPLATES = {
  fantasy: {
    title: "🏰 The Crystal of Eternal Night",
    intro: "You awaken in a mysterious forest, moonlight filtering through ancient oaks. A glowing crystal fragment pulses in your hand, and whispers of an ancient curse echo in the wind. The village of Millhaven lies ahead, but dark creatures stalk the shadows...",
    scenes: {
      forest: {
        description: "Ancient trees tower above you, their twisted branches forming a canopy that blocks most light. Strange blue fires dance between the trunks, and you hear the distant howling of wolves.",
        choices: [
          "Follow the blue fires deeper into the forest",
          "Head toward the village lights in the distance",
          "Climb a tree to get a better view of the area",
          "Examine the crystal fragment more closely"
        ]
      },
      village: {
        description: "Millhaven is eerily quiet. Most windows are boarded up, and only a few dim candles flicker in the darkness. An old tavern sign creaks in the wind: 'The Prancing Pony'.",
        choices: [
          "Enter the tavern to look for information",
          "Search the abandoned houses for supplies",
          "Visit the village shrine in the town square",
          "Look for the village elder's house"
        ]
      },
      tavern: {
        description: "Inside the tavern, a hooded figure sits alone in the corner. The barkeeper nervously polishes glasses while glancing at you. A fire crackles in the hearth, casting dancing shadows on the walls.",
        choices: [
          "Approach the hooded figure",
          "Talk to the nervous barkeeper",
          "Examine the wanted posters on the wall",
          "Order a drink and listen for gossip"
        ]
      },
      dungeon: {
        description: "Stone corridors stretch before you, lit by flickering torches. The air is thick with ancient magic, and you hear the echo of dripping water somewhere in the distance. Your crystal fragment glows brighter here.",
        choices: [
          "Follow the main corridor deeper into the dungeon",
          "Take the narrow side passage to the left",
          "Investigate the glowing runes on the wall",
          "Use your crystal to reveal hidden passages"
        ]
      }
    }
  },
  scifi: {
    title: "🚀 Station Omega-7: Last Hope",
    intro: "Red emergency lights flash as you wake from cryosleep aboard Station Omega-7. The AI's voice crackles through damaged speakers: 'Critical system failure... crew status unknown... alien contact detected...' Through the viewport, an alien vessel drifts closer.",
    scenes: {
      cryobay: {
        description: "Empty cryopods line the walls, their glass covers shattered. Bio-fluid pools on the metal floor, and you notice claw marks on several pods. Your oxygen meter shows 78% remaining.",
        choices: [
          "Check the other cryopods for survivors",
          "Access the nearest terminal for ship status",
          "Head to the bridge to assess the situation",
          "Arm yourself from the emergency weapons locker"
        ]
      },
      bridge: {
        description: "The bridge is a mess of sparking consoles and flickering screens. The captain's chair is empty but stained with something dark. Through the main viewport, you see the alien ship extending tentacle-like docking arms.",
        choices: [
          "Try to establish communication with the aliens",
          "Activate the ship's defensive systems",
          "Check the ship's logs for what happened",
          "Prepare to abandon ship in an escape pod"
        ]
      },
      engineering: {
        description: "The engine room hums with unstable energy. Plasma conduits glow dangerously bright, and the fusion reactor readings are deep in the red zone. Warning klaxons blare continuously.",
        choices: [
          "Attempt to stabilize the fusion reactor",
          "Reroute power to essential systems only",
          "Prepare the reactor for emergency shutdown",
          "Use the maintenance tunnels to reach other sections"
        ]
      }
    }
  },
  horror: {
    title: "🏚️ The Mansion on Hollow Hill",
    intro: "Rain pounds against the windows of Blackwood Manor as you stand in the grand foyer. You've inherited this estate from a distant relative you never knew existed. The locals warned you not to come here after dark, but the will specified midnight...",
    scenes: {
      foyer: {
        description: "A grand staircase curves up to the second floor, its banister covered in dust. Portraits line the walls, their eyes seeming to follow you. A grandfather clock ticks ominously, showing 11:47 PM.",
        choices: [
          "Examine the family portraits more closely",
          "Go upstairs to explore the bedrooms",
          "Check the kitchen for any recent activity",
          "Investigate the basement door under the stairs"
        ]
      },
      library: {
        description: "Floor-to-ceiling bookshelves filled with ancient tomes surround you. Several books lie open on a reading table, their pages yellowed with age. A fire burns in the fireplace, though you didn't light it.",
        choices: [
          "Read the open books on the table",
          "Search for hidden passages behind the bookshelves",
          "Examine the family genealogy records",
          "Investigate who lit the fire"
        ]
      },
      basement: {
        description: "Stone walls weep with moisture, and the air carries the scent of decay. Strange symbols are carved into the floor, and in the center sits an ornate mirror that doesn't reflect your image.",
        choices: [
          "Touch the mysterious mirror",
          "Examine the carved symbols on the floor",
          "Look for a way to escape the basement",
          "Call out to see if anyone else is down here"
        ]
      }
    }
  }
};

// AI Story Generator using local processing
class AIStoryGenerator {
  private static generateResponse(context: string, choice: string, genre: string): string {
    // This would typically call your AI API, but for demo purposes, we'll use template responses
    const responses = {
      fantasy: [
        "The ancient magic responds to your presence, revealing hidden truths about your quest.",
        "A mystical creature appears, offering cryptic advice about the path ahead.",
        "The crystal fragment pulses with power, showing you glimpses of possible futures.",
        "Dark forces sense your movement and begin to converge on your location."
      ],
      scifi: [
        "Ship sensors detect anomalous readings from your chosen action.",
        "The alien vessel responds to your decision with unexpected behavior.",
        "Critical system alerts flash as your choice affects the ship's status.",
        "Bio-readings suggest other life forms are reacting to your presence."
      ],
      horror: [
        "The house seems to shift and breathe around you as you make your choice.",
        "Shadows move in ways that defy natural light, watching your every move.",
        "A chill runs down your spine as your decision awakens something in the darkness.",
        "The very walls seem to whisper warnings about the path you've chosen."
      ]
    };

    const genreResponses = responses[genre as keyof typeof responses] || responses.fantasy;
    return genreResponses[Math.floor(Math.random() * genreResponses.length)];
  }

  static async generateStoryResponse(
    context: string, 
    playerChoice: string, 
    gameState: StoryState
  ): Promise<{ story: string; choices: string[]; newState: Partial<StoryState> }> {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const genre = gameState.currentScene.includes('forest') || gameState.currentScene.includes('village') ? 'fantasy' :
                  gameState.currentScene.includes('station') || gameState.currentScene.includes('bridge') ? 'scifi' : 'horror';

    // Generate story continuation
    const storyResponse = this.generateResponse(context, playerChoice, genre);
    
    // Generate consequences based on choice
    const consequences = this.generateConsequences(playerChoice, gameState);
    
    // Generate new choices
    const newChoices = this.generateNewChoices(gameState.currentScene, playerChoice);

    return {
      story: storyResponse,
      choices: newChoices,
      newState: consequences
    };
  }

  private static generateConsequences(choice: string, state: StoryState): Partial<StoryState> {
    const consequences: Partial<StoryState> = {};

    // Health/damage consequences
    if (choice.toLowerCase().includes('fight') || choice.toLowerCase().includes('attack')) {
      consequences.health = Math.max(0, state.health - Math.floor(Math.random() * 20) - 10);
      consequences.experience = state.experience + 25;
    }

    // Gold/treasure consequences
    if (choice.toLowerCase().includes('search') || choice.toLowerCase().includes('loot')) {
      consequences.gold = state.gold + Math.floor(Math.random() * 50) + 10;
    }

    // Level up check
    if (state.experience >= state.level * 100) {
      consequences.level = state.level + 1;
      consequences.health = Math.min(100, state.health + 20);
    }

    // Random events
    if (Math.random() < 0.1) {
      const events = ['found_potion', 'found_weapon', 'trap_triggered', 'ally_found'];
      const event = events[Math.floor(Math.random() * events.length)];
      
      switch (event) {
        case 'found_potion':
          consequences.health = Math.min(100, state.health + 30);
          break;
        case 'trap_triggered':
          consequences.health = Math.max(0, state.health - 15);
          break;
      }
    }

    return consequences;
  }

  private static generateNewChoices(scene: string, lastChoice: string): string[] {
    const choiceTemplates = {
      exploration: [
        "Continue exploring the area carefully",
        "Search for hidden secrets or passages",
        "Rest and recover your strength",
        "Try a different approach to the situation"
      ],
      combat: [
        "Fight with everything you have",
        "Try to negotiate or find peaceful solution",
        "Look for an escape route",
        "Use your special abilities or items"
      ],
      mystery: [
        "Investigate the clues more thoroughly",
        "Ask questions to gather more information", 
        "Make a bold decision based on your intuition",
        "Look for help from others"
      ],
      survival: [
        "Focus on finding safety and shelter",
        "Gather resources and supplies",
        "Try to contact others for help",
        "Push forward despite the dangers"
      ]
    };

    const templates = Object.values(choiceTemplates);
    return templates[Math.floor(Math.random() * templates.length)];
  }
}

export default function AIDungeonQuest({ onGameEnd }: { onGameEnd: (score: number) => void }) {
  const { user } = useDiscord();
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [gameState, setGameState] = useState<StoryState>({
    currentScene: 'start',
    inventory: [],
    health: 100,
    gold: 50,
    experience: 0,
    level: 1,
    chapter: 1,
    choices: [],
    story: '',
    gameOver: false,
    victory: false
  });
  const [gameLog, setGameLog] = useState<GameLog[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [gameLog]);

  // Initialize game with selected genre
  const startGame = (genre: string) => {
    setSelectedGenre(genre);
    const template = STORY_TEMPLATES[genre as keyof typeof STORY_TEMPLATES];
    
    const initialState: StoryState = {
      currentScene: Object.keys(template.scenes)[0],
      inventory: [],
      health: 100,
      gold: 50,
      experience: 0,
      level: 1,
      chapter: 1,
      choices: template.scenes[Object.keys(template.scenes)[0] as keyof typeof template.scenes].choices,
      story: template.intro,
      gameOver: false,
      victory: false
    };

    setGameState(initialState);
    setGameLog([
      {
        type: 'system',
        text: `🎮 Starting: ${template.title}`,
        timestamp: Date.now()
      },
      {
        type: 'story',
        text: template.intro,
        timestamp: Date.now() + 1
      }
    ]);
  };

  // Handle player choice
  const makeChoice = async (choiceIndex: number) => {
    const choice = gameState.choices[choiceIndex];
    if (!choice || isProcessing) return;

    setIsProcessing(true);

    // Add choice to log
    setGameLog(prev => [...prev, {
      type: 'choice',
      text: `> ${choice}`,
      timestamp: Date.now()
    }]);

    try {
      // Generate AI response
      const response = await AIStoryGenerator.generateStoryResponse(
        gameState.story + '\n\nPlayer chose: ' + choice,
        choice,
        gameState
      );

      // Update game state
      const newState = {
        ...gameState,
        ...response.newState,
        story: response.story,
        choices: response.choices
      };

      // Check for game over conditions
      if (newState.health <= 0) {
        newState.gameOver = true;
        newState.choices = [];
      } else if (newState.experience >= 500) {
        newState.victory = true;
        newState.choices = [];
      }

      setGameState(newState);

      // Add story response to log
      setGameLog(prev => [...prev, {
        type: 'story',
        text: response.story,
        timestamp: Date.now()
      }]);

      // Add system messages for state changes
      if (response.newState.health !== undefined && response.newState.health < gameState.health) {
        setGameLog(prev => [...prev, {
          type: 'system',
          text: `💔 Health decreased to ${response.newState.health}`,
          timestamp: Date.now() + 1
        }]);
      }

      if (response.newState.gold !== undefined && response.newState.gold > gameState.gold) {
        setGameLog(prev => [...prev, {
          type: 'system',
          text: `💰 Found ${response.newState.gold - gameState.gold} gold!`,
          timestamp: Date.now() + 2
        }]);
      }

      if (response.newState.level !== undefined && response.newState.level > gameState.level) {
        setGameLog(prev => [...prev, {
          type: 'system',
          text: `⭐ Level up! You are now level ${response.newState.level}!`,
          timestamp: Date.now() + 3
        }]);
      }

      // Check for game end
      if (newState.gameOver || newState.victory) {
        setTimeout(() => {
          const finalScore = newState.experience + newState.gold + (newState.level * 100);
          onGameEnd(finalScore);
        }, 2000);
      }

    } catch (error) {
      console.error('Error generating story response:', error);
      setGameLog(prev => [...prev, {
        type: 'system',
        text: '⚠️ The magical energies flicker... something went wrong with the storytelling magic.',
        timestamp: Date.now()
      }]);
    }

    setIsProcessing(false);
  };

  // Genre selection screen
  if (!selectedGenre) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-white mb-4">
            🧙‍♂️ AI DUNGEON QUEST
          </h1>
          <p className="text-white/80 text-xl mb-8">
            Choose your adventure! Each story is unique with AI-generated content.
          </p>
          <p className="text-white/60 text-sm mb-12">
            Welcome {user?.username || user?.global_name || 'Adventurer'}!
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(STORY_TEMPLATES).map(([key, template]) => (
              <button
                key={key}
                onClick={() => startGame(key)}
                className="bg-gradient-to-b from-purple-600 to-purple-800 p-6 rounded-2xl text-white hover:scale-105 active:scale-95 transition-transform"
              >
                <h3 className="text-2xl font-bold mb-4">{template.title}</h3>
                <p className="text-white/90 mb-4 text-sm">{template.intro.substring(0, 150)}...</p>
                <div className="text-purple-200 text-sm">Click to Begin</div>
              </button>
            ))}
          </div>

          <div className="mt-12 text-white/60 text-sm">
            <p>🤖 Powered by AI storytelling • Every playthrough is unique</p>
            <p>💡 Your choices matter and affect the story outcome</p>
          </div>
        </div>
      </div>
    );
  }

  // Game over screen
  if (gameState.gameOver || gameState.victory) {
    const finalScore = gameState.experience + gameState.gold + (gameState.level * 100);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-black flex items-center justify-center p-4">
        <div className="text-center text-white max-w-2xl">
          <h2 className="text-4xl font-bold mb-4">
            {gameState.victory ? '🏆 QUEST COMPLETE!' : '💀 QUEST FAILED'}
          </h2>
          <div className="text-xl mb-6">
            {gameState.victory 
              ? 'You have completed your legendary adventure!' 
              : 'Your adventure has come to an end...'}
          </div>
          
          <div className="bg-black/40 p-6 rounded-lg mb-6">
            <h3 className="text-2xl font-bold mb-4">Final Statistics</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>Final Score: {finalScore.toLocaleString()}</div>
              <div>Level Reached: {gameState.level}</div>
              <div>Experience: {gameState.experience}</div>
              <div>Gold Collected: {gameState.gold}</div>
              <div>Health: {gameState.health}/100</div>
              <div>Chapter: {gameState.chapter}</div>
            </div>
          </div>

          <button
            onClick={() => setSelectedGenre(null)}
            className="bg-purple-500 text-white px-8 py-4 rounded-lg font-bold hover:scale-105 mr-4"
          >
            New Adventure
          </button>
        </div>
      </div>
    );
  }

  // Main game interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <div className="bg-black/30 p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">
          {STORY_TEMPLATES[selectedGenre as keyof typeof STORY_TEMPLATES].title}
        </h1>
        <button
          onClick={() => setShowStats(!showStats)}
          className="text-white/80 hover:text-white text-sm"
        >
          {showStats ? 'Hide Stats' : 'Show Stats'}
        </button>
      </div>

      <div className="flex h-screen">
        {/* Stats Panel */}
        {showStats && (
          <div className="w-64 bg-black/40 p-4 text-white text-sm border-r border-white/20">
            <h3 className="font-bold mb-4 text-lg">Character Stats</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Health:</span>
                <span className={gameState.health < 30 ? 'text-red-400' : 'text-green-400'}>
                  {gameState.health}/100
                </span>
              </div>
              <div className="flex justify-between">
                <span>Level:</span>
                <span className="text-yellow-400">{gameState.level}</span>
              </div>
              <div className="flex justify-between">
                <span>Experience:</span>
                <span className="text-blue-400">{gameState.experience}</span>
              </div>
              <div className="flex justify-between">
                <span>Gold:</span>
                <span className="text-yellow-400">{gameState.gold}</span>
              </div>
              <div className="flex justify-between">
                <span>Chapter:</span>
                <span className="text-purple-400">{gameState.chapter}</span>
              </div>
            </div>

            {gameState.inventory.length > 0 && (
              <div className="mt-6">
                <h4 className="font-bold mb-2">Inventory:</h4>
                <div className="text-xs space-y-1">
                  {gameState.inventory.map((item, idx) => (
                    <div key={idx} className="text-gray-300">• {item}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-white/20">
              <div className="text-xs text-white/60">
                Player: {user?.username || 'Adventurer'}
              </div>
            </div>
          </div>
        )}

        {/* Main Game Area */}
        <div className="flex-1 flex flex-col">
          {/* Story Log */}
          <div 
            ref={logRef}
            className="flex-1 p-6 overflow-y-auto bg-black/20"
          >
            <div className="max-w-4xl mx-auto space-y-4">
              {gameLog.map((entry, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg ${
                    entry.type === 'story' 
                      ? 'bg-blue-900/40 text-white' 
                      : entry.type === 'choice'
                      ? 'bg-green-900/40 text-green-200 ml-8'
                      : entry.type === 'system'
                      ? 'bg-purple-900/40 text-purple-200'
                      : 'bg-gray-900/40 text-gray-300'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{entry.text}</div>
                  {entry.type === 'story' && (
                    <div className="text-xs text-white/40 mt-2">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              ))}

              {isProcessing && (
                <div className="bg-yellow-900/40 p-4 rounded-lg text-yellow-200 text-center">
                  🤖 The AI storyteller is weaving your tale... Please wait...
                </div>
              )}
            </div>
          </div>

          {/* Choices Panel */}
          {gameState.choices.length > 0 && !isProcessing && (
            <div className="bg-black/40 p-6 border-t border-white/20">
              <h3 className="text-white font-bold mb-4 text-center">What do you do?</h3>
              <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-3">
                {gameState.choices.map((choice, index) => (
                  <button
                    key={index}
                    onClick={() => makeChoice(index)}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white p-4 rounded-lg text-left transition-colors border border-white/20 hover:border-white/40"
                  >
                    <div className="font-medium">{index + 1}. {choice}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}