import { Globe } from "lucide-react";

interface Game {
  id: number;
  gameName: string;
  gameIcon?: string | null;
  platform?: string;
  genre?: string;
}

interface GameBannerProps {
  isAllGamesMode: boolean;
  currentGame: Game | null | undefined;
  games: Game[];
}

export function GameBanner({ isAllGamesMode, currentGame, games }: GameBannerProps) {
  if (isAllGamesMode && games.length > 1) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50/50 px-4 py-2.5">
        <Globe className="h-5 w-5 text-blue-600 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-900">全部游戏汇总视图</p>
          <p className="text-xs text-blue-600">当前展示 {games.length} 款游戏的汇总数据。切换到单个游戏可查看独立数据。</p>
        </div>
        <div className="flex -space-x-1">
          {games.slice(0, 5).map((g) => (
            g.gameIcon ? (
              <img key={g.id} src={g.gameIcon} className="h-6 w-6 rounded-full border-2 border-white" alt={g.gameName} />
            ) : (
              <div key={g.id} className="h-6 w-6 rounded-full border-2 border-white bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                {g.gameName.charAt(0)}
              </div>
            )
          ))}
          {games.length > 5 && (
            <div className="h-6 w-6 rounded-full border-2 border-white bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground">
              +{games.length - 5}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!isAllGamesMode && currentGame) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 px-4 py-2.5">
        {currentGame.gameIcon ? (
          <img src={currentGame.gameIcon} className="h-8 w-8 rounded-lg" alt={currentGame.gameName} />
        ) : (
          <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
            {currentGame.gameName.charAt(0)}
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-emerald-900">{currentGame.gameName}</p>
          <p className="text-xs text-emerald-600">{currentGame.platform} · {currentGame.genre}</p>
        </div>
      </div>
    );
  }

  return null;
}
