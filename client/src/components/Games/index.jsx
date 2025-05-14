import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import TriviaGame from "./TriviaGame";
import MemoryGame from "./MemoryGame";
import TicTacToe from "./TicTacToe";
import DefaultLayout from "../../layout/DefaultLayout";
import axios from "axios";
import { checkAuthHeaders } from "../../lib/setAuthToken";

// Game card icons
const GameIcons = {
  "Trivia Quiz": (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  "Memory Match": (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  "Tic Tac Toe": (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  ),
};

// Loading animation component
const LoadingAnimation = () => (
  <div className="flex flex-col items-center justify-center p-8 rounded-xl bg-white/10 backdrop-blur-sm animate-pulse">
    <div className="relative w-20 h-20 mb-4">
      <div className="absolute top-0 left-0 w-full h-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
      <div className="absolute top-2 left-2 w-16 h-16 border-4 border-t-transparent border-r-primary border-b-transparent border-l-transparent rounded-full animate-spin-slow"></div>
      <div className="absolute top-4 left-4 w-12 h-12 border-4 border-t-transparent border-r-transparent border-b-primary border-l-transparent rounded-full animate-spin-slower"></div>
    </div>
    <p className="text-white font-bold text-xl">Creating room...</p>
    <p className="text-white/70 text-sm mt-2">Starting the fun...</p>
  </div>
);

// Decorative animated elements
const GamingDecorations = () => (
  <>
    <div className="gaming-decoration top-20 left-10 w-8 h-8 animate-float delay-0">🎮</div>
    <div className="gaming-decoration top-40 right-20 w-8 h-8 animate-float delay-1">🎲</div>
    <div className="gaming-decoration bottom-40 left-30 w-8 h-8 animate-float delay-2">🏆</div>
    <div className="gaming-decoration bottom-20 right-40 w-8 h-8 animate-float delay-3">🎯</div>
    <div className="gaming-decoration top-60 right-60 w-8 h-8 animate-float delay-4">🧩</div>
  </>
);

const GameHub = () => {
  const [selectedGame, setSelectedGame] = useState(null);
  const [roomCreated, setRoomCreated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [joinRoomName, setJoinRoomName] = useState("");
  const [currentRoom, setCurrentRoom] = useState(null);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [selectedGameIndex, setSelectedGameIndex] = useState(null);
  const [animatedItems, setAnimatedItems] = useState([]);
  const [error, setError] = useState(null);
  const { _CURRENT } = useSelector((state) => state.users);

  const games = [
    { name: "Trivia Quiz", component: (room) => <TriviaGame room={room} onGameEnd={handleGameEnd} /> },
    { name: "Memory Match", component: (room) => <MemoryGame room={room} onGameEnd={handleGameEnd} /> },
    { name: "Tic Tac Toe", component: (room) => <TicTacToe room={room} onGameEnd={handleGameEnd} /> },
  ];

  useEffect(() => {
    // Initialize axios configuration
    axios.defaults.withCredentials = true;
  
    // Ensure token is applied
    checkAuthHeaders();
    
    // Fetch game rooms
    fetchRooms();
  
    // Animate items sequentially
    const itemsToAnimate = ["header", "games", "join", "instructions"];
    let delay = 0;
  
    itemsToAnimate.forEach((item) => {
      setTimeout(() => {
        setAnimatedItems((prev) => [...prev, item]);
      }, delay);
      delay += 200;
    });
  }, []);
  
  const fetchRooms = async () => {
    try {
      setLoading(true);
      // FIXED: Use exact path to game rooms API
      const response = await axios.get("/api/games");
      
      if (response.data && Array.isArray(response.data)) {
        setRooms(response.data);
        setError(null);
      } else {
        console.error("Unexpected data format:", response.data);
        setRooms([]);
        setError("Failed to load rooms: Invalid data format");
      }
    } catch (err) {
      console.error("Error loading rooms:", err.response?.data || err.message);
      setError(`Failed to load rooms: ${err.response?.data?.message || err.message}`);
      
      // Handle unauthorized access
      if (err.response?.status === 401) {
        window.location.href = "/login";
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateRoom = async (e) => {
    e.preventDefault();
  
    if (!newRoomName.trim() || selectedGameIndex === null) return;
  
    setLoading(true);
    try {
      const gameType = games[selectedGameIndex].name;
  
      // FIXED: Use exact path to game rooms API
      const response = await axios.post("/api/games/newRoom", {
        roomName: newRoomName,
        gameType,
      });
  
      const roomData = response.data;
      setCurrentRoom(roomData.room);
      setSelectedGame(selectedGameIndex);
      setRoomCreated(true);
      setShowRoomModal(false);
      setError(null);
      fetchRooms();
    } catch (err) {
      console.error("Error creating room:", err.response?.data || err.message);
      setError(`Error creating room: ${err.response?.data?.message || err.message}`);
      
      if (err.response?.status === 401) {
        window.location.href = "/login";
      }
    } finally {
      setLoading(false);
    }
  };
  
  const openRoomModal = (index = null) => {
    setSelectedGameIndex(index);
    setShowRoomModal(true);
  };

  const handleJoinRoom = () => {
    const room = rooms.find((r) => r.roomName === joinRoomName);
    if (!room) {
      setError("Room not found");
      return;
    }

    const gameIndex = games.findIndex((g) => g.name === room.gameType);
    if (gameIndex === -1) {
      setError("Game type not recognized");
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setCurrentRoom(room);
      setSelectedGame(gameIndex);
      setRoomCreated(true);
      setLoading(false);
      setError(null);
    }, 800);
  };

  const handleGameEnd = (score) => {
    saveGameScore(score);
  };

  const saveGameScore = async (score) => {
    try {
      // FIXED: Use exact path to game score API
      const response = await axios.post("/api/games/score", {
        roomName: currentRoom.roomName,
        username: _CURRENT.fullName,
        score,
      });

      const data = response.data;
      setCurrentRoom((prev) => ({ ...prev, leaderboard: data.leaderboard }));
      setError(null);
    } catch (err) {
      console.error("Error saving score:", err.response?.data || err.message);
      setError(`Error saving score: ${err.response?.data?.message || err.message}`);
      
      if (err.response?.status === 401) {
        window.location.href = "/login";
      }
    }
  };

  const exitRoom = () => {
    setRoomCreated(false);
    setSelectedGame(null);
    setCurrentRoom(null);
    setError(null);
  };

  // FIXED: Calculate players from room leaderboards
  // This counts unique players across all game rooms
  const calculateOnlinePlayers = () => {
    if (!Array.isArray(rooms) || rooms.length === 0) return 0;
    
    // Collect all player names from all room leaderboards
    const uniquePlayers = new Set();
    
    rooms.forEach(room => {
      if (room.leaderboard && Array.isArray(room.leaderboard)) {
        room.leaderboard.forEach(entry => {
          if (entry.username) {
            uniquePlayers.add(entry.username);
          }
        });
      }
    });
    
    return uniquePlayers.size;
  };

  const onlinePlayers = calculateOnlinePlayers();

  return (
    <DefaultLayout>
      <div className="relative min-h-screen">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-meta-4/30 pointer-events-none"></div>
        <GamingDecorations />
        <div className="relative p-6 z-10">
          <div className={`mb-8 ${animatedItems.includes("header") ? "animate-fade-in" : "opacity-0"}`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
              <h1 className="text-4xl font-bold text-black dark:text-white flex items-center">
                <span className="text-5xl mr-3">🎮</span>
                Game Hub
                <span className="ml-3 text-sm bg-primary text-white px-2 py-1 rounded-full">Beta</span>
              </h1>
              <div className="mt-4 md:mt-0 flex items-center bg-white/20 dark:bg-meta-4 backdrop-blur-sm rounded-full px-4 py-2 text-black dark:text-white">
                <div className="animate-pulse mr-2 h-3 w-3 rounded-full bg-green-500"></div>
                <span className="font-medium">{onlinePlayers} Players Online</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <p className="text-body dark:text-bodydark max-w-2xl mb-4 sm:mb-0">
                Welcome to the Game Hub! Challenge yourself with these fun games and compete on the leaderboard.
                Create a room to start a new game or join an existing room.
              </p>
              <button
                onClick={() => openRoomModal(null)}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors shadow-lg flex items-center font-medium animate-pulse-slow"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New Room
              </button>
            </div>
          </div>

          {loading && !roomCreated && (
            <div className="flex justify-center my-8">
              <LoadingAnimation />
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg">
              {error}
            </div>
          )}

          {showRoomModal && (
            <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
              <div className="bg-white dark:bg-boxdark p-6 rounded-lg shadow-xl w-full max-w-md scale-in-animation">
                <h3 className="text-2xl font-bold text-black dark:text-white mb-4">
                  Create {selectedGameIndex !== null ? games[selectedGameIndex].name : "Game"} Room
                </h3>
                <form onSubmit={handleCreateRoom}>
                  {selectedGameIndex === null && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-body dark:text-bodydark mb-2">
                        Select Game
                      </label>
                      <select
                        className="w-full border border-stroke bg-white dark:border-strokedark dark:bg-meta-4 rounded-md px-4 py-2 outline-none focus:border-primary dark:focus:border-primary"
                        onChange={(e) => setSelectedGameIndex(parseInt(e.target.value))}
                        required
                      >
                        <option value="">-- Select a game --</option>
                        {games.map((game, index) => (
                          <option key={index} value={index}>
                            {game.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-body dark:text-bodydark mb-2">
                      Room Name
                    </label>
                    <input
                      type="text"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      placeholder="Enter a unique room name"
                      className="w-full border border-stroke bg-white dark:border-strokedark dark:bg-meta-4 rounded-md px-4 py-2 outline-none focus:border-primary dark:focus:border-primary"
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowRoomModal(false)}
                      className="px-4 py-2 border border-stroke text-body dark:border-strokedark dark:text-bodydark rounded-md hover:bg-stroke/50 dark:hover:bg-meta-4 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-primary text-white rounded-md hover:bg-opacity-90 transition-colors"
                      disabled={selectedGameIndex === null}
                    >
                      Create Room
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {!roomCreated ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className={`${animatedItems.includes("games") ? "animate-fade-in-up" : "opacity-0"}`}>
                <h2 className="text-xl font-bold text-black dark:text-white mb-4 flex items-center">
                  <span className="text-2xl mr-2">🎲</span> Choose a Game
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {games.map((game, index) => (
                    <div
                      key={index}
                      onClick={() => openRoomModal(index)}
                      className="game-card bg-white dark:bg-boxdark p-6 rounded-xl shadow-game border border-stroke/40 dark:border-strokedark/40 flex flex-col items-center justify-center hover:scale-105 hover:shadow-game-hover transition-all duration-300 cursor-pointer"
                    >
                      <div className="text-primary dark:text-white mb-2">
                        {GameIcons[game.name]}
                      </div>
                      <h3 className="text-lg font-bold text-black dark:text-white">{game.name}</h3>
                      <span className="mt-2 bg-primary/10 text-primary dark:bg-primary/20 px-3 py-1 rounded-full text-xs font-medium">
                        Start Game
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className={`${animatedItems.includes("join") ? "animate-fade-in-up delay-200" : "opacity-0"}`}>
                <h2 className="text-xl font-bold text-black dark:text-white mb-4 flex items-center">
                  <span className="text-2xl mr-2">🔑</span> Join an Existing Room
                </h2>
                <div className="bg-white/80 dark:bg-boxdark/80 backdrop-blur-sm p-6 rounded-xl shadow-game border border-stroke/40 dark:border-strokedark/40">
                  <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <input
                      type="text"
                      placeholder="Enter room name"
                      value={joinRoomName}
                      onChange={(e) => setJoinRoomName(e.target.value)}
                      className="flex-1 border border-stroke bg-white dark:border-strokedark dark:bg-meta-4 rounded-md px-4 py-2 outline-none focus:border-primary dark:focus:border-primary"
                    />
                    <button
                      onClick={handleJoinRoom}
                      disabled={!joinRoomName.trim()}
                      className="px-6 py-2 bg-primary text-white rounded-md hover:bg-opacity-90 disabled:bg-opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1z" clipRule="evenodd" />
                        <path d="M11 4a1 1 0 10-2 0v1a1 1 0 002 0V4zM10 7a1 1 0 011 1v1h2a1 1 0 110 2h-3a1 1 0 01-1-1V8a1 1 0 011-1zM16 9a1 1 0 100 2 1 1 0 000-2zM9 13a1 1 0 011-1h1a1 1 0 110 2v2a1 1 0 11-2 0v-3zM7 11a1 1 0 100-2H4a1 1 0 100 2h3z" />
                      </svg>
                      Join Room
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    <h4 className="text-sm font-semibold text-body dark:text-bodydark mb-2">Available Rooms:</h4>
                    {rooms.length > 0 ? (
                      <ul className="space-y-2">
                        {rooms.map((room, index) => (
                          <li
                            key={index}
                            className="bg-white dark:bg-meta-4 rounded-lg p-3 hover:bg-primary/5 dark:hover:bg-strokedark transition-colors border border-stroke/40 dark:border-strokedark/40"
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex items-center">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary dark:bg-primary/20">
                                  {room.gameType === "Trivia Quiz" ? "🎯" : room.gameType === "Memory Match" ? "🧠" : "⭕"}
                                </div>
                                <div className="ml-3">
                                  <span className="font-medium text-black dark:text-white">{room.roomName}</span>
                                  <div className="text-xs text-body dark:text-bodydark">{room.gameType}</div>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  setJoinRoomName(room.roomName);
                                  handleJoinRoom();
                                }}
                                className="text-xs bg-primary/10 hover:bg-primary hover:text-white text-primary px-3 py-1 rounded-full transition-colors"
                              >
                                Join
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-body dark:text-bodydark text-sm italic">No active rooms. Create one to start playing!</p>
                    )}
                  </div>
                </div>
              </div>
              <div className={`md:col-span-2 ${animatedItems.includes("instructions") ? "animate-fade-in-up delay-300" : "opacity-0"}`}>
                <div className="bg-white/80 dark:bg-boxdark/80 backdrop-blur-sm p-6 rounded-xl shadow-game border border-stroke/40 dark:border-strokedark/40">
                  <h2 className="text-xl font-bold text-black dark:text-white mb-4 flex items-center">
                    <span className="text-2xl mr-2">📝</span> How to Play
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-start">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-3 flex-shrink-0">1</div>
                      <div>
                        <h3 className="font-medium text-black dark:text-white mb-1">Create or Join a Room</h3>
                        <p className="text-sm text-body dark:text-bodydark">Start by creating a new game room or joining an existing one with friends.</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-3 flex-shrink-0">2</div>
                      <div>
                        <h3 className="font-medium text-black dark:text-white mb-1">Play the Game</h3>
                        <p className="text-sm text-body dark:text-bodydark">Complete the game by following the specific rules of each game type.</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-3 flex-shrink-0">3</div>
                      <div>
                        <h3 className="font-medium text-black dark:text-white mb-1">Check the Leaderboard</h3>
                        <p className="text-sm text-body dark:text-bodydark">See how your score compares with other players in the room.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="game-container animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-3">
                    {currentRoom?.gameType === "Trivia Quiz" ? "🎯" : currentRoom?.gameType === "Memory Match" ? "🧠" : "⭕"}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-black dark:text-white">{currentRoom?.gameType}</h2>
                    <p className="text-sm text-body dark:text-bodydark">Room: {currentRoom?.roomName}</p>
                  </div>
                </div>
                <button
                  onClick={exitRoom}
                  className="flex items-center px-4 py-2 bg-meta-4 text-body dark:text-bodydark rounded-md hover:bg-opacity-80 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Exit Game
                </button>
              </div>
              <div className="rounded-xl overflow-hidden relative z-0">
                <div className="game-content">
                  {loading ? <LoadingAnimation /> : games[selectedGame].component(currentRoom)}
                </div>
                {currentRoom?.leaderboard && currentRoom.leaderboard.length > 0 && (
                  <div className="mt-8 animate-fade-in">
                    <div className="bg-white/90 dark:bg-boxdark/90 backdrop-blur-sm p-6 rounded-xl shadow-game border border-stroke/40 dark:border-strokedark/40">
                      <h3 className="text-xl font-bold text-black dark:text-white mb-4 flex items-center">
                        <span className="text-2xl mr-2">🏆</span> Leaderboard
                      </h3>
                      <div className="overflow-hidden rounded-lg border border-stroke dark:border-strokedark">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-primary/10 dark:bg-meta-4">
                              <th className="py-3 px-4 text-left text-sm font-medium text-black dark:text-white">Rank</th>
                              <th className="py-3 px-4 text-left text-sm font-medium text-black dark:text-white">Player</th>
                              <th className="py-3 px-4 text-right text-sm font-medium text-black dark:text-white">Score</th>
                            </tr>
                          </thead>
                          <tbody>
                            {currentRoom.leaderboard
                              .sort((a, b) => b.score - a.score)
                              .map((entry, index) => (
                                <tr
                                  key={index}
                                  className={`border-t border-stroke dark:border-strokedark hover:bg-primary/5 dark:hover:bg-meta-4/50 transition-colors
                                    ${entry.username === _CURRENT.fullName ? "bg-primary/5 dark:bg-primary/10" : ""}`}
                                >
                                  <td className="py-3 px-4">
                                    <div className="flex items-center">
                                      {index < 3 ? (
                                        <span className="text-lg">{index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}</span>
                                      ) : (
                                        <span className="h-6 w-6 rounded-full bg-meta-4 flex items-center justify-center text-xs font-medium">
                                          {index + 1}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 font-medium text-black dark:text-white">
                                    {entry.username}
                                    {entry.username === _CURRENT.fullName && (
                                      <span className="ml-2 text-xs bg-primary text-white px-2 py-0.5 rounded-full">You</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-right font-bold text-primary">{entry.score}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </DefaultLayout>
  );
};

export default GameHub;