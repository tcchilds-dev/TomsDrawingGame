namespace DrawingGame.Api.Game;

public sealed class GameConfig
{
    public int MaxPlayers { get; init; } = 6;
    public int WordSelectionSize { get; init; } = 3;
    public int WordChoiceTimerSeconds { get; init; } = 30;
    public int DrawTimerSeconds { get; init; } = 60;
    public int NumberOfRounds { get; init; } = 3;
}
