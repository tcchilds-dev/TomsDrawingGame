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

    public CanvasStateDto GetCanvasState()
    {
        return _gameManager.GetCanvasState(Context.ConnectionId);
    }

    public async Task BeginStroke(string colour, int width, Point firstPoint)
    {
        var result = _gameManager.BeginStroke(colour, width, firstPoint, Context.ConnectionId);

        if (result is null)
        {
            return;
        }

        if (result.PreviousStrokeCompleted)
        {
            await Clients.OthersInGroup(result.RoomId).StrokeEnded();
        }

        await Clients.OthersInGroup(result.RoomId).StrokeStarted(result.Stroke);
    }

    public async Task AddStrokePoints(Point[] points)
    {
        var roomId = _gameManager.AddStrokePoints(points, Context.ConnectionId);

        if (roomId is null)
        {
            return;
        }

        await Clients.OthersInGroup(roomId).StrokePointsAdded(points);
    }

    public async Task EndStroke()
    {
        var roomId = _gameManager.EndStroke(Context.ConnectionId);

        if (roomId is null)
        {
            return;
        }

        await Clients.OthersInGroup(roomId).StrokeEnded();
    }

    public async Task UndoStroke()
    {
        var (roomId, state) = _gameManager.UndoStroke(Context.ConnectionId);

        if (roomId is null || state is null)
        {
            return;
        }

        await Clients.Group(roomId).SyncCanvas(state);
    }

    public async Task ClearCanvas()
    {
        var (roomId, state) = _gameManager.ClearCanvas(Context.ConnectionId);

        if (roomId is null || state is null)
        {
            return;
        }

        await Clients.Group(roomId).SyncCanvas(state);
    }

    public async Task LeaveRoom()
    {
        var update = _gameManager.RemoveDisconnectedPlayer(Context.ConnectionId);

        if (update is null)
        {
            throw new HubException("This connection is not in a room.");
        }

        await Groups.RemoveFromGroupAsync(Context.ConnectionId, update.RoomId);
        await PublishRoomUpdate(update);
    }

    public async Task UpdateGameConfig(ConfigUpdateDto config)
    {
        GameStateDto state;
        try
        {
            state = _gameManager.UpdateGameConfig(Context.ConnectionId, config);
        }
        catch (GameException exception)
        {
            throw new HubException(exception.Message);
        }

        await Clients.Group(state.RoomId).SyncGameState(state);
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

    public async Task SendMessage(string message)
    {
        var update = _gameManager.ProcessMessage(Context.ConnectionId, message);

        if (update is null)
        {
            return;
        }

        await Clients.Group(update.RoomId).MessageReceived(update.Message);

        if (update.StateUpdate is not null)
        {
            await PublishRoomUpdate(update.StateUpdate);
        }
    }

    public async Task PlayAgain()
    {
        RoomUpdate update;
        try
        {
            update = _gameManager.PlayAgain(Context.ConnectionId);
        }
        catch (GameException exception)
        {
            throw new HubException(exception.Message);
        }

        await PublishRoomUpdate(update);
    }

    private async Task PublishRoomUpdate(RoomUpdate update)
    {
        if (update.State is not null)
        {
            await Clients.Group(update.RoomId).SyncGameState(update.State);
        }

        if (update.CanvasState is not null)
        {
            await Clients.Group(update.RoomId).SyncCanvas(update.CanvasState);
        }
    }

    public override Task OnDisconnectedAsync(Exception? exception)
    {
        _disconnectCleanup.ScheduleRemoval(Context.ConnectionId);
        return base.OnDisconnectedAsync(exception);
    }
}
