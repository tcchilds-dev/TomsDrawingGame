using DrawingGame.Api.Game.Contracts;
using Microsoft.AspNetCore.SignalR;

namespace DrawingGame.Api.Game;

public class GameHub : Hub<IGameClient>
{
    private readonly GameManager _gameManager;

    public GameHub(GameManager gameManager)
    {
        _gameManager = gameManager;
    }

    public async Task CreateRoom(string username) { }

    public async Task JoinRoom(string username, string roomCode) { }
}
