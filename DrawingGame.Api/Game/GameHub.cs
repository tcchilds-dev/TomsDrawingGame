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

    public async Task LeaveRoom()
    {
        var update = _gameManager.RemoveDisconnectedPlayer(Context.ConnectionId);

        if (update is null)
        {
            throw new HubException("This connection is not in a room.");
        }

        await Groups.RemoveFromGroupAsync(Context.ConnectionId, update.RoomId);

        if (update?.State is not null)
        {
            await Clients.Group(update.RoomId).SyncGameState(update.State);
        }
    }

    public async Task StartGame()
    {
        GameStateDto state;
        try
        {
            state = _gameManager.StartGame(Context.ConnectionId);
        }
        catch (GameException exception)
        {
            throw new HubException(exception.Message);
        }

        await Clients.Group(state.RoomId).SyncGameState(state);
    }

    public string[] GetWordChoices()
    {
        try
        {
            return _gameManager.GetWordChoices(Context.ConnectionId);
        }
        catch (GameException exception)
        {
            throw new HubException(exception.Message);
        }
    }

    public async Task ChooseWord(string word)
    {
        GameStateDto state;
        try
        {
            state = _gameManager.ChooseWord(Context.ConnectionId, word);
        }
        catch (GameException exception)
        {
            throw new HubException(exception.Message);
        }

        await Clients.Group(state.RoomId).SyncGameState(state);
    }

    public string GetCurrentWord()
    {
        try
        {
            return _gameManager.GetCurrentWord(Context.ConnectionId);
        }
        catch (GameException exception)
        {
            throw new HubException(exception.Message);
        }
    }

    public override Task OnDisconnectedAsync(Exception? exception)
    {
        _disconnectCleanup.ScheduleRemoval(Context.ConnectionId);
        return base.OnDisconnectedAsync(exception);
    }
}
