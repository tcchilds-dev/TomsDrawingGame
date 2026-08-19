namespace DrawingGame.Api.Game;

public class WordList
{
    private readonly string[] _words;

    public WordList(string wordListPath)
    {
        if (!File.Exists(wordListPath))
        {
            throw new FileNotFoundException("The word list could not be found.", wordListPath);
        }

        _words = File.ReadLines(wordListPath)
            .Select(word => word.Trim())
            .Where(word => word.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (_words.Length < 3)
        {
            throw new InvalidOperationException("The word list must contain at least three words.");
        }
    }

    public string[] GetChoices(int amount)
    {
        if (amount <= 0)
        {
            throw new ArgumentOutOfRangeException("Amount must be greater than 0.");
        }
        if (amount > _words.Length)
        {
            throw new InvalidOperationException("The word list does not contain enough words.");
        }

        var deck = _words.ToArray();
        Random.Shared.Shuffle(deck);
        return deck[..amount];
    }
}
