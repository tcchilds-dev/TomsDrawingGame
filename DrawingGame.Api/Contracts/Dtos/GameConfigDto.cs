using DrawingGame.Api.Game.Contracts;

namespace DrawingGame.Api.Game.Contracts.Dtos;

public sealed record GameConfigDto(
    int MaxPlayers,
    int WordSelectionSize,
    int WordChoiceTimerSeconds,
    int DrawTimerSeconds,
    int NumberOfRounds
);
