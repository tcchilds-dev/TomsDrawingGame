namespace DrawingGame.Api.Game;

public static class IdGenerator
{
    private const string _choices =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    // Rooms will have length 7 IDs, Players will have length 9.
    // There will be many more players than rooms, and player Ids won't be shown.
    public static string GenerateId(int length = 9)
    {
        // Cryptographic security is not necessary for our purposes.
        return Random.Shared.GetString(_choices, length);
    }
}
