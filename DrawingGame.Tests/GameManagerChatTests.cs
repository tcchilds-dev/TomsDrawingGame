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

        var (roomId, message) = manager.ProcessMessage("owner-connection", "  Hello everyone  ");

        Assert.Equal(entry.Session.RoomId, roomId);
        Assert.Equal(ChatMessageType.Chat, message?.MessageType);
        Assert.Equal("Hello everyone", message?.Message);
    }

    [Fact]
    public void ProcessMessage_RecordsAndConcealsCorrectGuess()
    {
        var game = StartPlayingGame();

        var (roomId, message) = game.Manager.ProcessMessage(
            game.GuesserConnectionId,
            $"  {game.Word.ToLowerInvariant()}  "
        );

        Assert.Equal(game.Guesser.Session.RoomId, roomId);
        Assert.Equal(ChatMessageType.CorrectGuess, message?.MessageType);
        Assert.Null(message?.Message);

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
        Assert.Equal((null, null), repeatedGuess);
    }

    [Fact]
    public void ProcessMessage_RejectsArtistDuringPlayingPhase()
    {
        var game = StartPlayingGame();

        var result = game.Manager.ProcessMessage(game.ArtistConnectionId, "A helpful hint");

        Assert.Equal((null, null), result);
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

        var state = manager.StartGame("owner-connection");
        var ownerIsArtist = state.CurrentArtistId == owner.Session.PlayerId;
        var artistConnectionId = ownerIsArtist ? "owner-connection" : "guesser-connection";
        var guesserConnectionId = ownerIsArtist ? "guesser-connection" : "owner-connection";
        var guessingPlayer = ownerIsArtist ? guesser : owner;
        var word = manager.GetWordChoices(artistConnectionId)[0];
        manager.ChooseWord(artistConnectionId, word);

        return new PlayingGame(
            manager,
            guessingPlayer,
            artistConnectionId,
            guesserConnectionId,
            word
        );
    }

    private static GameManager CreateManager()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "test-word-list.txt");
        return new GameManager(new WordList(path));
    }

    private sealed record PlayingGame(
        GameManager Manager,
        RoomEntryDto Guesser,
        string ArtistConnectionId,
        string GuesserConnectionId,
        string Word
    );
}
