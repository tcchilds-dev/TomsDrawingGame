namespace DrawingGame.Api.Game;

public class Player
{
    public string Id { get; }
    public string ConnectionId { get; set; }
    public string UserName { get; }

    public Player(string connectionId, string username)
    {
        Id = IdGenerator.GenerateId(9);
        ConnectionId = connectionId;
        UserName = username;
    }
}
