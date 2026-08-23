using DrawingGame.Api.Game;
using DrawingGame.Api.Game.Contracts.Dtos;
using static DrawingGame.Tests.GameManagerTestHelper;

namespace DrawingGame.Tests;

public class GameManagerConfigTests
{
    [Theory]
    [InlineData(3, 10, 30, 1)]
    [InlineData(5, 30, 120, 10)]
    public void UpdateGameConfig_AcceptsAllowedBoundaryValues(
        int wordSelectionSize,
        int wordChoiceTimerSeconds,
        int drawTimerSeconds,
        int numberOfRounds
    )
    {
        var game = CreateGame(1);
        var config = new ConfigUpdateDto(
            wordSelectionSize,
            wordChoiceTimerSeconds,
            drawTimerSeconds,
            numberOfRounds
        );

        var state = game.Manager.UpdateGameConfig(game.OwnerConnectionId, config);

        Assert.Equal(wordSelectionSize, state.Config.WordSelectionSize);
        Assert.Equal(wordChoiceTimerSeconds, state.Config.WordChoiceTimerSeconds);
        Assert.Equal(drawTimerSeconds, state.Config.DrawTimerSeconds);
        Assert.Equal(numberOfRounds, state.Config.NumberOfRounds);
        Assert.Equal(6, state.Config.MaxPlayers);
    }

    [Theory]
    [InlineData(4, 20, 60, 3)]
    [InlineData(3, 9, 60, 3)]
    [InlineData(3, 31, 60, 3)]
    [InlineData(3, 20, 29, 3)]
    [InlineData(3, 20, 121, 3)]
    [InlineData(3, 20, 60, 0)]
    [InlineData(3, 20, 60, 11)]
    public void UpdateGameConfig_RejectsInvalidValuesWithoutChangingConfig(
        int wordSelectionSize,
        int wordChoiceTimerSeconds,
        int drawTimerSeconds,
        int numberOfRounds
    )
    {
        var game = CreateGame(1);
        var owner = Assert.Single(game.Players);
        var originalConfig = owner.Entry.State.Config;
        var config = new ConfigUpdateDto(
            wordSelectionSize,
            wordChoiceTimerSeconds,
            drawTimerSeconds,
            numberOfRounds
        );

        Assert.Throws<GameException>(() =>
            game.Manager.UpdateGameConfig(game.OwnerConnectionId, config)
        );

        var currentConfig = game
            .Manager.RejoinRoom(game.OwnerConnectionId, owner.Entry.Session)
            .State.Config;
        Assert.Equal(originalConfig, currentConfig);
    }

    [Fact]
    public void UpdateGameConfig_RequiresTheOwnerAndLobby()
    {
        var game = CreateGame(2);
        var config = new ConfigUpdateDto(5, 20, 90, 4);
        var nonOwner = game
            .Players.Single(player => player.ConnectionId != game.OwnerConnectionId);

        var nonOwnerException = Assert.Throws<GameException>(() =>
            game.Manager.UpdateGameConfig(nonOwner.ConnectionId, config)
        );
        Assert.Equal(
            "Only the owner of the room may update game settings.",
            nonOwnerException.Message
        );

        game.Manager.StartGame(game.OwnerConnectionId);
        var phaseException = Assert.Throws<GameException>(() =>
            game.Manager.UpdateGameConfig(game.OwnerConnectionId, config)
        );
        Assert.Equal("Game settings can only be updated in the Lobby.", phaseException.Message);
    }
}
