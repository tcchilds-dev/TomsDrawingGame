namespace DrawingGame.Api.Game.Contracts.Dtos;

public sealed record CanvasStateDto(IReadOnlyList<Stroke> CompletedStrokes, Stroke? ActiveStroke);
