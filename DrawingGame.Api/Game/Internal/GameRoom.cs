using System.Collections.Concurrent;
using DrawingGame.Api.Game;
using DrawingGame.Api.Game.Contracts;

namespace DrawingGame.Api.Game;

public class GameRoom
{
    public string Id { get; }
    public string OwnerId { get; set; }
    public GameConfig Config { get; }

    public object Lock { get; } = new();

    public ConcurrentDictionary<string, Player> Players { get; } = new();
    public List<ChatMessageDto> ChatHistory { get; } = new();

    public GameState State { get; } = new();

    public GameRoom(string ownerId, GameConfig? config = null)
    {
        Id = IdGenerator.GenerateId(7);
        OwnerId = ownerId;
        Config = config ?? new GameConfig();
    }
}
