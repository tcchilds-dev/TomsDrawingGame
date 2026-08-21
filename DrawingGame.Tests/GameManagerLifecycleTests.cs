using DrawingGame.Api.Game;
using DrawingGame.Api.Game.Contracts.Dtos;

namespace DrawingGame.Tests;

public class GameManagerLifecycleTests
{
    [Fact]
    public void StartAndChooseWord_SetAuthoritativePhaseDeadlines()
    {
        var game = CreateGame(2);

        var choosing = game.Manager.StartGame(game.OwnerConnectionId);

        Assert.Equal(GamePhase.WordChoice, choosing.Phase);
        Assert.Equal(
            game.Clock.GetUtcNow().AddSeconds(choosing.Config.WordChoiceTimerSeconds),
            choosing.PhaseEndsAt
        );

        game.Clock.Advance(TimeSpan.FromSeconds(5));
        var artistConnectionId = GetConnectionId(game, choosing.CurrentArtistId);
        var word = game.Manager.GetWordChoices(artistConnectionId)[0];
        var playing = game.Manager.ChooseWord(artistConnectionId, word);

        Assert.Equal(GamePhase.Playing, playing.Phase);
        Assert.Equal(
            game.Clock.GetUtcNow().AddSeconds(playing.Config.DrawTimerSeconds),
            playing.PhaseEndsAt
        );
    }

    [Fact]
    public void ExpiredWordChoice_AutomaticallySelectsAWord()
    {
        var game = CreateGame(2);
        var choosing = game.Manager.StartGame(game.OwnerConnectionId);
        var artistConnectionId = GetConnectionId(game, choosing.CurrentArtistId);
        var choices = game.Manager.GetWordChoices(artistConnectionId);

        game.Clock.Advance(TimeSpan.FromSeconds(choosing.Config.WordChoiceTimerSeconds));
        var update = Assert.Single(game.Manager.AdvanceExpiredPhases());
        var playing = Assert.IsType<GameStateDto>(update.State);

        Assert.Equal(GamePhase.Playing, playing.Phase);
        Assert.Equal(choices[0], game.Manager.GetCurrentWord(artistConnectionId));
        Assert.Equal(MaskWord(choices[0]), playing.DisplayWord);
        Assert.Equal(
            game.Clock.GetUtcNow().AddSeconds(playing.Config.DrawTimerSeconds),
            playing.PhaseEndsAt
        );
    }

    [Fact]
    public void ExpiredTurn_RotatesArtistAndClearsCanvas()
    {
        var game = CreateGame(2);
        var choosing = game.Manager.StartGame(game.OwnerConnectionId);
        var firstArtistId = choosing.CurrentArtistId;
        var artistConnectionId = GetConnectionId(game, firstArtistId);
        var word = game.Manager.GetWordChoices(artistConnectionId)[0];
        var playing = game.Manager.ChooseWord(artistConnectionId, word);
        game.Manager.BeginStroke("#111827", 8, new Point(0.5, 0.5), artistConnectionId);

        game.Clock.Advance(TimeSpan.FromSeconds(playing.Config.DrawTimerSeconds));
        var update = Assert.Single(game.Manager.AdvanceExpiredPhases());
        var nextTurn = Assert.IsType<GameStateDto>(update.State);
        var canvas = Assert.IsType<CanvasStateDto>(update.CanvasState);

        Assert.Equal(GamePhase.WordChoice, nextTurn.Phase);
        Assert.Equal(1, nextTurn.CurrentRound);
        Assert.NotEqual(firstArtistId, nextTurn.CurrentArtistId);
        Assert.Empty(canvas.CompletedStrokes);
        Assert.Null(canvas.ActiveStroke);
    }

    [Fact]
    public void FinalExpiredTurn_BeginsResults()
    {
        var game = CreateGame(2);
        var state = game.Manager.StartGame(game.OwnerConnectionId);
        RoomUpdate? finalUpdate = null;

        var turnCount = state.Config.NumberOfRounds * state.Players.Count;
        for (var turn = 0; turn < turnCount; turn++)
        {
            game.Clock.Advance(TimeSpan.FromSeconds(state.Config.WordChoiceTimerSeconds));
            state = Assert.IsType<GameStateDto>(
                Assert.Single(game.Manager.AdvanceExpiredPhases()).State
            );

            game.Clock.Advance(TimeSpan.FromSeconds(state.Config.DrawTimerSeconds));
            finalUpdate = Assert.Single(game.Manager.AdvanceExpiredPhases());
            state = Assert.IsType<GameStateDto>(finalUpdate.State);
        }

        Assert.Equal(GamePhase.Results, state.Phase);
        Assert.Equal(state.Config.NumberOfRounds, state.CurrentRound);
        Assert.Null(state.CurrentArtistId);
        Assert.Null(state.PhaseEndsAt);
        Assert.Null(finalUpdate?.CanvasState);
    }

    [Fact]
    public void CorrectGuesses_AwardDescendingGuesserAndProportionalArtistPoints()
    {
        var game = CreateGame(4);
        var choosing = game.Manager.StartGame(game.OwnerConnectionId);
        var artistId = Assert.IsType<string>(choosing.CurrentArtistId);
        var artistConnectionId = GetConnectionId(game, artistId);
        var guessers = game.Players.Where(player => player.PlayerId != artistId).ToArray();
        var word = game.Manager.GetWordChoices(artistConnectionId)[0];
        game.Manager.ChooseWord(artistConnectionId, word);

        var firstUpdate = Assert.IsType<MessageUpdate>(
            game.Manager.ProcessMessage(guessers[0].ConnectionId, word)
        );
        var firstState = Assert.IsType<GameStateDto>(firstUpdate.StateUpdate?.State);

        Assert.Equal(100, GetScore(firstState, guessers[0].PlayerId));
        Assert.Equal(33, GetScore(firstState, artistId));
        Assert.Null(game.Manager.ProcessMessage(guessers[0].ConnectionId, word));

        var secondUpdate = Assert.IsType<MessageUpdate>(
            game.Manager.ProcessMessage(guessers[1].ConnectionId, word)
        );
        var secondState = Assert.IsType<GameStateDto>(secondUpdate.StateUpdate?.State);

        Assert.Equal(90, GetScore(secondState, guessers[1].PlayerId));
        Assert.Equal(66, GetScore(secondState, artistId));

        var thirdUpdate = Assert.IsType<MessageUpdate>(
            game.Manager.ProcessMessage(guessers[2].ConnectionId, word)
        );
        var thirdState = Assert.IsType<GameStateDto>(thirdUpdate.StateUpdate?.State);

        Assert.Equal(80, GetScore(thirdState, guessers[2].PlayerId));
        Assert.Equal(99, GetScore(thirdState, artistId));
        Assert.Equal(GamePhase.WordChoice, thirdState.Phase);
    }

    [Fact]
    public void EveryoneGuessingCorrectly_EndsTurnEarly()
    {
        var game = CreateGame(2);
        var choosing = game.Manager.StartGame(game.OwnerConnectionId);
        var artistConnectionId = GetConnectionId(game, choosing.CurrentArtistId);
        var guesserConnectionId = game.Players.Single(player =>
            player.ConnectionId != artistConnectionId
        ).ConnectionId;
        var word = game.Manager.GetWordChoices(artistConnectionId)[0];
        game.Manager.ChooseWord(artistConnectionId, word);

        var messageUpdate = Assert.IsType<MessageUpdate>(
            game.Manager.ProcessMessage(guesserConnectionId, word)
        );
        var stateUpdate = Assert.IsType<RoomUpdate>(messageUpdate.StateUpdate);
        var state = Assert.IsType<GameStateDto>(stateUpdate.State);
        var canvas = Assert.IsType<CanvasStateDto>(stateUpdate.CanvasState);

        Assert.Equal(GamePhase.WordChoice, state.Phase);
        Assert.NotEqual(choosing.CurrentArtistId, state.CurrentArtistId);
        Assert.Empty(canvas.CompletedStrokes);
        Assert.Null(canvas.ActiveStroke);
    }

    [Fact]
    public void ArtistLeaving_AdvancesToAnotherArtistAndClearsCanvas()
    {
        var game = CreateGame(3);
        var choosing = game.Manager.StartGame(game.OwnerConnectionId);
        var departedArtistId = choosing.CurrentArtistId;
        var artistConnectionId = GetConnectionId(game, departedArtistId);
        var word = game.Manager.GetWordChoices(artistConnectionId)[0];
        game.Manager.ChooseWord(artistConnectionId, word);
        game.Manager.BeginStroke("#111827", 8, new Point(0.5, 0.5), artistConnectionId);

        var update = Assert.IsType<RoomUpdate>(
            game.Manager.RemoveDisconnectedPlayer(artistConnectionId)
        );
        var state = Assert.IsType<GameStateDto>(update.State);
        var canvas = Assert.IsType<CanvasStateDto>(update.CanvasState);

        Assert.Equal(GamePhase.WordChoice, state.Phase);
        Assert.DoesNotContain(state.Players, player => player.Id == departedArtistId);
        Assert.NotNull(state.CurrentArtistId);
        Assert.NotEqual(departedArtistId, state.CurrentArtistId);
        Assert.Empty(canvas.CompletedStrokes);
        Assert.Null(canvas.ActiveStroke);
    }

    [Fact]
    public void GuesserLeaving_EndsTurnWhenEveryoneRemainingHasGuessed()
    {
        var game = CreateGame(3);
        var choosing = game.Manager.StartGame(game.OwnerConnectionId);
        var artistConnectionId = GetConnectionId(game, choosing.CurrentArtistId);
        var guessers = game.Players
            .Where(player => player.ConnectionId != artistConnectionId)
            .ToArray();
        var word = game.Manager.GetWordChoices(artistConnectionId)[0];
        game.Manager.ChooseWord(artistConnectionId, word);

        var correctGuess = Assert.IsType<MessageUpdate>(
            game.Manager.ProcessMessage(guessers[0].ConnectionId, word)
        );
        var scoreUpdate = Assert.IsType<RoomUpdate>(correctGuess.StateUpdate);
        Assert.Equal(GamePhase.Playing, scoreUpdate.State?.Phase);

        var departure = Assert.IsType<RoomUpdate>(
            game.Manager.RemoveDisconnectedPlayer(guessers[1].ConnectionId)
        );
        var state = Assert.IsType<GameStateDto>(departure.State);

        Assert.Equal(GamePhase.WordChoice, state.Phase);
        Assert.IsType<CanvasStateDto>(departure.CanvasState);
    }

    [Fact]
    public void FallingBelowTwoPlayers_ReturnsRoomToLobby()
    {
        var game = CreateGame(2);
        var choosing = game.Manager.StartGame(game.OwnerConnectionId);
        var artistConnectionId = GetConnectionId(game, choosing.CurrentArtistId);
        var word = game.Manager.GetWordChoices(artistConnectionId)[0];
        game.Manager.ChooseWord(artistConnectionId, word);
        var departingConnectionId = game.Players.Single(player =>
            player.ConnectionId != artistConnectionId
        ).ConnectionId;

        var update = Assert.IsType<RoomUpdate>(
            game.Manager.RemoveDisconnectedPlayer(departingConnectionId)
        );
        var state = Assert.IsType<GameStateDto>(update.State);
        var canvas = Assert.IsType<CanvasStateDto>(update.CanvasState);

        Assert.Equal(GamePhase.Lobby, state.Phase);
        Assert.Null(state.CurrentRound);
        Assert.Null(state.CurrentArtistId);
        Assert.Null(state.PhaseEndsAt);
        Assert.All(state.Players, player => Assert.Equal(0, player.Score));
        Assert.Empty(canvas.CompletedStrokes);
        Assert.Null(canvas.ActiveStroke);
    }

    [Fact]
    public void PlayAgain_ReturnsTheExistingRoomToLobby()
    {
        var game = CreateGame(2);
        game.Manager.ProcessMessage(game.OwnerConnectionId, "Good game!");
        var results = AdvanceToResults(game);
        var playerIds = results.Players.Select(player => player.Id).ToHashSet();

        var update = game.Manager.PlayAgain(game.OwnerConnectionId);
        var lobby = Assert.IsType<GameStateDto>(update.State);
        var canvas = Assert.IsType<CanvasStateDto>(update.CanvasState);

        Assert.Equal(GamePhase.Lobby, lobby.Phase);
        Assert.Null(lobby.CurrentRound);
        Assert.Null(lobby.CurrentArtistId);
        Assert.Null(lobby.DisplayWord);
        Assert.Null(lobby.PhaseEndsAt);
        Assert.True(playerIds.SetEquals(lobby.Players.Select(player => player.Id)));
        Assert.All(lobby.Players, player => Assert.Equal(0, player.Score));
        Assert.Contains(lobby.ChatHistory, message => message.Message == "Good game!");
        Assert.Empty(canvas.CompletedStrokes);
        Assert.Null(canvas.ActiveStroke);

        var restarted = game.Manager.StartGame(game.OwnerConnectionId);
        Assert.Equal(GamePhase.WordChoice, restarted.Phase);
    }

    [Fact]
    public void PlayAgain_RejectsNonOwnersAndGamesThatHaveNotFinished()
    {
        var activeGame = CreateGame(2);
        var activeException = Assert.Throws<GameException>(() =>
            activeGame.Manager.PlayAgain(activeGame.OwnerConnectionId)
        );

        Assert.Equal(
            "A rematch can only be requested from the results screen.",
            activeException.Message
        );

        var finishedGame = CreateGame(2);
        AdvanceToResults(finishedGame);
        var nonOwnerConnectionId = finishedGame.Players.Single(player =>
            player.ConnectionId != finishedGame.OwnerConnectionId
        ).ConnectionId;
        var ownerException = Assert.Throws<GameException>(() =>
            finishedGame.Manager.PlayAgain(nonOwnerConnectionId)
        );

        Assert.Equal("Only the owner may play again.", ownerException.Message);
    }

    private static TestGame CreateGame(int playerCount)
    {
        var clock = new ManualTimeProvider(
            new DateTimeOffset(2026, 8, 21, 12, 0, 0, TimeSpan.Zero)
        );
        var path = Path.Combine(AppContext.BaseDirectory, "test-word-list.txt");
        var manager = new GameManager(new WordList(path), clock);
        var owner = manager.CreateRoom("connection-1", "Player 1");
        var players = new List<TestPlayer>
        {
            new("connection-1", owner.Session.PlayerId),
        };

        for (var index = 2; index <= playerCount; index++)
        {
            var connectionId = $"connection-{index}";
            var entry = manager.JoinRoom(
                connectionId,
                $"Player {index}",
                owner.Session.RoomId
            );
            players.Add(new TestPlayer(connectionId, entry.Session.PlayerId));
        }

        return new TestGame(manager, clock, "connection-1", players);
    }

    private static GameStateDto AdvanceToResults(TestGame game)
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

    private static string GetConnectionId(TestGame game, string? playerId)
    {
        return game.Players.Single(player => player.PlayerId == playerId).ConnectionId;
    }

    private static int GetScore(GameStateDto state, string playerId)
    {
        return state.Players.Single(player => player.Id == playerId).Score;
    }

    private static string MaskWord(string word)
    {
        return string.Concat(word.Select(character => char.IsLetter(character) ? '_' : character));
    }

    private sealed record TestGame(
        GameManager Manager,
        ManualTimeProvider Clock,
        string OwnerConnectionId,
        IReadOnlyList<TestPlayer> Players
    );

    private sealed record TestPlayer(string ConnectionId, string PlayerId);

    private sealed class ManualTimeProvider(DateTimeOffset utcNow) : TimeProvider
    {
        private DateTimeOffset UtcNow { get; set; } = utcNow;

        public override DateTimeOffset GetUtcNow() => UtcNow;

        public void Advance(TimeSpan duration)
        {
            UtcNow += duration;
        }
    }
}
