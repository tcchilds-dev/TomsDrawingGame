using DrawingGame.Api.Game.Contracts;
using DrawingGame.Api.Game.Contracts.Dtos;
using Microsoft.AspNetCore.SignalR;

namespace DrawingGame.Api.Game;

public class GameHub : Hub<IGameClient>
{
    private readonly DisconnectCleanup _disconnectCleanup;
    private readonly GameManager _gameManager;

    public GameHub(GameManager gameManager, DisconnectCleanup disconnectCleanup)
    {
        _gameManager = gameManager;
        _disconnectCleanup = disconnectCleanup;
    }

    public async Task<RoomEntryDto> CreateRoom(string username)
    {
        RoomEntryDto entry;
        try
        {
            entry = _gameManager.CreateRoom(Context.ConnectionId, username);
        }
        catch (GameException exception)
        {
            throw new HubException(exception.Message);
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, entry.Session.RoomId);
        return entry;
    }

    public async Task<RoomEntryDto> JoinRoom(string username, string roomCode)
    {
        RoomEntryDto entry;
        try
        {
            entry = _gameManager.JoinRoom(Context.ConnectionId, username, roomCode);
        }
        catch (GameException exception)
        {
            throw new HubException(exception.Message);
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, entry.Session.RoomId);
        await Clients.Group(entry.Session.RoomId).SyncGameState(entry.State);
        return entry;
    }

    public async Task<RoomEntryDto> RejoinRoom(RoomSessionDto session)
    {
        RoomEntryDto entry;
        try
        {
            entry = _gameManager.RejoinRoom(Context.ConnectionId, session);
        }
        catch (GameException exception)
        {
            throw new HubException(exception.Message);
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, entry.Session.RoomId);
        return entry;
    }

    public override Task OnDisconnectedAsync(Exception? exception)
    {
        _disconnectCleanup.ScheduleRemoval(Context.ConnectionId);
        return base.OnDisconnectedAsync(exception);
    }
}
