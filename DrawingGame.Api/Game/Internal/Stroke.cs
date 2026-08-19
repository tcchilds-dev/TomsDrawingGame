namespace DrawingGame.Api.Game;

public sealed record Point(double X, double Y);

public sealed class Stroke
{
    public required string Colour { get; init; }
    public required int Width { get; init; }
    public List<Point> Points { get; } = new();
    public bool IsComplete { get; set; }
}
