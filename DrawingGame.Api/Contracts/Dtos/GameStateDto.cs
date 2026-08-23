namespace DrawingGame.Api.Game.Contracts.Dtos;

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
