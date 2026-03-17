import { Gamepad2, Globe } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { useGame } from "@/contexts/GameContext";
import { useIsMobile } from "@/hooks/useMobile";

export function GameSwitcher() {
  const { currentGameId, games, isLoading, setCurrentGameId, currentGame } = useGame();
  const isMobile = useIsMobile();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={currentGameId === null ? "all" : String(currentGameId)}
        onValueChange={(val) => setCurrentGameId(val === "all" ? null : parseInt(val, 10))}
      >
        <SelectTrigger className={`h-8 text-xs border-dashed ${isMobile ? 'w-[140px]' : 'w-[200px]'}`}>
          <div className="flex items-center gap-2 truncate">
            {currentGameId === null ? (
              <>
                <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span>全部游戏</span>
              </>
            ) : (
              <>
                {currentGame?.gameIcon ? (
                  <img src={currentGame.gameIcon} className="h-4 w-4 rounded shrink-0" alt="" />
                ) : (
                  <Gamepad2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
                <span className="truncate">{currentGame?.gameName || `游戏 #${currentGameId}`}</span>
              </>
            )}
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              <span>全部游戏（汇总视图）</span>
            </div>
          </SelectItem>
          {games.map((game) => (
            <SelectItem key={game.id} value={String(game.id)}>
              <div className="flex items-center gap-2">
                {game.gameIcon ? (
                  <img src={game.gameIcon} className="h-4 w-4 rounded" alt="" />
                ) : (
                  <Gamepad2 className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span>{game.gameName}</span>
                <span className="text-muted-foreground text-[10px] ml-1">{game.platform}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
