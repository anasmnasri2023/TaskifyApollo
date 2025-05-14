import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import Confetti from "react-confetti";

// Full-page confetti component using portal
const FullPageConfetti = ({ active }) => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!active) return null;

  // Use ReactDOM.createPortal to render directly to body
  return ReactDOM.createPortal(
    <Confetti
      width={windowSize.width}
      height={windowSize.height}
      recycle={false}
      numberOfPieces={500}
      style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999, pointerEvents: 'none' }}
    />,
    document.body
  );
};

const createCards = () => {
  const icons = ["🍎", "🍌", "🍓", "🍒", "🍇", "🍑", "🍊", "🍉"];
  const cards = [...icons, ...icons].map((icon, i) => ({
    id: i,
    icon,
    flipped: false,
    matched: false,
    animating: false,
    shake: false,
  }));
  return cards.sort(() => 0.5 - Math.random());
};

const MemoryGame = ({ room, onGameEnd }) => {
  const [cards, setCards] = useState(createCards());
  const [flipped, setFlipped] = useState([]);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [revealTime, setRevealTime] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [time, setTime] = useState(0);
  const timerRef = useRef(null);

  // Sound refs
  const flipSoundRef = useRef(new Audio("/flip.mp3"));
  const matchSoundRef = useRef(new Audio("/match.mp3"));
  const errorSoundRef = useRef(new Audio("/error.mp3"));
  const victorySoundRef = useRef(new Audio("/victory.mp3"));

  const playSound = (audioRef) => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log("Audio playback failed:", e));
    }
  };

  // Initial card reveal
  useEffect(() => {
    const revealAll = cards.map(card => ({ ...card, flipped: true }));
    setCards(revealAll);
    const timer = setTimeout(() => {
      const hideAll = revealAll.map(card => ({ ...card, flipped: false }));
      setCards(hideAll);
      setRevealTime(false);
      
      // Start the timer when cards are hidden
      timerRef.current = setInterval(() => {
        setTime(prevTime => prevTime + 1);
      }, 1000);
    }, 2000);

    return () => {
      clearTimeout(timer);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Compare two flipped cards
  useEffect(() => {
    if (flipped.length === 2) {
      setMoves(prev => prev + 1);
      
      const [a, b] = flipped;
      const firstCard = cards[a];
      const secondCard = cards[b];

      const isMatch = firstCard.icon === secondCard.icon;

      if (isMatch) {
        // Match animation and update
        playSound(matchSoundRef);
        setCards(prevCards =>
          prevCards.map((card, index) =>
            index === a || index === b 
              ? { ...card, matched: true, animating: true } 
              : card
          )
        );
        setScore(prev => prev + 1);
        
        // Remove animating class after animation completes
        setTimeout(() => {
          setCards(prevCards =>
            prevCards.map((card, index) =>
              index === a || index === b 
                ? { ...card, animating: false } 
                : card
            )
          );
        }, 500);
        
        setFlipped([]);
      } else {
        // Shake animation for incorrect match
        playSound(errorSoundRef);
        setCards(prevCards =>
          prevCards.map((card, index) =>
            index === a || index === b 
              ? { ...card, shake: true } 
              : card
          )
        );
        
        // Remove shake and flip back
        setTimeout(() => {
          setCards(prevCards =>
            prevCards.map((card, index) =>
              index === a || index === b
                ? { ...card, shake: false, flipped: false }
                : card
            )
          );
          setFlipped([]);
        }, 1000);
        
        setScore(prev => Math.max(0, prev - 1));
      }
    }
  }, [flipped]);

  // Check if game is over
  useEffect(() => {
    const isAllMatched = cards.every(card => card.matched);
    
    if (isAllMatched && !revealTime && cards.length > 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      setGameOver(true);
      setShowConfetti(true);
      playSound(victorySoundRef);
      
      // Stop confetti after 6 seconds
      setTimeout(() => setShowConfetti(false), 6000);
      
      // Send score to parent
      onGameEnd(score);
    }
  }, [cards, revealTime, score]);

  const flipCard = (index) => {
    if (!revealTime && flipped.length < 2 && !cards[index].flipped && !cards[index].matched) {
      playSound(flipSoundRef);
      
      const newCards = [...cards];
      newCards[index].flipped = true;
      setCards(newCards);
      setFlipped([...flipped, index]);
    }
  };

  const restartGame = () => {
    // Clear timer
    if (timerRef.current) clearInterval(timerRef.current);
    
    // Reset state
    setCards(createCards());
    setFlipped([]);
    setScore(0);
    setMoves(0);
    setRevealTime(true);
    setShowConfetti(false);
    setGameOver(false);
    setTime(0);
    
    // Initial card reveal (reusing the same logic as componentDidMount)
    const newCards = createCards().map(card => ({ ...card, flipped: true }));
    setCards(newCards);
    
    setTimeout(() => {
      const hideAll = newCards.map(card => ({ ...card, flipped: false }));
      setCards(hideAll);
      setRevealTime(false);
      
      // Restart timer
      timerRef.current = setInterval(() => {
        setTime(prevTime => prevTime + 1);
      }, 1000);
    }, 2000);
  };

  // Format time as mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate completion percentage
  const completionPercentage = (cards.filter(card => card.matched).length / cards.length) * 100;

  return (
    <div className="p-8 rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark max-w-4xl w-full mx-auto min-h-[70vh] flex flex-col items-center justify-center">
      {/* Confetti effect */}
      <FullPageConfetti active={showConfetti} />
      
      {/* Game header */}
      <div className="w-full mb-8 flex flex-col sm:flex-row justify-between items-center">
        <div className="flex items-center gap-4 mb-4 sm:mb-0">
          <div className="p-4 rounded-full bg-primary bg-opacity-10 text-primary text-2xl font-bold dark:bg-meta-4 dark:text-white">
            {score}
          </div>
          <div className="flex flex-col">
            <span className="text-sm text-body dark:text-bodydark">Score</span>
            <span className="text-xs text-body dark:text-bodydark">Moves: {moves}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-sm text-body dark:text-bodydark">Time</span>
            <span className="text-xs text-body dark:text-bodydark">
              {revealTime ? "Memorize!" : formatTime(time)}
            </span>
          </div>
          <div className="p-4 rounded-full bg-primary bg-opacity-10 text-primary text-lg font-bold dark:bg-meta-4 dark:text-white w-14 h-14 flex items-center justify-center">
            {revealTime ? "👀" : formatTime(time)}
          </div>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="w-full mb-6">
        <div className="h-2 w-full bg-stroke rounded-full overflow-hidden dark:bg-strokedark">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out" 
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
      </div>
      
      {/* Game board */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {cards.map((card, i) => (
          <div
            key={card.id}
            className={`memory-card w-20 h-24 sm:w-24 sm:h-28 md:w-28 md:h-32 relative perspective cursor-pointer transform transition-transform ${
              card.shake ? 'shake-animation' : ''
            } ${card.animating ? 'scale-110' : ''}`}
            onClick={() => flipCard(i)}
          >
            <div 
              className={`absolute w-full h-full rounded-lg shadow-default transition-all duration-300 transform preserve-3d ${
                card.flipped || card.matched ? 'rotate-y-180' : ''
              }`}
            >
              {/* Card front */}
              <div className="absolute backface-hidden w-full h-full rounded-lg border-2 border-stroke bg-white flex items-center justify-center dark:border-strokedark dark:bg-boxdark">
                <div className="text-3xl text-gray-400">❓</div>
              </div>
              
              {/* Card back */}
              <div className={`absolute backface-hidden w-full h-full rounded-lg border-2 flex items-center justify-center rotate-y-180 transition-all duration-300 text-4xl ${
                card.matched 
                  ? 'border-green-500 bg-green-100 dark:bg-green-900 dark:border-green-700' 
                  : 'border-primary bg-white dark:border-primary dark:bg-boxdark'
              }`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Game controls */}
      <div className="mt-auto">
        <button
          onClick={restartGame}
          className="px-6 py-3 flex items-center gap-2 bg-primary text-white font-medium rounded-sm shadow-default transition-all duration-200 hover:bg-opacity-90"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
          {gameOver ? "Play Again" : "Restart Game"}
        </button>
      </div>
      
      {/* Game over overlay */}
      {gameOver && (
        <div className="fixed inset-0 flex items-center justify-center z-40 bg-black bg-opacity-50 transition-opacity duration-300">
          <div className="bg-white dark:bg-boxdark p-8 rounded-lg shadow-lg max-w-md w-full text-center transform transition-transform duration-300 scale-in">
            <div className="text-6xl mb-4 notification-bounce">🎉</div>
            <h2 className="text-3xl font-bold text-black dark:text-white mb-4">
              Game Complete!
            </h2>
            <p className="text-lg mb-2">
              Final Score: <span className="font-bold text-primary">{score}</span>
            </p>
            <p className="text-sm mb-4 text-body dark:text-bodydark">
              Completed in {formatTime(time)} with {moves} moves
            </p>
            <button
              onClick={restartGame}
              className="w-full px-6 py-3 bg-primary text-white font-medium rounded-sm shadow-default transition-all duration-200 hover:bg-opacity-90"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemoryGame;