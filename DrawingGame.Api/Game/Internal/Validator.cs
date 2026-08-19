namespace DrawingGame.Api.Game;

public static class Validator
{
    public static string ValidateUsername(string username)
    {
        username = username?.Trim() ?? string.Empty;
        if (username.Length is < 1 or > 20)
        {
            throw new GameException("Names must contain between 1 and 20 characters.");
        }
        return username;
    }
}
