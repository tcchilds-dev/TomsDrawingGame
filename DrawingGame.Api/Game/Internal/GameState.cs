namespace DrawingGame.Api.Game;

public enum GamePhase
{
    // Pre-game
    Lobby,

    // Game loop
    WordChoice,
    Playing,

    // Post-game
    Results,
}

public class GameState
{
    public GamePhase Phase { get; set; } = GamePhase.Lobby;
    public int? CurrentRound { get; set; }

    public int CurrentArtistIndex { get; set; }
    public List<string> ArtistQueue { get; } = new();

    public string? CurrentWord { get; set; }
    public string? MaskedWord { get; set; }
    public List<string> WordChoices { get; } = new();

    public HashSet<string> CorrectAnswerPlayerIds { get; } = new();

    public DateTimeOffset? GameStartedAt { get; set; }
    public DateTimeOffset? PhaseEndsAt { get; set; }

    public List<Stroke> CompletedStrokes { get; } = new();
    public Stroke? ActiveStroke { get; set; }

    public Dictionary<string, int> Scores { get; } = new();
}
