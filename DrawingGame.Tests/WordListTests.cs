using DrawingGame.Api.Game;

namespace DrawingGame.Tests;

public class WordListTests
{
    [Fact]
    public void GetChoices_ReturnsDistinctNonEmptyWords()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "test-word-list.txt");
        var wordList = new WordList(path);

        var result = wordList.GetChoices(5);

        Assert.Equal(5, result.Length);
        Assert.Equal(5, result.Distinct(StringComparer.OrdinalIgnoreCase).Count());
        Assert.DoesNotContain(result, string.IsNullOrWhiteSpace);
    }

    [Fact]
    public void Constructor_RejectsListsWithFewerThanThreeWords()
    {
        var path = Path.GetTempFileName();
        try
        {
            File.WriteAllLines(path, ["Apple", "Banana", "apple", ""]);
            Assert.Throws<InvalidOperationException>(() => new WordList(path));
        }
        finally
        {
            File.Delete(path);
        }
    }
}
