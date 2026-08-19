using DrawingGame.Api.Game.Contracts.Dtos;

namespace DrawingGame.Api.Game.Contracts;

public interface IGameClient
{
    Task SyncGameState(GameStateDto state);
}
