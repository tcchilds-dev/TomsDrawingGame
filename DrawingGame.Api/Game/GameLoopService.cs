using DrawingGame.Api.Game.Contracts;
using Microsoft.AspNetCore.SignalR;

namespace DrawingGame.Api.Game;

public sealed class GameLoopService : BackgroundService
{
    private readonly GameManager _gameManager;
    private readonly IHubContext<GameHub, IGameClient> _hubContext;
    private readonly ILogger<GameLoopService> _logger;

    public GameLoopService(
        GameManager gameManager,
        IHubContext<GameHub, IGameClient> hubContext,
        ILogger<GameLoopService> logger
    )
    {
        _gameManager = gameManager;
        _hubContext = hubContext;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMilliseconds(250));

        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                IReadOnlyList<RoomUpdate> updates;

                try
                {
                    updates = _gameManager.AdvanceExpiredPhases();
                }
                catch (Exception exception)
                {
                    _logger.LogError(exception, "Failed to advance expired game phases.");
                    continue;
                }

                foreach (var update in updates)
                {
                    try
                    {
                        if (update.State is not null)
                        {
                            await _hubContext
                                .Clients.Group(update.RoomId)
                                .SyncGameState(update.State);
                        }
                        if (update.CanvasState is not null)
                        {
                            await _hubContext
                                .Clients.Group(update.RoomId)
                                .SyncCanvas(update.CanvasState);
                        }
                    }
                    catch (Exception exception)
                    {
                        _logger.LogError(
                            exception,
                            "Failed to publish game transition for room {RoomId}.",
                            update.RoomId
                        );
                    }
                }
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
    }
}
