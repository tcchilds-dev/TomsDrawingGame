using DrawingGame.Api.Game;
using DrawingGame.Api.Game.Contracts;
using DrawingGame.Api.Game.Contracts.Dtos;

namespace DrawingGame.Tests;

public class GameManagerChatTests
{
    [Fact]
    public void ProcessMessage_AcceptsTrimmedChatOutsidePlayingPhase()
    {
        var manager = CreateManager();
        var entry = manager.CreateRoom("owner-connection", "Alice");

        var update = Assert.IsType<MessageUpdate>(
            manager.ProcessMessage("owner-connection", "  Hello everyone  ")
        );

        Assert.Equal(entry.Session.RoomId, update.RoomId);
        Assert.Equal(ChatMessageType.Chat, update.Message.MessageType);
        Assert.Equal("Hello everyone", update.Message.Message);
        Assert.Null(update.StateUpdate);
    }

    [Fact]
    public void ProcessMessage_RecordsAndConcealsCorrectGuess()
    {
        var game = StartPlayingGame();

        var update = Assert.IsType<MessageUpdate>(
            game.Manager.ProcessMessage(
                game.GuesserConnectionId,
                $"  {game.Word.ToLowerInvariant()}  "
            )
        );

        Assert.Equal(game.Guesser.Session.RoomId, update.RoomId);
        Assert.Equal(ChatMessageType.CorrectGuess, update.Message.MessageType);
        Assert.Null(update.Message.Message);
        Assert.NotNull(update.StateUpdate);

        var refreshedEntry = game.Manager.RejoinRoom(
            game.GuesserConnectionId,
            game.Guesser.Session
        );
        Assert.True(
            refreshedEntry.State.Players.Single(player =>
                player.Id == game.Guesser.Session.PlayerId
            ).HasCorrectlyGuessed
        );

        var repeatedGuess = game.Manager.ProcessMessage(game.GuesserConnectionId, game.Word);
        Assert.Null(repeatedGuess);
    }

    [Fact]
    public void ProcessMessage_RejectsArtistDuringPlayingPhase()
    {
        var game = StartPlayingGame();

        var result = game.Manager.ProcessMessage(game.ArtistConnectionId, "A helpful hint");

        Assert.Null(result);
    }

    [Fact]
    public void ProcessMessage_RejectsMessagesOverMaximumLength()
    {
        var manager = CreateManager();
        manager.CreateRoom("owner-connection", "Alice");

        var exception = Assert.Throws<GameException>(() =>
            manager.ProcessMessage("owner-connection", new string('a', 201))
        );

        Assert.Equal("Maximum allowed message size is 200 characters.", exception.Message);
    }

    private static PlayingGame StartPlayingGame()
    {
        var manager = CreateManager();
        var owner = manager.CreateRoom("owner-connection", "Alice");
        var guesser = manager.JoinRoom(
            "guesser-connection",
            "Bob",
            owner.Session.RoomId
        );
        var thirdPlayer = manager.JoinRoom(
            "third-connection",
            "Carol",
            owner.Session.RoomId
        );

        var state = manager.StartGame("owner-connection");
        var players = new[]
        {
            (ConnectionId: "owner-connection", Entry: owner),
            (ConnectionId: "guesser-connection", Entry: guesser),
            (ConnectionId: "third-connection", Entry: thirdPlayer),
        };
        var artist = players.Single(player =>
            player.Entry.Session.PlayerId == state.CurrentArtistId
        );
        var guessingPlayer = players.First(player =>
            player.Entry.Session.PlayerId != state.CurrentArtistId
        );
        var artistConnectionId = artist.ConnectionId;
        var guesserConnectionId = guessingPlayer.ConnectionId;
        var word = manager.GetWordChoices(artistConnectionId)[0];
        manager.ChooseWord(artistConnectionId, word);

        return new PlayingGame(
            manager,
            guessingPlayer.Entry,
            artistConnectionId,
            guesserConnectionId,
            word
        );
    }

    private static GameManager CreateManager()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "test-word-list.txt");
        return new GameManager(new WordList(path), TimeProvider.System);
    }

    private sealed record PlayingGame(
        GameManager Manager,
        RoomEntryDto Guesser,
        string ArtistConnectionId,
        string GuesserConnectionId,
        string Word
    );
}
