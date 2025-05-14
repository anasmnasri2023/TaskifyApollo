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

const TicTacToe = ({ room, onGameEnd }) => {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);
  const [scores, setScores] = useState({ X: 0, O: 0, ties: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [winningLine, setWinningLine] = useState([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [animatingIndex, setAnimatingIndex] = useState(null);
  const [gameHistory, setGameHistory] = useState([]);
  const [hoveredCell, setHoveredCell] = useState(null);

  // Sound refs
  const xSoundRef = useRef(new Audio("/x-sound.mp3"));
  const oSoundRef = useRef(new Audio("/o-sound.mp3"));
  const winSoundRef = useRef(new Audio("/win-sound.mp3"));
  const tieSoundRef = useRef(new Audio("/tie-sound.mp3"));

  const playSound = (audioRef) => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log("Audio playback failed:", e));
    }
  };

  const calculateWinner = (squares) => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6]
    ];
    
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { winner: squares[a], line: lines[i] };
      }
    }
    
    return null;
  };

  const isBoardFull = (squares) => {
    return squares.every(square => square !== null);
  };

  useEffect(() => {
    const result = calculateWinner(board);
    
    if (result) {
      // We have a winner
      setWinningLine(result.line);
      setGameOver(true);
      setShowConfetti(true);
      playSound(winSoundRef);
      
      // Update scores
      setScores(prev => ({
        ...prev,
        [result.winner]: prev[result.winner] + 1
      }));
      
      // Stop confetti after 6 seconds
      setTimeout(() => setShowConfetti(false), 6000);
      
      // Report game result
      if (onGameEnd) {
        onGameEnd(result.winner === 'X' ? 1 : -1);
      }
      
    } else if (isBoardFull(board)) {
      // It's a tie
      setGameOver(true);
      playSound(tieSoundRef);
      
      // Update tie score
      setScores(prev => ({
        ...prev,
        ties: prev.ties + 1
      }));
      
      // Report game result
      if (onGameEnd) {
        onGameEnd(0);
      }
    }
  }, [board, onGameEnd]);

  const handleClick = (i) => {
    if (board[i] || gameOver) return;
    
    const newBoard = [...board];
    const currentPlayer = xIsNext ? "X" : "O";
    newBoard[i] = currentPlayer;
    
    // Play sound based on player
    playSound(xIsNext ? xSoundRef : oSoundRef);
    
    // Set animating cell
    setAnimatingIndex(i);
    
    // Clear animation after it completes
    setTimeout(() => {
      setAnimatingIndex(null);
    }, 500);
    
    setBoard(newBoard);
    setXIsNext(!xIsNext);
    
    // Add to game history
    setGameHistory([...gameHistory, { board: newBoard, player: currentPlayer, position: i }]);
  };

  const resetGame = () => {
    // Save the current game to history if it's a meaningful game
    if (board.some(square => square !== null)) {
      // Keep history but don't add current game again
    }
    
    // Reset game state
    setBoard(Array(9).fill(null));
    setXIsNext(true);
    setGameOver(false);
    setWinningLine([]);
    setShowConfetti(false);
    setAnimatingIndex(null);
  };

  const resetScores = () => {
    setScores({ X: 0, O: 0, ties: 0 });
    resetGame();
    setGameHistory([]);
  };

  // Check if there's a result (winner or full board)
  const result = calculateWinner(board);
  const winner = result?.winner;
  const isDraw = !winner && isBoardFull(board);

  // Current player indicator
  const current = xIsNext ? "X" : "O";

  return (
    <div className="p-8 rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark max-w-4xl w-full mx-auto min-h-[70vh] flex flex-col items-center justify-center">
      {/* Confetti effect for winners */}
      <FullPageConfetti active={showConfetti} />
      
      {/* Game header with scores */}
      <div className="mb-8 w-full">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center text-2xl font-bold 
              ${current === 'X' ? 'bg-primary text-white pulse-animation' : 'bg-meta-4 text-body dark:text-bodydark'}`}>
              X
            </div>
            <div className="ml-3">
              <div className="text-sm text-body dark:text-bodydark">Player X</div>
              <div className="text-lg font-bold">{scores.X}</div>
            </div>
          </div>
          
          <div className="flex flex-col items-center bg-stroke dark:bg-meta-4 px-4 py-2 rounded-lg">
            <div className="text-sm text-body dark:text-bodydark">Ties</div>
            <div className="text-lg font-bold">{scores.ties}</div>
          </div>
          
          <div className="flex items-center">
            <div className="mr-3 text-right">
              <div className="text-sm text-body dark:text-bodydark">Player O</div>
              <div className="text-lg font-bold">{scores.O}</div>
            </div>
            <div className={`h-12 w-12 rounded-full flex items-center justify-center text-2xl font-bold
              ${current === 'O' ? 'bg-primary text-white pulse-animation' : 'bg-meta-4 text-body dark:text-bodydark'}`}>
              O
            </div>
          </div>
        </div>
        
        {/* Game status indicator */}
        <div className={`text-center py-3 rounded-lg transition-all duration-300 
          ${winner ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 transform-gpu scale-bounce' : 
            isDraw ? 'bg-blue-100 text-blue-800 dark:bg-meta-4 dark:text-bodydark' : 
            'bg-meta-4 dark:bg-meta-4'}`}>
          {winner ? (
            <div className="flex items-center justify-center text-2xl font-bold">
              <span className="mr-2 text-3xl">🎉</span>
              Player {winner} Wins!
            </div>
          ) : isDraw ? (
            <div className="flex items-center justify-center text-xl font-medium">
              Game Tied!
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xl font-bold mr-2
                ${current === 'X' ? 'bg-primary text-white' : 'bg-stroke text-primary dark:bg-meta-4 dark:text-white'}`}>
                {current}
              </div>
              <span className="text-lg font-medium text-body dark:text-bodydark">Your Turn</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Game board */}
      <div className="relative mb-8">
        <div className="grid grid-cols-3 gap-4 w-72 md:w-80 lg:w-96">
          {board.map((cell, i) => (
            <button
              key={i}
              onClick={() => handleClick(i)}
              onMouseEnter={() => !cell && !gameOver && setHoveredCell(i)}
              onMouseLeave={() => setHoveredCell(null)}
              className={`w-20 md:w-24 lg:w-28 h-20 md:h-24 lg:h-28 text-3xl md:text-4xl lg:text-5xl font-bold rounded-lg 
                transition-all duration-200 relative overflow-hidden
                ${cell ? 'cursor-default' : gameOver ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-opacity-80'}
                ${winningLine.includes(i) ? 'bg-green-100 text-primary dark:bg-green-900 winner-cell' : 
                  'bg-white border-2 border-stroke dark:border-strokedark dark:bg-boxdark'}`}
            >
              {cell ? (
                <span className={`transition-all duration-300 absolute inset-0 flex items-center justify-center
                  ${i === animatingIndex ? 'scale-in-animation' : ''}
                  ${cell === 'X' ? 'text-primary' : 'text-black dark:text-white'}`}>
                  {cell}
                </span>
              ) : (
                !gameOver && hoveredCell === i && (
                  <span className="absolute inset-0 flex items-center justify-center text-opacity-20 text-body dark:text-bodydark opacity-30">
                    {current}
                  </span>
                )
              )}
            </button>
          ))}
        </div>
        
        {/* Winner lines */}
        {winningLine.length > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 3 3" style={{ transform: 'scale(1.1)' }}>
              <line 
                x1={(winningLine[0] % 3) + 0.5} 
                y1={Math.floor(winningLine[0] / 3) + 0.5} 
                x2={(winningLine[2] % 3) + 0.5} 
                y2={Math.floor(winningLine[2] / 3) + 0.5} 
                className="stroke-primary stroke-[0.1] line-animation" 
              />
            </svg>
          </div>
        )}
      </div>
      
      {/* Game controls */}
      <div className="flex gap-4">
        <button
          onClick={resetGame}
          className="px-6 py-3 bg-primary bg-opacity-10 text-primary dark:bg-meta-4 dark:text-white font-medium rounded-sm shadow-default transition-all duration-200 hover:bg-opacity-20 flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
          New Game
        </button>
        
        <button
          onClick={resetScores}
          className="px-6 py-3 bg-meta-4 text-body dark:text-bodydark font-medium rounded-sm shadow-default transition-all duration-200 hover:bg-opacity-80"
        >
          Reset Scores
        </button>
      </div>
      
      {/* Game history section (collapsed by default) */}
      {gameHistory.length > 0 && (
        <div className="w-full mt-8 pt-4 border-t border-stroke dark:border-strokedark">
          <details className="text-body dark:text-bodydark">
            <summary className="cursor-pointer font-medium mb-2">Game History</summary>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-2">
              {gameHistory.map((move, index) => (
                <div key={index} className="p-2 border border-stroke dark:border-strokedark rounded-sm text-xs">
                  <div className="font-medium mb-1">Move {index + 1}: Player {move.player}</div>
                  <div className="grid grid-cols-3 gap-1">
                    {move.board.map((cell, i) => (
                      <div 
                        key={i} 
                        className={`w-5 h-5 flex items-center justify-center border border-stroke dark:border-strokedark
                          ${i === move.position ? 'bg-primary bg-opacity-10' : ''}`}
                      >
                        {cell}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default TicTacToe;