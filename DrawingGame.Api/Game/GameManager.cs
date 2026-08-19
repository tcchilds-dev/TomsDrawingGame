using System.Collections.Concurrent;
using DrawingGame.Api.Game.Contracts.Dtos;

namespace DrawingGame.Api.Game;

public sealed class GameException : Exception
{
    public GameException(string message)
        : base(message) { }
}

public class GameManager
{
    // <room.Id, room>
    private readonly ConcurrentDictionary<string, GameRoom> _rooms = new();

    // <player.Id, room.Id>
    private readonly ConcurrentDictionary<string, string> _members = new();
    private readonly WordList _wordList;

    public GameManager(WordList wordList)
    {
        _wordList = wordList;
    }

    public CreateRoomDto NewRoom(string connectionId, string username)
    {
        username = Validator.ValidateUsername(username);

        var player = new Player(connectionId, username);
        var room = new GameRoom(player.Id);
        room.Players.Add(player.Id, player);
        room.State.Scores[player.Id] = 0;

        _rooms.TryAdd(room.Id, room);
        _members.TryAdd(player.Id, room.Id);

        return new CreateRoomDto(room.Id, player.Id);
    }
}
