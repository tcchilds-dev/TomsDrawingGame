namespace DrawingGame.Api.Game.Contracts;

public enum ChatMessageType
{
    Chat,
    CorrectGuess,
    System,
}

public sealed record ChatMessageDto(
    string? PlayerId,
    string? Username,
    string Message,
    DateTimeOffset TimeStamp,
    ChatMessageType MessageType
);
