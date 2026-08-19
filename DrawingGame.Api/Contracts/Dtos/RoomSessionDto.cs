namespace DrawingGame.Api.Game.Contracts.Dtos;

public sealed record RoomSessionDto(string RoomId, string PlayerId);

public sealed record RoomEntryDto(RoomSessionDto Session, GameStateDto State);
