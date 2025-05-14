import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import Confetti from "react-confetti";

// Confetti component that renders directly to body using portal
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

// Sad Rain animation for losing
const SadRain = ({ active }) => {
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

  const raindrops = Array.from({ length: 100 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    animationDelay: `${Math.random() * 5}s`,
    animationDuration: `${1 + Math.random() * 2}s`,
  }));

  return ReactDOM.createPortal(
    <div 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%', 
        zIndex: 9998, 
        pointerEvents: 'none',
        overflow: 'hidden'
      }}
    >
      {raindrops.map(drop => (
        <div 
          key={drop.id}
          className="sad-raindrop"
          style={{
            position: 'absolute',
            top: '-20px',
            left: drop.left,
            width: '3px',
            height: '20px',
            background: 'linear-gradient(to bottom, rgba(0,0,255,0.2), rgba(0,0,255,0.6))',
            borderRadius: '0 0 5px 5px',
            animationName: 'falling',
            animationDuration: drop.animationDuration,
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
            animationDelay: drop.animationDelay,
          }}
        />
      ))}
    </div>,
    document.body
  );
};

const TriviaGame = ({ onGameEnd, room }) => {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSadRain, setShowSadRain] = useState(false);
  const [feedbackShown, setFeedbackShown] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewQuestionIndex, setReviewQuestionIndex] = useState(0);

  // Sound refs
  const correctSoundRef = useRef(new Audio("/correct.mp3"));
  const wrongSoundRef = useRef(new Audio("/wrong.mp3")); // Add wrong sound
  const cheerSoundRef = useRef(new Audio("/cheer.mp3"));
  const sadSoundRef = useRef(new Audio("/sad.mp3")); // Add sad sound

  useEffect(() => {
    fetch("https://opentdb.com/api.php?amount=5&category=18&type=multiple")
      .then((res) => res.json())
      .then((data) => {
        const formatted = data.results.map((q) => {
          const answers = [...q.incorrect_answers, q.correct_answer].sort(
            () => 0.5 - Math.random()
          );
          return { ...q, answers };
        });
        setQuestions(formatted);
        // Initialize userAnswers array with empty values
        setUserAnswers(new Array(formatted.length).fill(""));
      });
  }, []);

  useEffect(() => {
    if (!reviewMode) {
      // Set the selected answer based on what the user previously selected
      setSelectedAnswer(userAnswers[currentIndex] || "");
      // Reset feedback when changing questions
      setFeedbackShown(userAnswers[currentIndex] !== "");
    } else {
      // In review mode, we always show the selected answer
      setSelectedAnswer(userAnswers[reviewQuestionIndex] || "");
      setFeedbackShown(true);
    }
  }, [currentIndex, userAnswers, reviewMode, reviewQuestionIndex]);

  const playSound = (audioRef) => {
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(e => console.log("Audio playback failed:", e));
  };

  const handleAnswer = (ans) => {
    if (feedbackShown) return;
    
    // Update the selected answer and user answers array
    setSelectedAnswer(ans);
    const newUserAnswers = [...userAnswers];
    newUserAnswers[currentIndex] = ans;
    setUserAnswers(newUserAnswers);
    
    // Show feedback
    setFeedbackShown(true);
    
    // Play sound based on correctness
    if (ans === questions[currentIndex].correct_answer) {
      playSound(correctSoundRef);
    } else {
      playSound(wrongSoundRef);
    }
    
    // Auto-advance to next question after delay
    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(currentIndex + 1);
        setFeedbackShown(false);
      }
    }, 2000);
  };

  const goToNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const submitQuiz = () => {
    // Calculate score
    let calculatedScore = 0;
    userAnswers.forEach((ans, index) => {
      if (ans === questions[index].correct_answer) {
        calculatedScore++;
      }
    });
    
    setScore(calculatedScore);
    
    // Show celebration or sad effect based on score
    if (calculatedScore > questions.length / 2) {
      setShowConfetti(true);
      playSound(cheerSoundRef);
      setTimeout(() => setShowConfetti(false), 6000);
    } else {
      setShowSadRain(true);
      playSound(sadSoundRef);
      setTimeout(() => setShowSadRain(false), 6000);
    }
    
    setShowResult(true);
    onGameEnd(calculatedScore);
  };

  const handleReviewQuestion = (index) => {
    setReviewMode(true);
    setReviewQuestionIndex(index);
  };

  const exitReviewMode = () => {
    setReviewMode(false);
  };

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96 rounded-sm border border-stroke bg-white p-8 shadow-default dark:border-strokedark dark:bg-boxdark w-full">
        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div>
        <p className="ml-4 text-lg font-medium text-body dark:text-bodydark">Loading awesome questions...</p>
      </div>
    );
  }

  // Review mode after quiz completion
  if (reviewMode && showResult) {
    const question = questions[reviewQuestionIndex];
    const userAnswer = userAnswers[reviewQuestionIndex];
    const isCorrect = userAnswer === question.correct_answer;
    
    return (
      <div className="p-8 rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark max-w-4xl w-full mx-auto min-h-[70vh] flex flex-col">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <div className="text-lg font-medium text-primary dark:text-white">
              Reviewing Question {reviewQuestionIndex + 1} of {questions.length}
            </div>
            <button 
              onClick={exitReviewMode}
              className="px-4 py-2 bg-primary text-white rounded-sm"
            >
              Back to Results
            </button>
          </div>
          
          <div className="h-3 w-full bg-stroke rounded-full overflow-hidden dark:bg-strokedark">
            <div 
              className="h-full bg-primary rounded-full" 
              style={{ width: `${((reviewQuestionIndex + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
        </div>
        
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <span className="px-3 py-1 bg-primary bg-opacity-10 text-primary text-sm font-medium rounded-full dark:bg-meta-4 dark:text-white">
              {question.difficulty.toUpperCase()}
            </span>
            <span className="ml-2 px-3 py-1 bg-primary bg-opacity-5 text-primary text-sm font-medium rounded-full truncate max-w-xs dark:bg-meta-4 dark:text-white">
              {question.category}
            </span>
          </div>
          
          <div className="p-6 bg-white bg-opacity-70 rounded-sm border border-stroke shadow-default dark:border-strokedark dark:bg-boxdark">
            <h3 
              className="text-2xl font-bold text-black dark:text-white leading-relaxed" 
              dangerouslySetInnerHTML={{ __html: question.question }} 
            />
          </div>
        </div>
        
        <div className="flex-grow">
          <ul className="space-y-4 mb-8">
            {question.answers.map((ans, i) => (
              <li key={i}>
                <div
                  className={`w-full px-6 py-4 rounded-sm border-2 font-medium text-left ${
                    ans === question.correct_answer
                      ? "border-green-500 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                      : ans === userAnswer
                        ? "border-red-500 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                        : "border-stroke text-body dark:border-strokedark dark:text-bodydark"
                  }`}
                  dangerouslySetInnerHTML={{ __html: ans }}
                />
              </li>
            ))}
          </ul>
          
          <div className="p-4 rounded-sm shadow-default notification-enter mb-6 bg-meta-4 border border-stroke dark:border-strokedark">
            <div className="flex items-center">
              <div className="text-3xl mr-3">
                {isCorrect ? "🎯" : "❌"}
              </div>
              <div>
                <p className="font-bold">
                  {isCorrect 
                    ? "Excellent! That's correct!" 
                    : "Oops! That's not right."}
                </p>
                {!isCorrect && (
                  <div className="mt-2">
                    <p className="text-sm">The correct answer is:</p>
                    <p className="font-bold" dangerouslySetInnerHTML={{ __html: question.correct_answer }} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-auto pt-4 border-t border-stroke dark:border-strokedark flex items-center justify-between">
          <button
            onClick={() => handleReviewQuestion(Math.max(0, reviewQuestionIndex - 1))}
            disabled={reviewQuestionIndex === 0}
            className={`px-6 py-3 flex items-center space-x-2 font-medium rounded-sm transition-all duration-200
              ${reviewQuestionIndex === 0
                ? "text-body bg-stroke cursor-not-allowed dark:text-bodydark dark:bg-strokedark"
                : "bg-primary bg-opacity-10 text-primary hover:bg-primary hover:text-white dark:bg-meta-4 dark:text-white"
              }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>Previous</span>
          </button>
          
          <button
            onClick={() => handleReviewQuestion(Math.min(questions.length - 1, reviewQuestionIndex + 1))}
            disabled={reviewQuestionIndex === questions.length - 1}
            className={`px-6 py-3 flex items-center space-x-2 font-medium rounded-sm transition-all duration-200
              ${reviewQuestionIndex === questions.length - 1
                ? "text-body bg-stroke cursor-not-allowed dark:text-bodydark dark:bg-strokedark"
                : "bg-primary text-white hover:bg-opacity-80"
              }`}
          >
            <span>Next</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  if (showResult) {
    const percentage = (score / questions.length) * 100;
    let emoji, message, bgGradient;
    
    if (percentage === 100) {
      emoji = "🏆";
      message = "Perfect Score! You're a genius!";
      bgGradient = "from-yellow-300 to-yellow-100";
    } else if (percentage >= 80) {
      emoji = "🎉";
      message = "Amazing job! You really know your stuff!";
      bgGradient = "from-green-300 to-green-100";
    } else if (percentage >= 60) {
      emoji = "😀";
      message = "Good work! That's a solid score!";
      bgGradient = "from-blue-300 to-blue-100";
    } else if (percentage >= 40) {
      emoji = "🤔";
      message = "Not bad! You're getting there!";
      bgGradient = "from-purple-300 to-purple-100";
    } else {
      emoji = "📚";
      message = "Keep learning! You'll do better next time!";
      bgGradient = "from-pink-300 to-pink-100";
    }
    
    return (
      <>
        {/* Portal-based full-page confetti */}
        <FullPageConfetti active={showConfetti} />
        
        {/* Sad rain animation for losing */}
        <SadRain active={showSadRain} />
        
        <div className={`relative overflow-hidden text-center p-8 bg-gradient-to-b ${bgGradient} rounded-sm border border-stroke shadow-default dark:border-strokedark max-w-4xl mx-auto notification-pulse min-h-96`}>
          <div className={`mb-8 ${showConfetti ? "notification-bounce" : showSadRain ? "notification-shake" : ""}`}>
            <span className="text-8xl">{emoji}</span>
          </div>
          
          <h2 className="text-4xl font-bold text-black dark:text-white mb-6">Game Over!</h2>
          
          <div className="mb-8 max-w-xl mx-auto">
            <div className="h-6 w-full bg-white bg-opacity-40 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-2 text-lg font-medium text-body dark:text-bodydark">
              <span>0%</span>
              <span>{Math.round(percentage)}%</span>
              <span>100%</span>
            </div>
          </div>
          
          <p className="text-2xl font-medium text-black dark:text-white mb-4">{message}</p>
          <p className="text-xl mb-8">
            Your final score: <span className="font-bold text-primary text-3xl">{score}</span> out of <span className="font-bold">{questions.length}</span>
          </p>
          
          {/* Question Review */}
          <div className="my-8 max-w-3xl mx-auto">
            <h3 className="text-xl font-bold mb-4">Question Review</h3>
            <div className="grid grid-cols-5 gap-2 mb-6">
              {questions.map((q, idx) => (
                <button 
                  key={idx}
                  onClick={() => handleReviewQuestion(idx)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg cursor-pointer transition-transform hover:scale-110
                    ${userAnswers[idx] === q.correct_answer 
                      ? "bg-green-500 text-white" 
                      : userAnswers[idx] 
                        ? "bg-red-500 text-white"
                        : "bg-gray-200 text-gray-800"
                    }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
            <p className="text-sm text-body dark:text-bodydark mb-6">
              Click on a question number to review your answer
            </p>
          </div>
          
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-primary hover:bg-opacity-80 text-white text-xl font-medium rounded-sm shadow-default transition-all duration-300 transform hover:scale-105 focus:outline-none"
          >
            Play Again
          </button>
        </div>
      </>
    );
  }

  const question = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="p-8 rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark max-w-4xl w-full mx-auto min-h-[70vh] flex flex-col">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <div className="text-lg font-medium text-primary dark:text-white">
            Question {currentIndex + 1} of {questions.length}
          </div>
          <div className="flex space-x-2">
            {userAnswers.map((ans, idx) => (
              <div 
                key={idx}
                onClick={() => !feedbackShown && setCurrentIndex(idx)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all
                  ${currentIndex === idx 
                    ? "bg-primary text-white" 
                    : ans 
                      ? ans === questions[idx].correct_answer
                        ? "bg-green-500 bg-opacity-30 text-green-800 dark:text-green-400"
                        : "bg-red-500 bg-opacity-30 text-red-800 dark:text-red-400"
                      : "bg-stroke text-body dark:bg-strokedark dark:text-bodydark"
                  }
                  ${!feedbackShown ? "cursor-pointer hover:opacity-80" : ""}
                `}
              >
                {idx + 1}
              </div>
            ))}
          </div>
        </div>
        
        <div className="h-3 w-full bg-stroke rounded-full overflow-hidden dark:bg-strokedark">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
      
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <span className="px-3 py-1 bg-primary bg-opacity-10 text-primary text-sm font-medium rounded-full dark:bg-meta-4 dark:text-white">
            {question.difficulty.toUpperCase()}
          </span>
          <span className="ml-2 px-3 py-1 bg-primary bg-opacity-5 text-primary text-sm font-medium rounded-full truncate max-w-xs dark:bg-meta-4 dark:text-white">
            {question.category}
          </span>
        </div>
        
        <div className="p-6 bg-white bg-opacity-70 rounded-sm border border-stroke shadow-default dark:border-strokedark dark:bg-boxdark">
          <h3 
            className="text-2xl font-bold text-black dark:text-white leading-relaxed" 
            dangerouslySetInnerHTML={{ __html: question.question }} 
          />
        </div>
      </div>
      
      <div className="flex-grow">
        <ul className="space-y-4 mb-8">
          {question.answers.map((ans, i) => (
            <li key={i} className={`transition-all duration-200 ${!feedbackShown ? "hover:translate-x-1" : ""}`}>
              <button
                className={`w-full px-6 py-4 rounded-sm border-2 font-medium text-left transition-all duration-200 ${
                  !feedbackShown 
                    ? "border-stroke hover:border-primary hover:bg-white hover:shadow-default dark:border-strokedark dark:text-bodydark dark:hover:border-primary"
                    : ans === question.correct_answer
                      ? "border-green-500 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                      : ans === selectedAnswer
                        ? "border-red-500 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                        : "border-stroke text-body opacity-60 dark:border-strokedark dark:text-bodydark"
                }`}
                onClick={() => !feedbackShown && handleAnswer(ans)}
                disabled={feedbackShown}
                dangerouslySetInnerHTML={{ __html: ans }}
              />
            </li>
          ))}
        </ul>
        
        {feedbackShown && (
          <div 
            className={`p-4 rounded-sm shadow-default notification-enter ${
              selectedAnswer === question.correct_answer 
                ? "bg-green-100 border border-green-200 text-green-700 dark:bg-meta-4 dark:border-green-800 dark:text-green-400" 
                : "bg-red-100 border border-red-200 text-red-700 dark:bg-meta-4 dark:border-red-800 dark:text-red-400"
            }`}
          >
            <div className="flex items-center">
              <div className="text-3xl mr-3">
                {selectedAnswer === question.correct_answer ? "🎯" : "❌"}
              </div>
              <div>
                <p className="font-bold">
                  {selectedAnswer === question.correct_answer 
                    ? "Excellent! That's correct!" 
                    : "Oops! That's not right."}
                </p>
                {selectedAnswer !== question.correct_answer && (
                  <div className="mt-2">
                    <p className="text-sm">The correct answer is:</p>
                    <p className="font-bold" dangerouslySetInnerHTML={{ __html: question.correct_answer }} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-auto pt-4 border-t border-stroke dark:border-strokedark flex items-center justify-between">
        <button
          onClick={goToPrevQuestion}
          disabled={currentIndex === 0 || (currentIndex === questions.length - 1 && !feedbackShown)}
          className={`px-6 py-3 flex items-center space-x-2 font-medium rounded-sm transition-all duration-200
            ${currentIndex === 0 || (currentIndex === questions.length - 1 && !feedbackShown)
              ? "text-body bg-stroke cursor-not-allowed dark:text-bodydark dark:bg-strokedark"
              : "bg-primary bg-opacity-10 text-primary hover:bg-primary hover:text-white dark:bg-meta-4 dark:text-white"
            }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span>Previous</span>
        </button>
        
        {currentIndex === questions.length - 1 && feedbackShown ? (
          <button
            onClick={submitQuiz}
            className="px-8 py-3 font-medium rounded-sm transition-all duration-200 bg-primary text-white hover:bg-opacity-80"
          >
            Submit Quiz
          </button>
        ) : (
          <button
            onClick={feedbackShown ? goToNextQuestion : null}
            disabled={!feedbackShown}
            className={`px-6 py-3 flex items-center space-x-2 font-medium rounded-sm transition-all duration-200
              ${!feedbackShown
                ? "text-body bg-stroke cursor-not-allowed dark:text-bodydark dark:bg-strokedark"
                : "bg-primary text-white hover:bg-opacity-80"
              }`}
          >
            <span>Next</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default TriviaGame;