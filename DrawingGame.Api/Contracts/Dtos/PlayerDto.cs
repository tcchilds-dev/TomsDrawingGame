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
