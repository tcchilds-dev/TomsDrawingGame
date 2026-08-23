namespace DrawingGame.Api.Game.Contracts.Dtos;

public sealed record ConfigUpdateDto(
    int WordSelectionSize,
    int WordChoiceTimerSeconds,
    int DrawTimerSeconds,
    int NumberOfRounds
);
