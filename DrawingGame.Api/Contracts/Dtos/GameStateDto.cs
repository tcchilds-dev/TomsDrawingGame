using DrawingGame.Api.Game.Contracts;

namespace DrawingGame.Api.Game.Contracts.Dtos;

public sealed record PlayerDto(
    string Id,
    string Username,
    int Score,
    bool IsOwner,
    bool IsArtist,
    bool HasCorrectlyGuessed
);

public sealed record GameConfigDto(
    int MaxPlayers,
    int WordSelectionSize,
    int WordChoiceTimerSeconds,
    int DrawTimerSeconds,
    int NumberOfRounds
);

public sealed record GameStateDto(
    string RoomId,
    string OwnerId,
    GameConfigDto Config,
    GamePhase Phase,
    int? CurrentRound,
    string? CurrentArtistId,
    string? DisplayWord,
    DateTimeOffset? PhaseEndsAt,
    IReadOnlyList<PlayerDto> Players,
    IReadOnlyList<ChatMessageDto> ChatHistory
);
