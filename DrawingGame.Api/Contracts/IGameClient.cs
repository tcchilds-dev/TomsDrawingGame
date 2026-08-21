using DrawingGame.Api.Game.Contracts.Dtos;

namespace DrawingGame.Api.Game.Contracts;

public interface IGameClient
{
    Task SyncGameState(GameStateDto state);
    Task StrokeStarted(Stroke stroke);
    Task StrokePointsAdded(Point[] points);
    Task StrokeEnded();
    Task SyncCanvas(CanvasStateDto state);
    Task MessageReceived(ChatMessageDto message);
}
