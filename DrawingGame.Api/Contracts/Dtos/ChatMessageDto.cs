using System.Text.Json.Serialization;

namespace DrawingGame.Api.Game.Contracts;

[JsonConverter(typeof(JsonStringEnumConverter<ChatMessageType>))]
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
