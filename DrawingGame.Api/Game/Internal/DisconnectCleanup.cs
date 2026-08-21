using DrawingGame.Api.Game.Contracts;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Options;

namespace DrawingGame.Api.Game;

public sealed class DisconnectCleanup
{
    private readonly IHostApplicationLifetime _applicationLifetime;
    private readonly TimeSpan _gracePeriod;
    private readonly GameManager _gameManager;
    private readonly IHubContext<GameHub, IGameClient> _hubContext;
    private readonly ILogger<DisconnectCleanup> _logger;

    public DisconnectCleanup(
        GameManager gameManager,
        IHubContext<GameHub, IGameClient> hubContext,
        IHostApplicationLifetime applicationLifetime,
        ILogger<DisconnectCleanup> logger,
        IOptions<RoomConnectionOptions> options
    )
    {
        _gameManager = gameManager;
        _hubContext = hubContext;
        _applicationLifetime = applicationLifetime;
        _logger = logger;
        _gracePeriod = options.Value.DisconnectedPlayerGracePeriod;

        if (_gracePeriod < TimeSpan.Zero)
        {
            throw new InvalidOperationException(
                "The disconnected-player grace period cannot be negative."
            );
        }
    }

    public void ScheduleRemoval(string connectionId)
    {
        _ = RemoveAfterGracePeriodAsync(connectionId);
    }

    private async Task RemoveAfterGracePeriodAsync(string connectionId)
    {
        try
        {
            await Task.Delay(_gracePeriod, _applicationLifetime.ApplicationStopping);

            var update = _gameManager.RemoveDisconnectedPlayer(connectionId);
            if (update?.State is not null)
            {
                await _hubContext.Clients.Group(update.RoomId).SyncGameState(update.State);
            }
            if (update?.CanvasState is not null)
            {
                await _hubContext.Clients.Group(update.RoomId).SyncCanvas(update.CanvasState);
            }
        }
        catch (OperationCanceledException)
            when (_applicationLifetime.ApplicationStopping.IsCancellationRequested) { }
        catch (Exception e)
        {
            _logger.LogError(
                e,
                "Failed to remove disconnected SignalR connection {ConnectionId}.",
                connectionId
            );
        }
    }
}

public sealed class RoomConnectionOptions
{
    public TimeSpan DisconnectedPlayerGracePeriod { get; set; } = TimeSpan.FromSeconds(60);
}
