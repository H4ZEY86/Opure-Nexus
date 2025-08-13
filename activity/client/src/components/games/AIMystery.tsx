import React, { useState, useEffect, useRef } from 'react';
import { useDiscord } from '../../contexts/DiscordContextDirect';

interface MysteryCase {
  id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  genre: 'detective' | 'supernatural' | 'cyberpunk' | 'historical';
  suspects: Suspect[];
  evidence: Evidence[];
  locations: Location[];
}

interface Suspect {
  id: string;
  name: string;
  description: string;
  alibi: string;
  motive: string;
  isGuilty: boolean;
  traits: string[];
}

interface Evidence {
  id: string;
  name: string;
  description: string;
  location: string;
  relevance: 'critical' | 'important' | 'minor';
  discovered: boolean;
}

interface Location {
  id: string;
  name: string;
  description: string;
  evidence: string[];
  visited: boolean;
}

interface GameState {
  currentCase: MysteryCase | null;
  discoveredEvidence: Evidence[];
  visitedLocations: string[];
  interviewedSuspects: string[];
  deductions: string[];
  score: number;
  timeRemaining: number;
  gamePhase: 'investigation' | 'solving' | 'completed';
  solution: string;
  correctSolution: boolean;
}

interface Investigation {
  type: 'location' | 'suspect' | 'evidence' | 'deduction' | 'solution';
  text: string;
  timestamp: number;
}

// Mystery cases database
const MYSTERY_CASES: MysteryCase[] = [
  {
    id: 'mansion_murder',
    title: '🏚️ Murder at Blackwood Manor',
    description: 'Lord Blackwood has been found dead in his locked study. Three family members and the butler were in the house. Who is the killer?',
    difficulty: 'Easy',
    genre: 'detective',
    suspects: [
      {
        id: 'lady_blackwood',
        name: 'Lady Margaret Blackwood',
        description: 'The victim\'s wife, recently discovered his affair.',
        alibi: 'Claims she was in the garden during the time of death.',
        motive: 'Divorce would leave her penniless due to prenuptial agreement.',
        isGuilty: false,
        traits: ['vengeful', 'secretive', 'intelligent']
      },
      {
        id: 'son_richard',
        name: 'Richard Blackwood',
        description: 'The victim\'s gambling-addicted son, deep in debt.',
        alibi: 'Says he was on a phone call with his bookie.',
        motive: 'Desperately needed money, inheritance would solve problems.',
        isGuilty: false,
        traits: ['desperate', 'reckless', 'charming']
      },
      {
        id: 'butler_winston',
        name: 'Winston the Butler',
        description: 'Loyal servant for 20 years, recently learned of plans to fire him.',
        alibi: 'Claims he was polishing silver in the pantry.',
        motive: 'About to lose his job and pension after decades of service.',
        isGuilty: true,
        traits: ['bitter', 'methodical', 'overlooked']
      },
      {
        id: 'daughter_emily',
        name: 'Emily Blackwood',
        description: 'The victim\'s daughter, a struggling artist who disagreed with father\'s business practices.',
        alibi: 'Was painting in the attic studio.',
        motive: 'Father threatened to cut off her allowance unless she stopped her activism.',
        isGuilty: false,
        traits: ['idealistic', 'passionate', 'stubborn']
      }
    ],
    evidence: [
      {
        id: 'poison_bottle',
        name: 'Empty Poison Bottle',
        description: 'Found hidden behind books in the study. Contains traces of strychnine.',
        location: 'study',
        relevance: 'critical',
        discovered: false
      },
      {
        id: 'threatening_letter',
        name: 'Threatening Letter',
        description: 'Found in victim\'s desk. "You\'ll pay for what you\'ve done" in typed text.',
        location: 'study',
        relevance: 'important',
        discovered: false
      },
      {
        id: 'gardening_gloves',
        name: 'Muddy Gardening Gloves',
        description: 'Found in the garden shed, but Lady Blackwood claims she wasn\'t gardening.',
        location: 'garden',
        relevance: 'minor',
        discovered: false
      },
      {
        id: 'phone_records',
        name: 'Phone Records',
        description: 'Show no outgoing calls from Richard during the alleged time.',
        location: 'office',
        relevance: 'important',
        discovered: false
      },
      {
        id: 'silver_polish',
        name: 'Silver Polish Can',
        description: 'Nearly full can in pantry, despite butler claiming to polish silver.',
        location: 'pantry',
        relevance: 'important',
        discovered: false
      },
      {
        id: 'paint_palette',
        name: 'Wet Paint Palette',
        description: 'Fresh paint in attic studio confirms Emily was painting.',
        location: 'attic',
        relevance: 'minor',
        discovered: false
      }
    ],
    locations: [
      {
        id: 'study',
        name: 'Lord Blackwood\'s Study',
        description: 'A locked room where the body was found. Books are scattered, desk drawer is open.',
        evidence: ['poison_bottle', 'threatening_letter'],
        visited: false
      },
      {
        id: 'garden',
        name: 'Garden',
        description: 'Well-maintained garden with a tool shed. Recent digging near the roses.',
        evidence: ['gardening_gloves'],
        visited: false
      },
      {
        id: 'pantry',
        name: 'Butler\'s Pantry',
        description: 'Where the silver is stored and polished. Very organized and clean.',
        evidence: ['silver_polish'],
        visited: false
      },
      {
        id: 'attic',
        name: 'Attic Art Studio',
        description: 'Emily\'s creative space with canvases, paints, and natural light.',
        evidence: ['paint_palette'],
        visited: false
      },
      {
        id: 'office',
        name: 'Home Office',
        description: 'Contains family documents, financial records, and communication devices.',
        evidence: ['phone_records'],
        visited: false
      }
    ]
  },
  {
    id: 'cyber_heist',
    title: '💻 The Digital Bank Heist',
    description: 'CyberBank lost $10 million in a sophisticated hack. Four employees had the access needed. Find the inside source.',
    difficulty: 'Medium',
    genre: 'cyberpunk',
    suspects: [
      {
        id: 'sarah_dev',
        name: 'Sarah Chen - Lead Developer',
        description: 'Brilliant programmer with access to core banking systems.',
        alibi: 'Working from home during the hack, has Git commit timestamps.',
        motive: 'Recently denied a promotion and significant raise.',
        isGuilty: false,
        traits: ['genius', 'overlooked', 'perfectionist']
      },
      {
        id: 'marcus_admin',
        name: 'Marcus Thompson - System Admin',
        description: 'Has root access to all servers and security protocols.',
        alibi: 'Claims he was at the office monitoring systems.',
        motive: 'Heavy gambling debts and upcoming divorce.',
        isGuilty: true,
        traits: ['addicted', 'desperate', 'knowledgeable']
      },
      {
        id: 'diana_security',
        name: 'Diana Rodriguez - Security Chief',
        description: 'Oversees all cybersecurity measures and incident response.',
        alibi: 'Was giving a presentation to the board about security upgrades.',
        motive: 'Discovered she was about to be replaced by external consultant.',
        isGuilty: false,
        traits: ['professional', 'proud', 'defensive']
      },
      {
        id: 'kevin_analyst',
        name: 'Kevin Park - Data Analyst',
        description: 'Analyzes transaction patterns and has database access.',
        alibi: 'Was at a coffee shop with receipts and witnesses.',
        motive: 'Whisleblower who exposed bank\'s questionable practices.',
        isGuilty: false,
        traits: ['ethical', 'careful', 'methodical']
      }
    ],
    evidence: [
      {
        id: 'server_logs',
        name: 'Compromised Server Logs',
        description: 'Show unauthorized access using admin credentials during the heist.',
        location: 'server_room',
        relevance: 'critical',
        discovered: false
      },
      {
        id: 'keylogger',
        name: 'Hidden Keylogger',
        description: 'Malware found on a terminal used to capture passwords.',
        location: 'marcus_desk',
        relevance: 'important',
        discovered: false
      },
      {
        id: 'git_commits',
        name: 'Git Repository Commits',
        description: 'Sarah\'s code commits show she was actively programming during the heist.',
        location: 'development_server',
        relevance: 'minor',
        discovered: false
      },
      {
        id: 'coffee_receipt',
        name: 'Timestamped Coffee Receipt',
        description: 'Kevin\'s receipt from coffee shop during the exact time of the hack.',
        location: 'kevins_wallet',
        relevance: 'minor',
        discovered: false
      },
      {
        id: 'gambling_app',
        name: 'Gambling App Activity',
        description: 'Heavy activity on Marcus\'s phone during work hours, including during the hack.',
        location: 'marcus_phone',
        relevance: 'important',
        discovered: false
      },
      {
        id: 'board_recording',
        name: 'Board Meeting Recording',
        description: 'Security camera footage confirms Diana was in the boardroom.',
        location: 'boardroom',
        relevance: 'minor',
        discovered: false
      }
    ],
    locations: [
      {
        id: 'server_room',
        name: 'Server Room',
        description: 'High-security room housing the main banking servers. Access cards logged.',
        evidence: ['server_logs'],
        visited: false
      },
      {
        id: 'marcus_desk',
        name: 'Marcus\'s Workstation',
        description: 'System administrator\'s desk with multiple monitors and security tools.',
        evidence: ['keylogger'],
        visited: false
      },
      {
        id: 'development_server',
        name: 'Development Server',
        description: 'Where programmers test code before deploying to production systems.',
        evidence: ['git_commits'],
        visited: false
      },
      {
        id: 'boardroom',
        name: 'Executive Boardroom',
        description: 'Where important meetings and presentations take place.',
        evidence: ['board_recording'],
        visited: false
      },
      {
        id: 'kevins_wallet',
        name: 'Kevin\'s Personal Items',
        description: 'Contains receipts, cards, and other personal documentation.',
        evidence: ['coffee_receipt'],
        visited: false
      },
      {
        id: 'marcus_phone',
        name: 'Marcus\'s Phone',
        description: 'Personal device with apps, messages, and browsing history.',
        evidence: ['gambling_app'],
        visited: false
      }
    ]
  },
  {
    id: 'haunted_theater',
    title: '👻 The Phantom of Rosewood Theater',
    description: 'Strange accidents plague the theater\'s new production. The cast suspects sabotage, but some claim it\'s supernatural. Uncover the truth.',
    difficulty: 'Hard',
    genre: 'supernatural',
    suspects: [
      {
        id: 'director_james',
        name: 'James Morrison - Director',
        description: 'Ambitious director desperate for a hit show to save his failing career.',
        alibi: 'Claims he was in meetings with investors during each incident.',
        motive: 'Needs the publicity from mysterious accidents to generate buzz.',
        isGuilty: true,
        traits: ['manipulative', 'desperate', 'theatrical']
      },
      {
        id: 'actor_victoria',
        name: 'Victoria Sterling - Lead Actress',
        description: 'Prima donna who believes she\'s being targeted by jealous rival.',
        alibi: 'Usually in her dressing room or on stage during incidents.',
        motive: 'Wants to get rid of her understudy who\'s getting too much attention.',
        isGuilty: false,
        traits: ['narcissistic', 'paranoid', 'talented']
      },
      {
        id: 'stagehand_mike',
        name: 'Mike Chen - Head Stagehand',
        description: 'Long-time theater employee who knows every secret passage and mechanism.',
        alibi: 'Working backstage during all incidents, has witnesses.',
        motive: 'Angry about budget cuts that eliminated several stagehand positions.',
        isGuilty: false,
        traits: ['loyal', 'knowledgeable', 'bitter']
      },
      {
        id: 'critic_helen',
        name: 'Helen Walsh - Theater Critic',
        description: 'Influential critic known for destroying careers with bad reviews.',
        alibi: 'Claims she was researching other productions during incidents.',
        motive: 'Personal vendetta against the director who once publicly humiliated her.',
        isGuilty: false,
        traits: ['vindictive', 'powerful', 'observant']
      }
    ],
    evidence: [
      {
        id: 'rigged_prop',
        name: 'Sabotaged Stage Prop',
        description: 'A chandelier with deliberately weakened supports that caused the first accident.',
        location: 'stage',
        relevance: 'critical',
        discovered: false
      },
      {
        id: 'hidden_camera',
        name: 'Hidden Security Camera',
        description: 'Found in director\'s office, positioned to record private conversations.',
        location: 'directors_office',
        relevance: 'important',
        discovered: false
      },
      {
        id: 'mysterious_note',
        name: 'Threatening Note',
        description: 'Found in Victoria\'s dressing room. "Leave now or face the phantom\'s curse."',
        location: 'dressing_room',
        relevance: 'minor',
        discovered: false
      },
      {
        id: 'old_blueprints',
        name: 'Original Theater Blueprints',
        description: 'Show hidden passages used in the 1920s for "phantom" effects.',
        location: 'archive_room',
        relevance: 'important',
        discovered: false
      },
      {
        id: 'publicity_clippings',
        name: 'Newspaper Clippings',
        description: 'Director\'s collection of articles about "cursed" productions that became huge hits.',
        location: 'directors_office',
        relevance: 'important',
        discovered: false
      },
      {
        id: 'lighting_controls',
        name: 'Tampered Lighting Board',
        description: 'Programming shows someone created preset "accident" scenarios.',
        location: 'control_booth',
        relevance: 'critical',
        discovered: false
      }
    ],
    locations: [
      {
        id: 'stage',
        name: 'Main Stage',
        description: 'Grand theater stage where the accidents have been occurring.',
        evidence: ['rigged_prop'],
        visited: false
      },
      {
        id: 'directors_office',
        name: 'Director\'s Office',
        description: 'James\'s private office filled with scripts, awards, and personal items.',
        evidence: ['hidden_camera', 'publicity_clippings'],
        visited: false
      },
      {
        id: 'dressing_room',
        name: 'Star Dressing Room',
        description: 'Victoria\'s luxurious dressing room with mirrors, costumes, and flowers.',
        evidence: ['mysterious_note'],
        visited: false
      },
      {
        id: 'control_booth',
        name: 'Lighting Control Booth',
        description: 'High-tech booth controlling all stage lighting and effects.',
        evidence: ['lighting_controls'],
        visited: false
      },
      {
        id: 'archive_room',
        name: 'Theater Archive',
        description: 'Storage room containing decades of theater history and documentation.',
        evidence: ['old_blueprints'],
        visited: false
      }
    ]
  }
];

// AI Mystery Solver
class AIMysteryAI {
  static async analyzeEvidence(evidence: Evidence[], deductions: string[]): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const analyses = [
      "The evidence suggests a pattern of premeditation rather than a crime of passion.",
      "Cross-referencing the alibis reveals inconsistencies that warrant further investigation.", 
      "The physical evidence points to someone with intimate knowledge of the location.",
      "The timing of events suggests the perpetrator had inside information.",
      "The method used indicates someone with specific skills or access."
    ];
    
    return analyses[Math.floor(Math.random() * analyses.length)];
  }

  static async provideDedictionHint(gameState: GameState, suspect: Suspect): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const hints = [
      `Consider ${suspect.name}'s motive: ${suspect.motive}`,
      `${suspect.name}'s alibi: ${suspect.alibi} - can this be verified?`,
      `Key trait of ${suspect.name}: ${suspect.traits[0]} - how might this affect their actions?`,
      `Look for evidence that either supports or contradicts ${suspect.name}'s story.`
    ];
    
    return hints[Math.floor(Math.random() * hints.length)];
  }
}

export default function AIMystery({ onGameEnd }: { onGameEnd: (score: number) => void }) {
  const { user } = useDiscord();
  const [selectedCase, setSelectedCase] = useState<MysteryCase | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    currentCase: null,
    discoveredEvidence: [],
    visitedLocations: [],
    interviewedSuspects: [],
    deductions: [],
    score: 0,
    timeRemaining: 600, // 10 minutes
    gamePhase: 'investigation',
    solution: '',
    correctSolution: false
  });
  const [investigationLog, setInvestigationLog] = useState<Investigation[]>([]);
  const [showEvidence, setShowEvidence] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll investigation log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [investigationLog]);

  // Game timer
  useEffect(() => {
    if (gameState.gamePhase === 'investigation' && gameState.timeRemaining > 0) {
      const timer = setInterval(() => {
        setGameState(prev => {
          const newTime = prev.timeRemaining - 1;
          if (newTime <= 0) {
            return { ...prev, timeRemaining: 0, gamePhase: 'solving' };
          }
          return { ...prev, timeRemaining: newTime };
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [gameState.gamePhase, gameState.timeRemaining]);

  // Start case
  const startCase = (mysteryCase: MysteryCase) => {
    setSelectedCase(mysteryCase);
    setGameState({
      currentCase: mysteryCase,
      discoveredEvidence: [],
      visitedLocations: [],
      interviewedSuspects: [],
      deductions: [],
      score: 0,
      timeRemaining: 600,
      gamePhase: 'investigation',
      solution: '',
      correctSolution: false
    });
    setInvestigationLog([
      {
        type: 'deduction',
        text: `🔍 Case File: ${mysteryCase.title}\n\n${mysteryCase.description}\n\nYour investigation begins now. Examine locations, interview suspects, and gather evidence to solve the mystery.`,
        timestamp: Date.now()
      }
    ]);
  };

  // Visit location
  const visitLocation = async (location: Location) => {
    if (gameState.visitedLocations.includes(location.id)) return;

    setInvestigationLog(prev => [...prev, {
      type: 'location',
      text: `📍 Investigating: ${location.name}\n\n${location.description}`,
      timestamp: Date.now()
    }]);

    setGameState(prev => ({
      ...prev,
      visitedLocations: [...prev.visitedLocations, location.id],
      score: prev.score + 10
    }));

    // Discover evidence at location
    const evidence = selectedCase!.evidence.filter(e => 
      location.evidence.includes(e.id) && 
      !gameState.discoveredEvidence.some(de => de.id === e.id)
    );

    for (const evidenceItem of evidence) {
      setTimeout(() => {
        setInvestigationLog(prev => [...prev, {
          type: 'evidence',
          text: `🔎 Evidence Found: ${evidenceItem.name}\n\n${evidenceItem.description}`,
          timestamp: Date.now()
        }]);

        setGameState(prev => ({
          ...prev,
          discoveredEvidence: [...prev.discoveredEvidence, evidenceItem],
          score: prev.score + (evidenceItem.relevance === 'critical' ? 50 : 
                             evidenceItem.relevance === 'important' ? 30 : 15)
        }));
      }, 1000);
    }
  };

  // Interview suspect
  const interviewSuspect = async (suspect: Suspect) => {
    if (gameState.interviewedSuspects.includes(suspect.id)) return;

    setIsAnalyzing(true);

    setInvestigationLog(prev => [...prev, {
      type: 'suspect',
      text: `💬 Interview: ${suspect.name}\n\n${suspect.description}\n\nAlibi: "${suspect.alibi}"\n\nWhen asked about motive: "${suspect.motive}"`,
      timestamp: Date.now()
    }]);

    setGameState(prev => ({
      ...prev,
      interviewedSuspects: [...prev.interviewedSuspects, suspect.id],
      score: prev.score + 20
    }));

    // Get AI analysis
    try {
      const hint = await AIMysteryAI.provideDedictionHint(gameState, suspect);
      setTimeout(() => {
        setInvestigationLog(prev => [...prev, {
          type: 'deduction',
          text: `🤖 AI Analysis: ${hint}`,
          timestamp: Date.now()
        }]);
      }, 1500);
    } catch (error) {
      console.error('AI analysis failed:', error);
    }

    setIsAnalyzing(false);
  };

  // Make deduction
  const makeDeduction = async () => {
    if (gameState.discoveredEvidence.length < 2) {
      setInvestigationLog(prev => [...prev, {
        type: 'deduction',
        text: '⚠️ Need more evidence to make meaningful deductions. Continue investigating.',
        timestamp: Date.now()
      }]);
      return;
    }

    setIsAnalyzing(true);

    try {
      const analysis = await AIMysteryAI.analyzeEvidence(gameState.discoveredEvidence, gameState.deductions);
      
      setInvestigationLog(prev => [...prev, {
        type: 'deduction',
        text: `💡 Deduction: ${analysis}`,
        timestamp: Date.now()
      }]);

      setGameState(prev => ({
        ...prev,
        deductions: [...prev.deductions, analysis],
        score: prev.score + 25
      }));
    } catch (error) {
      console.error('Deduction failed:', error);
    }

    setIsAnalyzing(false);
  };

  // Submit solution
  const submitSolution = (suspectId: string) => {
    const suspect = selectedCase!.suspects.find(s => s.id === suspectId);
    const correct = suspect?.isGuilty || false;
    
    const finalScore = gameState.score + (correct ? 200 : 0) + Math.floor(gameState.timeRemaining / 10);

    setGameState(prev => ({
      ...prev,
      solution: suspect?.name || '',
      correctSolution: correct,
      gamePhase: 'completed'
    }));

    setInvestigationLog(prev => [...prev, {
      type: 'solution',
      text: `🎯 Solution Submitted: ${suspect?.name}\n\n${correct ? 
        '✅ CORRECT! You successfully solved the mystery!' : 
        `❌ INCORRECT. The real culprit was ${selectedCase!.suspects.find(s => s.isGuilty)?.name}.`}`,
      timestamp: Date.now()
    }]);

    setTimeout(() => onGameEnd(finalScore), 3000);
  };

  // Case selection screen
  if (!selectedCase) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-white mb-4">
              🔍 AI MYSTERY SOLVER
            </h1>
            <p className="text-white/80 text-xl mb-4">
              Use AI-powered deduction to solve complex mysteries
            </p>
            <p className="text-white/60">
              Welcome Detective {user?.username || user?.global_name || 'Anonymous'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MYSTERY_CASES.map((mysteryCase) => (
              <button
                key={mysteryCase.id}
                onClick={() => startCase(mysteryCase)}
                className="bg-gradient-to-b from-gray-800 to-gray-900 p-6 rounded-2xl text-white hover:scale-105 active:scale-95 transition-transform border border-white/20"
              >
                <h3 className="text-xl font-bold mb-2">{mysteryCase.title}</h3>
                <p className="text-gray-300 text-sm mb-4">{mysteryCase.description}</p>
                <div className="flex justify-between items-center text-xs">
                  <span className={`px-2 py-1 rounded ${
                    mysteryCase.difficulty === 'Easy' ? 'bg-green-600' :
                    mysteryCase.difficulty === 'Medium' ? 'bg-yellow-600' :
                    mysteryCase.difficulty === 'Hard' ? 'bg-orange-600' : 'bg-red-600'
                  }`}>
                    {mysteryCase.difficulty}
                  </span>
                  <span className="text-gray-400 capitalize">{mysteryCase.genre}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-12 text-center text-white/60 text-sm">
            <p>🤖 AI-Powered Investigation • 🕒 Time-Limited Solving</p>
            <p>🔍 Gather Evidence • 💭 Interview Suspects • 🧩 Make Deductions</p>
          </div>
        </div>
      </div>
    );
  }

  // Game complete screen
  if (gameState.gamePhase === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-black flex items-center justify-center p-4">
        <div className="text-center text-white max-w-2xl">
          <h2 className="text-4xl font-bold mb-4">
            {gameState.correctSolution ? '🎉 Case Closed!' : '❌ Case Unsolved'}
          </h2>
          
          <div className="text-xl mb-6">
            {gameState.correctSolution 
              ? `Excellent detective work! You correctly identified ${gameState.solution} as the culprit.`
              : `The mystery remains unsolved. ${gameState.solution} was not the perpetrator.`}
          </div>

          <div className="bg-black/40 p-6 rounded-lg mb-6">
            <h3 className="text-2xl font-bold mb-4">Investigation Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>Final Score: {gameState.score.toLocaleString()}</div>
              <div>Evidence Found: {gameState.discoveredEvidence.length}/{selectedCase.evidence.length}</div>
              <div>Locations Visited: {gameState.visitedLocations.length}/{selectedCase.locations.length}</div>
              <div>Suspects Interviewed: {gameState.interviewedSuspects.length}/{selectedCase.suspects.length}</div>
              <div>Deductions Made: {gameState.deductions.length}</div>
              <div>Time Bonus: {Math.floor(gameState.timeRemaining / 10)} pts</div>
            </div>
          </div>

          <button
            onClick={() => {
              setSelectedCase(null);
              setInvestigationLog([]);
            }}
            className="bg-purple-500 text-white px-8 py-4 rounded-lg font-bold hover:scale-105"
          >
            Solve Another Mystery
          </button>
        </div>
      </div>
    );
  }

  // Main investigation interface
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black">
      {/* Header */}
      <div className="bg-black/30 p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">{selectedCase.title}</h1>
        <div className="flex items-center gap-4 text-white">
          <div className="text-sm">
            Time: <span className={gameState.timeRemaining < 60 ? 'text-red-400' : 'text-green-400'}>
              {formatTime(gameState.timeRemaining)}
            </span>
          </div>
          <div className="text-sm">Score: <span className="text-yellow-400">{gameState.score}</span></div>
          <button
            onClick={() => setShowEvidence(!showEvidence)}
            className="text-xs bg-white/20 px-3 py-1 rounded"
          >
            {showEvidence ? 'Hide' : 'Show'} Evidence
          </button>
        </div>
      </div>

      <div className="flex h-screen">
        {/* Evidence Panel */}
        {showEvidence && (
          <div className="w-80 bg-black/40 p-4 text-white text-sm border-r border-white/20 overflow-y-auto">
            <h3 className="font-bold mb-4 text-lg">🔍 Investigation Progress</h3>
            
            <div className="mb-6">
              <h4 className="font-bold mb-2 text-purple-300">Evidence ({gameState.discoveredEvidence.length}/{selectedCase.evidence.length})</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {gameState.discoveredEvidence.map((evidence, idx) => (
                  <div key={idx} className={`p-2 rounded text-xs ${
                    evidence.relevance === 'critical' ? 'bg-red-900/40' :
                    evidence.relevance === 'important' ? 'bg-yellow-900/40' : 'bg-gray-900/40'
                  }`}>
                    <div className="font-medium">{evidence.name}</div>
                    <div className="text-gray-300 text-xs">{evidence.description.substring(0, 60)}...</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-bold mb-2 text-blue-300">Visited Locations ({gameState.visitedLocations.length}/{selectedCase.locations.length})</h4>
              <div className="space-y-1">
                {selectedCase.locations.filter(loc => gameState.visitedLocations.includes(loc.id)).map(location => (
                  <div key={location.id} className="text-xs text-gray-300">✓ {location.name}</div>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-bold mb-2 text-green-300">Interviewed Suspects ({gameState.interviewedSuspects.length}/{selectedCase.suspects.length})</h4>
              <div className="space-y-1">
                {selectedCase.suspects.filter(suspect => gameState.interviewedSuspects.includes(suspect.id)).map(suspect => (
                  <div key={suspect.id} className="text-xs text-gray-300">✓ {suspect.name}</div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-white/20">
              <div className="text-xs text-white/60">
                Detective: {user?.username || 'Anonymous'}
              </div>
            </div>
          </div>
        )}

        {/* Main Investigation Area */}
        <div className="flex-1 flex flex-col">
          {/* Investigation Log */}
          <div 
            ref={logRef}
            className="flex-1 p-6 overflow-y-auto bg-black/20"
          >
            <div className="max-w-4xl mx-auto space-y-4">
              {investigationLog.map((entry, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg ${
                    entry.type === 'location' 
                      ? 'bg-blue-900/40 text-white' 
                      : entry.type === 'suspect'
                      ? 'bg-green-900/40 text-green-200'
                      : entry.type === 'evidence'
                      ? 'bg-yellow-900/40 text-yellow-200'
                      : entry.type === 'solution'
                      ? 'bg-purple-900/40 text-purple-200'
                      : 'bg-gray-900/40 text-gray-300'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{entry.text}</div>
                  <div className="text-xs text-white/40 mt-2">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}

              {isAnalyzing && (
                <div className="bg-purple-900/40 p-4 rounded-lg text-purple-200 text-center">
                  🤖 AI is analyzing the evidence... Please wait...
                </div>
              )}
            </div>
          </div>

          {/* Action Panel */}
          {gameState.gamePhase === 'investigation' && (
            <div className="bg-black/40 p-6 border-t border-white/20">
              <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Locations */}
                  <div>
                    <h3 className="text-white font-bold mb-3">📍 Locations</h3>
                    <div className="space-y-2">
                      {selectedCase.locations.map(location => (
                        <button
                          key={location.id}
                          onClick={() => visitLocation(location)}
                          disabled={gameState.visitedLocations.includes(location.id)}
                          className={`w-full p-3 rounded text-left text-sm transition-colors ${
                            gameState.visitedLocations.includes(location.id)
                              ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-500 text-white'
                          }`}
                        >
                          {gameState.visitedLocations.includes(location.id) ? '✓' : '🔍'} {location.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Suspects */}
                  <div>
                    <h3 className="text-white font-bold mb-3">👤 Suspects</h3>
                    <div className="space-y-2">
                      {selectedCase.suspects.map(suspect => (
                        <button
                          key={suspect.id}
                          onClick={() => interviewSuspect(suspect)}
                          disabled={gameState.interviewedSuspects.includes(suspect.id) || isAnalyzing}
                          className={`w-full p-3 rounded text-left text-sm transition-colors ${
                            gameState.interviewedSuspects.includes(suspect.id)
                              ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                              : 'bg-green-600 hover:bg-green-500 text-white'
                          }`}
                        >
                          {gameState.interviewedSuspects.includes(suspect.id) ? '✓' : '💬'} {suspect.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div>
                    <h3 className="text-white font-bold mb-3">🧩 Actions</h3>
                    <div className="space-y-2">
                      <button
                        onClick={makeDeduction}
                        disabled={isAnalyzing || gameState.discoveredEvidence.length < 2}
                        className="w-full p-3 rounded bg-purple-600 hover:bg-purple-500 text-white text-sm disabled:bg-gray-600 disabled:cursor-not-allowed"
                      >
                        💡 Make AI Deduction
                      </button>
                      
                      {(gameState.timeRemaining <= 0 || gameState.discoveredEvidence.length >= 3) && (
                        <button
                          onClick={() => setGameState(prev => ({ ...prev, gamePhase: 'solving' }))}
                          className="w-full p-3 rounded bg-red-600 hover:bg-red-500 text-white text-sm"
                        >
                          🎯 Ready to Solve
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Solution Phase */}
          {gameState.gamePhase === 'solving' && (
            <div className="bg-black/40 p-6 border-t border-white/20">
              <div className="max-w-4xl mx-auto text-center">
                <h3 className="text-2xl font-bold text-white mb-4">🎯 Who is the Culprit?</h3>
                <p className="text-white/80 mb-6">Based on your investigation, select the person you believe is guilty:</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedCase.suspects.map(suspect => (
                    <button
                      key={suspect.id}
                      onClick={() => submitSolution(suspect.id)}
                      className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white p-4 rounded-lg text-left"
                    >
                      <div className="font-bold text-lg">{suspect.name}</div>
                      <div className="text-sm text-white/90 mt-1">{suspect.description}</div>
                      <div className="text-xs text-white/70 mt-2">Motive: {suspect.motive}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}