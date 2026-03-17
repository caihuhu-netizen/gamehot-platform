import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";

export interface GameProject {
  id: number;
  gameCode: string;
  gameName: string;
  gameIcon: string | null;
  genre: string;
  platform: string;
  status: string;
}

interface GameContextValue {
  /** null = "全部游戏" mode */
  currentGameId: number | null;
  currentGame: GameProject | null;
  games: GameProject[];
  isLoading: boolean;
  setCurrentGameId: (id: number | null) => void;
  /** Whether the current view is in "all games" aggregate mode */
  isAllGamesMode: boolean;
}

const GameContext = createContext<GameContextValue | undefined>(undefined);

const STORAGE_KEY = "gamehot-current-game-id";

export function GameProvider({ children }: { children: ReactNode }) {
  const [currentGameId, setCurrentGameIdState] = useState<number | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null || stored === "null") return null;
    const parsed = parseInt(stored, 10);
    return isNaN(parsed) ? null : parsed;
  });

  const { data: games = [], isLoading } = trpc.gameProjects.list.useQuery();

  const currentGame = currentGameId
    ? (games as GameProject[]).find((g) => g.id === currentGameId) || null
    : null;

  function setCurrentGameId(id: number | null) {
    setCurrentGameIdState(id);
    localStorage.setItem(STORAGE_KEY, String(id));
  }

  // If the stored game no longer exists in the list, reset to "all"
  useEffect(() => {
    if (!isLoading && currentGameId !== null && games.length > 0) {
      const exists = (games as GameProject[]).some((g) => g.id === currentGameId);
      if (!exists) {
        setCurrentGameId(null);
      }
    }
  }, [isLoading, games, currentGameId]);

  return (
    <GameContext.Provider
      value={{
        currentGameId,
        currentGame,
        games: games as GameProject[],
        isLoading,
        setCurrentGameId,
        isAllGamesMode: currentGameId === null,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within a GameProvider");
  return ctx;
}
