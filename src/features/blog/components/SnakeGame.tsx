import React, { useState, useEffect, useCallback, useRef } from 'react';

// Type definitions
interface Position {
  x: number;
  y: number;
}

interface Direction {
  x: number;
  y: number;
}

interface TouchPosition {
  x: number;
  y: number;
}

interface ActionHistoryItem {
  type:
    | 'applied_immediate'
    | 'applied_queue'
    | 'queued'
    | 'cancelled'
    | 'game_over';
  direction: Direction;
  reason?: 'opposite' | 'duplicate' | 'wall' | 'self';
  timestamp: number;
}

interface GridConfig {
  cellSize: number;
  gridSize: number;
}

interface GameState {
  gameStarted: boolean;
  gameOver: boolean;
}

interface PathNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent?: PathNode | null;
}

const GRID_SIZE = 28;
const INITIAL_SNAKE: Position[] = [{ x: 10, y: 10 }];
const INITIAL_DIRECTION: Direction = { x: 0, y: -1 };
const INITIAL_FOOD: Position = { x: 15, y: 15 };
const MOVE_INTERVAL = 120; // Snake movement speed (ms)

const SnakeGameWithQueue = () => {
  const [snake, setSnake] = useState<Position[]>(INITIAL_SNAKE);
  const [direction, setDirection] = useState<Direction>(INITIAL_DIRECTION);
  const [directionQueue, setDirectionQueue] = useState<Direction[]>([]);
  const [food, setFood] = useState<Position>(INITIAL_FOOD);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [touchStart, setTouchStart] = useState<TouchPosition | null>(null);
  const [touchEnd, setTouchEnd] = useState<TouchPosition | null>(null);
  const [actionHistory, setActionHistory] = useState<ActionHistoryItem[]>([]);
  const [moveCount, setMoveCount] = useState<number>(0);
  const [shortestPath, setShortestPath] = useState<Position[]>([]);
  const [optimalMoves, setOptimalMoves] = useState<number>(0);
  const [storedOptimalMoves, setStoredOptimalMoves] = useState<number>(0);
  const [currentEfficiency, setCurrentEfficiency] = useState<number>(100);
  const [averageEfficiency, setAverageEfficiency] = useState<number>(100);
  const [totalFoodCollected, setTotalFoodCollected] = useState<number>(0);
  const [showTrainingPath, setShowTrainingPath] = useState<boolean>(true);

  // Refs for high-frequency game loop
  const gameLoopRef = useRef<number | undefined>(undefined);
  const lastMoveTimeRef = useRef<number>(0);
  const directionRef = useRef<Direction>(INITIAL_DIRECTION);
  const directionQueueRef = useRef<Direction[]>([]);
  const snakeRef = useRef<Position[]>(INITIAL_SNAKE);
  const gameStateRef = useRef<GameState>({
    gameStarted: false,
    gameOver: false,
  });

  // Update refs when state changes
  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  useEffect(() => {
    directionQueueRef.current = directionQueue;
  }, [directionQueue]);

  useEffect(() => {
    snakeRef.current = snake;
  }, [snake]);

  useEffect(() => {
    gameStateRef.current.gameStarted = gameStarted;
    gameStateRef.current.gameOver = gameOver;
  }, [gameStarted, gameOver]);

  // Responsive grid sizing
  const getGridSize = (): GridConfig => {
    if (typeof window === 'undefined') {
      return {
        cellSize: 19,
        gridSize: GRID_SIZE,
      };
    }
    const isMobile = window.innerWidth < 768;
    return {
      cellSize: isMobile ? 12 : 19,
      gridSize: GRID_SIZE,
    };
  };

  const [gridConfig, setGridConfig] = useState<GridConfig>(getGridSize);

  // Update grid size on window resize
  useEffect(() => {
    const handleResize = () => {
      setGridConfig(getGridSize());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const generateFood = useCallback((): Position => {
    let newFood: Position;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (
      snakeRef.current.some(
        (segment: Position) =>
          segment.x === newFood.x && segment.y === newFood.y
      )
    );
    return newFood;
  }, []);

  // A* pathfinding to calculate shortest path to food
  const findShortestPath = useCallback(
    (
      start: Position,
      target: Position,
      snakeBody: Position[],
      currentDirection?: Direction
    ): Position[] => {
      const heuristic = (a: Position, b: Position): number =>
        Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

      const openSet: PathNode[] = [
        {
          ...start,
          g: 0,
          h: heuristic(start, target),
          f: heuristic(start, target),
          parent: null,
        },
      ];
      const closedSet = new Set<string>();

      while (openSet.length > 0) {
        // Find node with lowest f score
        let current = openSet[0];
        let currentIndex = 0;
        for (let i = 1; i < openSet.length; i++) {
          if (openSet[i].f < current.f) {
            current = openSet[i];
            currentIndex = i;
          }
        }

        // Remove current from open set
        openSet.splice(currentIndex, 1);
        closedSet.add(`${current.x},${current.y}`);

        // Found target
        if (current.x === target.x && current.y === target.y) {
          const path: Position[] = [];
          let temp: PathNode | null | undefined = current;
          while (temp) {
            path.unshift({ x: temp.x, y: temp.y });
            temp = temp.parent;
          }
          return path;
        }

        // Check neighbors
        const neighbors: Position[] = [
          { x: current.x + 1, y: current.y },
          { x: current.x - 1, y: current.y },
          { x: current.x, y: current.y + 1 },
          { x: current.x, y: current.y - 1 },
        ];

        for (const neighbor of neighbors) {
          // Skip if out of bounds or in snake body or already processed
          if (
            neighbor.x < 0 ||
            neighbor.x >= GRID_SIZE ||
            neighbor.y < 0 ||
            neighbor.y >= GRID_SIZE ||
            snakeBody.some(
              (segment) => segment.x === neighbor.x && segment.y === neighbor.y
            ) ||
            closedSet.has(`${neighbor.x},${neighbor.y}`)
          ) {
            continue;
          }

          // Skip if this is the first move from start and it would go backwards
          if (
            current.x === start.x &&
            current.y === start.y &&
            currentDirection
          ) {
            const moveDirection = {
              x: neighbor.x - current.x,
              y: neighbor.y - current.y,
            };
            const isOpposite =
              (currentDirection.x === 1 && moveDirection.x === -1) ||
              (currentDirection.x === -1 && moveDirection.x === 1) ||
              (currentDirection.y === 1 && moveDirection.y === -1) ||
              (currentDirection.y === -1 && moveDirection.y === 1);

            if (isOpposite) {
              continue;
            }
          }

          const g = current.g + 1;
          const h = heuristic(neighbor, target);
          const f = g + h;

          // Check if this path to neighbor is better
          const existingNode = openSet.find(
            (node) => node.x === neighbor.x && node.y === neighbor.y
          );
          if (!existingNode || g < existingNode.g) {
            const neighborNode: PathNode = {
              x: neighbor.x,
              y: neighbor.y,
              g,
              h,
              f,
              parent: current,
            };

            if (existingNode) {
              // Update existing node
              Object.assign(existingNode, neighborNode);
            } else {
              // Add new node
              openSet.push(neighborNode);
            }
          }
        }
      }

      return []; // No path found
    },
    []
  );

  // Update shortest path whenever snake or food changes
  useEffect(() => {
    if (gameStarted && !gameOver && snake.length > 0) {
      const path = findShortestPath(snake[0], food, snake.slice(1), direction); // Exclude head from obstacles
      setShortestPath(path);
    }
  }, [snake, food, direction, gameStarted, gameOver, findShortestPath]);

  const resetGame = () => {
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
    }

    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setDirectionQueue([]);
    setFood(INITIAL_FOOD);
    setGameOver(false);
    setScore(0);
    setGameStarted(false);
    setTouchStart(null);
    setTouchEnd(null);
    setActionHistory([]);
    setMoveCount(0);
    setShortestPath([]);
    setOptimalMoves(0);
    setStoredOptimalMoves(0);
    setCurrentEfficiency(100);
    setAverageEfficiency(100);
    setTotalFoodCollected(0);
    lastMoveTimeRef.current = 0;
  };

  // Direction change with immediate processing for first input
  const changeDirection = useCallback((newDirection: Direction) => {
    if (!gameStateRef.current.gameStarted || gameStateRef.current.gameOver)
      return;

    const timestamp = Date.now();
    let loggedAction: ActionHistoryItem | null = null;

    setDirectionQueue((currentQueue) => {
      // Get the last direction (either from queue or current direction)
      const lastDirection =
        currentQueue.length > 0
          ? currentQueue[currentQueue.length - 1]
          : directionRef.current;

      // Check if new direction is valid (not opposite to last direction)
      const isOpposite =
        (lastDirection.x === 1 && newDirection.x === -1) ||
        (lastDirection.x === -1 && newDirection.x === 1) ||
        (lastDirection.y === 1 && newDirection.y === -1) ||
        (lastDirection.y === -1 && newDirection.y === 1);

      // Don't add if it's the same direction or opposite
      if (
        isOpposite ||
        (lastDirection.x === newDirection.x &&
          lastDirection.y === newDirection.y)
      ) {
        // Log cancelled action
        loggedAction = {
          type: 'cancelled',
          direction: newDirection,
          reason: isOpposite ? 'opposite' : 'duplicate',
          timestamp,
        };
        return currentQueue;
      }

      // Will be queued (not applied immediately)
      loggedAction = {
        type: 'queued',
        direction: newDirection,
        timestamp,
      };

      // Add to queue (limit to 2 for tighter control)
      const updatedQueue = [...currentQueue, newDirection];
      return updatedQueue.slice(-2);
    });

    // For immediate feedback - update direction right away if queue is empty
    setDirection((currentDir) => {
      const currentQueue = directionQueueRef.current;

      // Only update immediately if queue is empty (first input)
      if (currentQueue.length === 0) {
        const isOpposite =
          (currentDir.x === 1 && newDirection.x === -1) ||
          (currentDir.x === -1 && newDirection.x === 1) ||
          (currentDir.y === 1 && newDirection.y === -1) ||
          (currentDir.y === -1 && newDirection.y === 1);

        if (
          !isOpposite &&
          !(currentDir.x === newDirection.x && currentDir.y === newDirection.y)
        ) {
          // Override the log action since this was applied immediately
          loggedAction = {
            type: 'applied_immediate',
            direction: newDirection,
            timestamp,
          };
          return newDirection;
        }
      }
      return currentDir;
    });

    // Log the action once at the end
    if (loggedAction) {
      setActionHistory((prev) => [
        ...prev.slice(-19),
        loggedAction as ActionHistoryItem,
      ]);
    }
  }, []);

  // Main game loop
  const gameLoop = useCallback(
    (currentTime: number) => {
      if (!gameStateRef.current.gameStarted || gameStateRef.current.gameOver) {
        return;
      }

      // Only move snake at specified interval
      if (currentTime - lastMoveTimeRef.current >= MOVE_INTERVAL) {
        // Process direction queue first
        if (directionQueueRef.current.length > 0) {
          const nextDirection = directionQueueRef.current[0];
          setDirection(nextDirection);
          setDirectionQueue((queue) => queue.slice(1));

          // Log applied from queue
          setActionHistory((prev) => [
            ...prev.slice(-19),
            {
              type: 'applied_queue',
              direction: nextDirection,
              timestamp: currentTime,
            },
          ]);
        }

        const currentSnake = snakeRef.current;
        const currentDirection = directionRef.current;

        const newSnake = [...currentSnake];
        const head = { ...newSnake[0] };

        head.x += currentDirection.x;
        head.y += currentDirection.y;

        // Check wall collision
        if (
          head.x < 0 ||
          head.x >= GRID_SIZE ||
          head.y < 0 ||
          head.y >= GRID_SIZE
        ) {
          setGameOver(true);
          setActionHistory((prev) => [
            ...prev.slice(-19),
            {
              type: 'game_over',
              direction: currentDirection,
              reason: 'wall',
              timestamp: currentTime,
            },
          ]);
          return;
        }

        // Check self collision
        if (
          newSnake.some(
            (segment) => segment.x === head.x && segment.y === head.y
          )
        ) {
          setGameOver(true);
          setActionHistory((prev) => [
            ...prev.slice(-19),
            {
              type: 'game_over',
              direction: currentDirection,
              reason: 'self',
              timestamp: currentTime,
            },
          ]);
          return;
        }

        newSnake.unshift(head);

        // Increment move count first, before checking collisions
        setMoveCount((prev) => prev + 1);

        // Check food collision
        if (head.x === food.x && head.y === food.y) {
          setScore((prev) => prev + 10);

          // Calculate efficiency using stored optimal moves from when food spawned
          // Use the current moveCount state (before reset)
          setMoveCount((currentMoves) => {
            if (storedOptimalMoves > 0 && currentMoves > 0) {
              console.log(
                `Efficiency calc: ${storedOptimalMoves} optimal / ${currentMoves} actual = ${(storedOptimalMoves / currentMoves) * 100}%`
              );
              const efficiency = Math.round(
                (storedOptimalMoves / currentMoves) * 100
              );
              setCurrentEfficiency(efficiency);

              // Update running average
              setTotalFoodCollected((prevTotal) => {
                const newTotal = prevTotal + 1;
                setAverageEfficiency((prevAvg) => {
                  const newAverage = Math.round(
                    (prevAvg * prevTotal + efficiency) / newTotal
                  );
                  return newAverage;
                });
                return newTotal;
              });
            }
            return 0; // Reset for next food
          });

          const newFood = generateFood();
          setFood(newFood);

          // Calculate and store optimal path for next food
          const newPath = findShortestPath(
            head,
            newFood,
            newSnake.slice(1),
            currentDirection
          );
          const newOptimalMoves = newPath.length > 0 ? newPath.length - 1 : 0;
          setOptimalMoves(newOptimalMoves);
          setStoredOptimalMoves(newOptimalMoves);
        } else {
          newSnake.pop();
        }

        setSnake(newSnake);
        lastMoveTimeRef.current = currentTime;
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    },
    [food, generateFood]
  );

  // Start/stop game loop
  useEffect(() => {
    if (gameStarted && !gameOver) {
      lastMoveTimeRef.current = performance.now();
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    } else if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
    }

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameLoop, gameStarted, gameOver]);

  // Touch handling for swipe controls
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      setTouchEnd(null);
      setTouchStart({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (touchStart) {
        setTouchEnd({
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        });
      }
    };

    const handleTouchEnd = (_e: TouchEvent) => {
      if (!touchStart || !touchEnd) {
        setTouchStart(null);
        setTouchEnd(null);
        return;
      }

      const distanceX = touchStart.x - touchEnd.x;
      const distanceY = touchStart.y - touchEnd.y;
      const isLeftSwipe = distanceX > 50;
      const isRightSwipe = distanceX < -50;
      const isUpSwipe = distanceY > 50;
      const isDownSwipe = distanceY < -50;

      // Only process swipe if it's significant enough
      if (Math.abs(distanceX) < 30 && Math.abs(distanceY) < 30) {
        setTouchStart(null);
        setTouchEnd(null);
        return;
      }

      // Determine direction based on strongest swipe
      if (Math.abs(distanceX) > Math.abs(distanceY)) {
        if (isLeftSwipe) {
          changeDirection({ x: -1, y: 0 });
        } else if (isRightSwipe) {
          changeDirection({ x: 1, y: 0 });
        }
      } else {
        if (isUpSwipe) {
          changeDirection({ x: 0, y: -1 });
        } else if (isDownSwipe) {
          changeDirection({ x: 0, y: 1 });
        }
      }

      setTouchStart(null);
      setTouchEnd(null);
    };

    const options: AddEventListenerOptions = { passive: false };

    document.addEventListener('touchstart', handleTouchStart, options);
    document.addEventListener('touchmove', handleTouchMove, options);
    document.addEventListener('touchend', handleTouchEnd, options);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart, options);
      document.removeEventListener('touchmove', handleTouchMove, options);
      document.removeEventListener('touchend', handleTouchEnd, options);
    };
  }, [gameStarted, gameOver, touchStart, touchEnd, changeDirection]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!gameStarted && (e.key === ' ' || e.key === 'Enter')) {
        setGameStarted(true);
        return;
      }

      if (gameOver && (e.key === ' ' || e.key === 'Enter')) {
        resetGame();
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          changeDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          changeDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          changeDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          changeDirection({ x: 1, y: 0 });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameOver, gameStarted, changeDirection]);

  const startGame = () => {
    setGameStarted(true);
    // Calculate and store initial optimal path when game starts
    const initialPath = findShortestPath(
      INITIAL_SNAKE[0],
      INITIAL_FOOD,
      [],
      INITIAL_DIRECTION
    );
    const initialOptimal = initialPath.length > 0 ? initialPath.length - 1 : 0;
    setOptimalMoves(initialOptimal);
    setStoredOptimalMoves(initialOptimal);
  };

  // Helper function to get direction name for display
  const getDirectionName = (dir: Direction): string => {
    if (dir.x === 0 && dir.y === -1) return '↑';
    if (dir.x === 0 && dir.y === 1) return '↓';
    if (dir.x === -1 && dir.y === 0) return '←';
    if (dir.x === 1 && dir.y === 0) return '→';
    return '?';
  };

  return (
    <div className="flex flex-col items-center gap-8 my-6">
      <div className="flex flex-col items-center gap-8">
        {/* Game Container */}
        <div className="flex flex-col items-center">
          {/* Score */}
          <div className="text-center mb-4">
            <span className="text-2xl font-bold text-orange-500">
              Score: {score}
            </span>
          </div>

          {/* Game Grid */}
          <div
            className="relative grid gap-0 border-2 rounded-lg overflow-hidden touch-none select-none bg-card border-orange-500"
            style={{
              gridTemplateColumns: `repeat(${GRID_SIZE}, ${gridConfig.cellSize}px)`,
              width: `${GRID_SIZE * gridConfig.cellSize}px`,
              height: `${GRID_SIZE * gridConfig.cellSize}px`,
            }}
          >
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
              const x = index % GRID_SIZE;
              const y = Math.floor(index / GRID_SIZE);

              const isSnake = snake.some(
                (segment) => segment.x === x && segment.y === y
              );
              const isHead =
                snake.length > 0 && snake[0].x === x && snake[0].y === y;
              const isFood = food.x === x && food.y === y;
              const isPath =
                showTrainingPath &&
                shortestPath.some(
                  (segment) => segment.x === x && segment.y === y
                ) &&
                !isSnake &&
                !isFood;

              return (
                <div
                  key={index}
                  className={`${isFood ? 'rounded-full animate-pulse bg-orange-600 dark:bg-orange-500' : ''} ${
                    isHead ? 'bg-orange-600 dark:bg-orange-500' : ''
                  } ${isSnake && !isHead ? 'bg-orange-500 dark:bg-orange-400' : ''} ${
                    isPath ? 'border border-orange-500 dark:border-orange-400' : ''
                  }`}
                  style={{
                    width: `${gridConfig.cellSize}px`,
                    height: `${gridConfig.cellSize}px`,
                  }}
                />
              );
            })}

            {/* Game Over Overlay */}
            {gameOver && (
              <div className="absolute inset-0 bg-card/95 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center px-4">
                  <h3 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-4">
                    Game Over!
                  </h3>
                  <p className="text-xl mb-6 text-orange-600 dark:text-orange-400">
                    Final Score: {score}
                  </p>
                  <button
                    onClick={resetGame}
                    className="px-6 py-3 bg-orange-500 dark:bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-600 dark:hover:bg-orange-700 transition-colors duration-200"
                  >
                    Play Again
                  </button>
                </div>
              </div>
            )}

            {/* Start Game Overlay */}
            {!gameStarted && !gameOver && (
              <div className="absolute inset-0 bg-card/95 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center">
                  <h3 className="text-3xl font-bold text-orange-500 dark:text-orange-400 mb-4">
                    Snake Game
                  </h3>
                  <button
                    onClick={startGame}
                    className="px-6 py-3 bg-orange-500 dark:bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-600 dark:hover:bg-orange-700 transition-colors duration-200 animate-pulse"
                  >
                    Start Game
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>Arrow Keys / WASD to move • Press Enter to start/restart</p>
            {gameStarted && !gameOver && (
              <p className="mt-2 font-medium text-orange-500 dark:text-orange-400 animate-pulse">
                Game in progress...
              </p>
            )}
          </div>
        </div>

        {/* Stats and Queue Panels */}
        <div className="flex flex-col md:flex-row gap-4 w-full max-w-2xl">
          {/* Enhanced Stats Panel */}
          <div className="bg-card rounded-lg shadow-md p-3 flex-1">
            <h4 className="text-sm font-bold text-foreground mb-3">Game Stats</h4>

            <div className="space-y-2">
              {/* Score & Length */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Score:</span>
                <span className="font-bold text-orange-500 dark:text-orange-400">{score}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Length:</span>
                <span className="font-mono text-foreground">{snake.length}</span>
              </div>

              {/* Move Efficiency */}
              <div className="border-t pt-2">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Current Efficiency:</span>
                  <span
                    className={`font-bold ${currentEfficiency >= 80 ? 'text-green-600' : currentEfficiency >= 60 ? 'text-yellow-600' : 'text-red-600'}`}
                  >
                    {currentEfficiency}%
                  </span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Average Efficiency:</span>
                  <span
                    className={`font-bold ${averageEfficiency >= 80 ? 'text-green-600' : averageEfficiency >= 60 ? 'text-yellow-600' : 'text-red-600'}`}
                  >
                    {averageEfficiency}%
                  </span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Moves made:</span>
                  <span>{moveCount}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Optimal moves:</span>
                  <span>{storedOptimalMoves}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Food collected:</span>
                  <span>{totalFoodCollected}</span>
                </div>
              </div>

              {/* Path Info */}
              <div className="border-t pt-2">
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-muted-foreground">Training Path:</span>
                  <button
                    onClick={() => setShowTrainingPath(!showTrainingPath)}
                    className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                      showTrainingPath
                        ? 'bg-orange-500 text-white hover:bg-orange-600'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {showTrainingPath ? 'ON' : 'OFF'}
                  </button>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Current path:</span>
                  <span className="text-blue-600 dark:text-blue-400">
                    {shortestPath.length > 0 ? shortestPath.length - 1 : 0}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {shortestPath.length === 0
                    ? 'No path available'
                    : showTrainingPath
                      ? 'Orange dots show optimal route'
                      : 'Path hidden - toggle to show'}
                </div>
              </div>

              {/* Game Status */}
              <div className="border-t border-border pt-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span
                    className={
                      gameOver
                        ? 'text-red-600'
                        : gameStarted
                          ? 'text-green-600'
                          : 'text-gray-500'
                    }
                  >
                    {gameOver ? 'Game Over' : gameStarted ? 'Playing' : 'Ready'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Queue Action Panel */}
          <div className="bg-card rounded-lg shadow-md p-3 flex-1">
            <h4 className="text-sm font-bold text-foreground mb-3">
              Queue Action
            </h4>

            <div className="space-y-2">
              {/* Current Direction */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Current:</span>
                <span className="text-lg font-bold text-orange-500 dark:text-orange-400">
                  {getDirectionName(direction)}
                </span>
              </div>

              {/* Direction Queue */}
              <div className="border-t border-border pt-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Queue:</span>
                  <span className="text-muted-foreground">
                    {directionQueue.length}/2
                  </span>
                </div>
                <div className="min-h-[40px] space-y-1">
                  {directionQueue.length === 0 ? (
                    <div className="text-muted-foreground italic text-xs text-center py-2">
                      Empty
                    </div>
                  ) : (
                    directionQueue.map((dir, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded text-xs"
                      >
                        <span className="text-lg text-foreground">{getDirectionName(dir)}</span>
                        <span className="bg-blue-500 text-white px-1 rounded text-xs">
                          #{index + 1}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Action History */}
              <div className="border-t border-border pt-2">
                <h5 className="text-xs text-muted-foreground mb-1">
                  Action History (last 10):
                </h5>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {actionHistory
                    .slice(-10)
                    .reverse()
                    .map((action: ActionHistoryItem, index) => {
                      const getActionColor = (type: string) => {
                        switch (type) {
                          case 'applied_immediate':
                            return 'bg-green-500/10 text-green-700 dark:text-green-400';
                          case 'applied_queue':
                            return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
                          case 'queued':
                            return 'bg-orange-500/10 text-orange-700 dark:text-orange-400';
                          case 'cancelled':
                            return 'bg-red-500/10 text-red-700 dark:text-red-400';
                          case 'game_over':
                            return 'bg-red-500/10 text-red-700 dark:text-red-400';
                          default:
                            return 'bg-muted text-muted-foreground';
                        }
                      };

                      const getActionLabel = (
                        type: string,
                        reason?: string
                      ) => {
                        switch (type) {
                          case 'applied_immediate':
                            return 'Applied';
                          case 'applied_queue':
                            return 'Applied';
                          case 'queued':
                            return 'Queued';
                          case 'cancelled':
                            return reason === 'opposite'
                              ? 'Blocked'
                              : 'Ignored';
                          case 'game_over':
                            return reason === 'wall'
                              ? 'Hit Wall'
                              : 'Hit Self';
                          default:
                            return type;
                        }
                      };

                      return (
                        <div
                          key={actionHistory.length - index}
                          className="flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base text-foreground">
                              {getDirectionName(action.direction)}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${getActionColor(action.type)}`}
                            >
                              {getActionLabel(action.type, action.reason)}
                            </span>
                          </div>
                          <span className="text-muted-foreground text-xs">
                            {new Date(action.timestamp)
                              .toLocaleTimeString()
                              .split(' ')[0]
                              .split(':')
                              .slice(-2)
                              .join(':')}
                          </span>
                        </div>
                      );
                    })}
                  {actionHistory.length === 0 && (
                    <div className="text-muted-foreground italic text-xs text-center py-2">
                      No actions yet
                    </div>
                  )}
                </div>
              </div>

              {/* Compact Game State */}
              <div className="border-t border-border pt-2 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Length:</span>
                  <span className="font-mono text-foreground">{snake.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span
                    className={
                      gameOver
                        ? 'text-red-600'
                        : gameStarted
                          ? 'text-green-600'
                          : 'text-gray-500'
                    }
                  >
                    {gameOver ? 'Game Over' : gameStarted ? 'Playing' : 'Ready'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SnakeGameWithQueue;
