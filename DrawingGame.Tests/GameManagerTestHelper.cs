using DrawingGame.Api.Game;
using DrawingGame.Api.Game.Contracts.Dtos;

namespace DrawingGame.Tests;

internal static class GameManagerTestHelper
{
    public static GameManager CreateManager(TimeProvider? timeProvider = null)
    {
        return new GameManager(
            new WordList(GetWordListPath()),
            timeProvider ?? TimeProvider.System
        );
    }

    public static TestGame CreateGame(int playerCount)
    {
        var clock = new ManualTimeProvider(
            new DateTimeOffset(2026, 8, 21, 12, 0, 0, TimeSpan.Zero)
        );
        var manager = CreateManager(clock);
        var owner = manager.CreateRoom("connection-1", "Player 1");
        var players = new List<TestPlayer> { new("connection-1", owner) };

        for (var index = 2; index <= playerCount; index++)
        {
            var connectionId = $"connection-{index}";
            var entry = manager.JoinRoom(
                connectionId,
                $"Player {index}",
                owner.Session.RoomId
            );
            players.Add(new TestPlayer(connectionId, entry));
        }

        return new TestGame(manager, clock, players);
    }

    public static PlayingTestGame StartPlayingGame()
    {
        var manager = CreateManager();
        var owner = manager.CreateRoom("owner-connection", "Alice");
        var guesser = manager.JoinRoom("guesser-connection", "Bob", owner.Session.RoomId);
        var thirdPlayer = manager.JoinRoom("third-connection", "Carol", owner.Session.RoomId);
        var players = new[]
        {
            new TestPlayer("owner-connection", owner),
            new TestPlayer("guesser-connection", guesser),
            new TestPlayer("third-connection", thirdPlayer),
        };

        var state = manager.StartGame("owner-connection");
        var artist = players.Single(player => player.PlayerId == state.CurrentArtistId);
        var guessingPlayer = players.First(player => player.PlayerId != state.CurrentArtistId);
        var word = manager.GetWordChoices(artist.ConnectionId)[0];
        manager.ChooseWord(artist.ConnectionId, word);

        return new PlayingTestGame(
            manager,
            guessingPlayer.Entry,
            artist.ConnectionId,
            guessingPlayer.ConnectionId,
            word
        );
    }

    public static GameStateDto AdvanceToResults(TestGame game)
    {
        var state = game.Manager.StartGame(game.OwnerConnectionId);
        var turnCount = state.Config.NumberOfRounds * state.Players.Count;

        for (var turn = 0; turn < turnCount; turn++)
        {
            game.Clock.Advance(TimeSpan.FromSeconds(state.Config.WordChoiceTimerSeconds));
            state = Assert.IsType<GameStateDto>(
                Assert.Single(game.Manager.AdvanceExpiredPhases()).State
            );

            game.Clock.Advance(TimeSpan.FromSeconds(state.Config.DrawTimerSeconds));
            state = Assert.IsType<GameStateDto>(
                Assert.Single(game.Manager.AdvanceExpiredPhases()).State
            );
        }

        Assert.Equal(GamePhase.Results, state.Phase);
        return state;
    }

    public static string GetConnectionId(TestGame game, string? playerId)
    {
        return game.Players.Single(player => player.PlayerId == playerId).ConnectionId;
    }

    public static int GetScore(GameStateDto state, string playerId)
    {
        return state.Players.Single(player => player.Id == playerId).Score;
    }

    public static string GetWordListPath()
    {
        return Path.Combine(AppContext.BaseDirectory, "test-word-list.txt");
    }

    public static string MaskWord(string word)
    {
        return string.Concat(word.Select(character => char.IsLetter(character) ? '_' : character));
    }

    internal sealed record TestGame(
        GameManager Manager,
        ManualTimeProvider Clock,
        IReadOnlyList<TestPlayer> Players
    )
    {
        public string OwnerConnectionId => Players[0].ConnectionId;
    }

    internal sealed record TestPlayer(string ConnectionId, RoomEntryDto Entry)
    {
        public string PlayerId => Entry.Session.PlayerId;
    }

    internal sealed record PlayingTestGame(
        GameManager Manager,
        RoomEntryDto Guesser,
        string ArtistConnectionId,
        string GuesserConnectionId,
        string Word
    );

    internal sealed class ManualTimeProvider(DateTimeOffset utcNow) : TimeProvider
    {
        private DateTimeOffset UtcNow { get; set; } = utcNow;

        public override DateTimeOffset GetUtcNow() => UtcNow;

        public void Advance(TimeSpan duration)
        {
            UtcNow += duration;
        }
    }
}
