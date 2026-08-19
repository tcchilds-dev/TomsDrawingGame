using DrawingGame.Api.Game;
using DrawingGame.Api.Game.Contracts;

public class GameRoom
{
    public string Id { get; }
    public string OwnerId { get; set; }
    public GameConfig Config { get; }

    public Dictionary<string, Player> Players { get; } = new();
    public List<ChatMessageDto> ChatHistory { get; } = new();

    public GameState State { get; } = new();

    public GameRoom(string ownerId, GameConfig? config = null)
    {
        Id = IdGenerator.GenerateId(7);
        OwnerId = ownerId;
        Config = config ?? new GameConfig();
    }
}
