using System.Collections.Concurrent;
using DrawingGame.Api.Game.Contracts;
using DrawingGame.Api.Game.Contracts.Dtos;

namespace DrawingGame.Api.Game;

public sealed class GameException : Exception
{
    public GameException(string message)
        : base(message) { }
}

public class GameManager
{
    private sealed record RoomMember(string RoomId, string PlayerId);

    private readonly string[] _allowedColours =
    [
        "#111827",
        "#7a7d82",
        "#ee1a13",
        "#ff7000",
        "#ffe300",
        "#00cb00",
        "#00ff90",
        "#00b1ff",
        "#2824d2",
        "#a200b9",
        "#e8469a",
        "#9f5331",
        "#ffffff",
        "#c0c0c0",
        "#b51b16",
        "#ff9b4f",
        "#f5e782",
        "#a5fca4",
        "#a6ffd8",
        "#9ee2ff",
        "#3f3bff",
        "#9705ff",
        "#fc8bd9",
        "#ffab8d",
    ];

    // <room.Id, room>
    private readonly ConcurrentDictionary<string, GameRoom> _rooms = new(StringComparer.Ordinal);

    // <connection.Id, room member>
    private readonly ConcurrentDictionary<string, RoomMember> _members = new();
    private readonly WordList _wordList;
    private readonly TimeProvider _timeProvider;

    public GameManager(WordList wordList, TimeProvider timeProvider)
    {
        _wordList = wordList;
        _timeProvider = timeProvider;
    }

    public RoomEntryDto CreateRoom(string connectionId, string username)
    {
        username = Validator.ValidateUsername(username);
        EnsureConnectionIsAvailable(connectionId);

        var player = new Player(connectionId, username);
        var room = new GameRoom(player.Id);
        room.Players[player.Id] = player;
        room.State.Scores[player.Id] = 0;

        var member = new RoomMember(room.Id, player.Id);
        if (!_members.TryAdd(connectionId, member))
        {
            throw new GameException("This connection is already in a room.");
        }

        if (!_rooms.TryAdd(room.Id, room))
        {
            _members.TryRemove(connectionId, out _);
            throw new GameException(
                "You were incredibly lucky and generated a duplicate room code. Please try again."
            );
        }

        lock (room.Lock)
        {
            return CreateEntry(room, player);
        }
    }

    public RoomEntryDto JoinRoom(string connectionId, string username, string roomCode)
    {
        username = Validator.ValidateUsername(username);
        roomCode = Validator.ValidateRoomCode(roomCode);
        EnsureConnectionIsAvailable(connectionId);

        if (!_rooms.TryGetValue(roomCode, out var room))
        {
            throw new GameException("Room not found.");
        }

        lock (room.Lock)
        {
            if (
                !_rooms.TryGetValue(roomCode, out var currentRoom)
                || !ReferenceEquals(currentRoom, room)
            )
            {
                throw new GameException("Room not found.");
            }

            if (room.State.Phase != GamePhase.Lobby)
            {
                throw new GameException("The game has already started.");
            }

            if (room.Players.Count >= room.Config.MaxPlayers)
            {
                throw new GameException("Room is full.");
            }

            var player = new Player(connectionId, username);
            if (!room.Players.TryAdd(player.Id, player))
            {
                throw new GameException(
                    "You were unbelievably lucky and generated a duplicate player ID! Please try again."
                );
            }

            var member = new RoomMember(room.Id, player.Id);
            if (!_members.TryAdd(connectionId, member))
            {
                room.Players.TryRemove(player.Id, out _);
                throw new GameException("This connection is already in a room.");
            }

            room.State.Scores[player.Id] = 0;

            return CreateEntry(room, player);
        }
    }

    public RoomEntryDto RejoinRoom(string connectionId, RoomSessionDto? session)
    {
        if (
            session is null
            || string.IsNullOrWhiteSpace(session.RoomId)
            || string.IsNullOrWhiteSpace(session.PlayerId)
            || !_rooms.TryGetValue(session.RoomId, out var room)
        )
        {
            throw new GameException("Room session is no longer valid.");
        }

        lock (room.Lock)
        {
            if (
                !_rooms.TryGetValue(session.RoomId, out var currentRoom)
                || !ReferenceEquals(currentRoom, room)
                || !room.Players.TryGetValue(session.PlayerId, out var player)
            )
            {
                throw new GameException("Room session is no longer valid.");
            }

            var member = new RoomMember(room.Id, player.Id);

            if (player.ConnectionId != connectionId)
            {
                var oldConnectionId = player.ConnectionId;

                if (!_members.TryAdd(connectionId, member))
                {
                    throw new GameException("This connection is already in a room.");
                }

                player.ConnectionId = connectionId;
                _members.TryRemove(oldConnectionId, out _);
            }

            return CreateEntry(room, player);
        }
    }

    public GameStateDto StartGame(string connectionId)
    {
        var (room, player) = GetRoomMembership(connectionId);

        lock (room.Lock)
        {
            if (room.OwnerId != player.Id)
            {
                throw new GameException("Only the owner may start the game.");
            }

            if (room.State.Phase != GamePhase.Lobby)
            {
                throw new GameException("The game can only be started from the lobby.");
            }

            if (room.Players.Count < 2)
            {
                throw new GameException("At least two players are required to start the game.");
            }

            var playerIds = room.Players.Keys.ToArray();
            Random.Shared.Shuffle(playerIds);
            room.State.ArtistQueue.Clear();
            room.State.ArtistQueue.AddRange(playerIds);
            room.State.CurrentRound = 1;
            room.State.CurrentArtistIndex = 0;

            var now = _timeProvider.GetUtcNow();
            room.State.GameStartedAt = now;
            BeginWordChoice(room, now);

            return CreateState(room);
        }
    }

    public string[] GetWordChoices(string connectionId)
    {
        var (room, player) = GetRoomMembership(connectionId);

        lock (room.Lock)
        {
            if (room.State.Phase != GamePhase.WordChoice)
            {
                throw new GameException(
                    "Word choices are only available during word choice phase."
                );
            }

            var artistId = GetCurrentArtistId(room);

            if (artistId is null)
            {
                throw new InvalidOperationException("The artist is not set.");
            }

            if (player.Id != artistId)
            {
                throw new GameException("Only the current artist can view the word choices.");
            }

            return room.State.WordChoices.ToArray();
        }
    }

    public GameStateDto ChooseWord(string connectionId, string requestedWord)
    {
        var (room, player) = GetRoomMembership(connectionId);

        lock (room.Lock)
        {
            if (room.State.Phase != GamePhase.WordChoice)
            {
                throw new GameException("A word can only be chosen during the word choice phase.");
            }

            var artistId = GetCurrentArtistId(room);

            if (artistId is null)
            {
                throw new InvalidOperationException("The artist is not set.");
            }

            if (player.Id != artistId)
            {
                throw new GameException("Only the current artist can choose the word.");
            }

            var selectedWord = room.State.WordChoices.FirstOrDefault(word =>
                string.Equals(word, requestedWord, StringComparison.Ordinal)
            );

            if (selectedWord is null)
            {
                throw new GameException("The selected word was not one of the offered choices.");
            }

            BeginPlaying(room, selectedWord, _timeProvider.GetUtcNow());

            return CreateState(room);
        }
    }

    public string GetCurrentWord(string connectionId)
    {
        var (room, player) = GetRoomMembership(connectionId);

        lock (room.Lock)
        {
            if (room.State.Phase != GamePhase.Playing)
            {
                throw new GameException("The word is only available while drawing.");
            }

            var artistId = GetCurrentArtistId(room);

            if (artistId is null)
            {
                throw new InvalidOperationException("The artist is not set.");
            }

            if (player.Id != artistId)
            {
                throw new GameException("Only the current artist may view the chosen word.");
            }

            return room.State.CurrentWord
                ?? throw new InvalidOperationException("No current word is set.");
        }
    }

    public CanvasStateDto GetCanvasState(string connectionId)
    {
        var (room, player) = GetRoomMembership(connectionId);

        lock (room.Lock)
        {
            return CreateCanvasState(room);
        }
    }

    public sealed record StrokeStartResult(
        string RoomId,
        Stroke Stroke,
        bool PreviousStrokeCompleted
    );

    public StrokeStartResult? BeginStroke(
        string colour,
        int width,
        Point firstPoint,
        string connectionId
    )
    {
        var (room, player) = GetRoomMembership(connectionId);

        if (
            width is < 1 or > 20
            || !_allowedColours.Contains<string>(colour)
            || !IsValidPoint(firstPoint)
        )
        {
            return null;
        }

        lock (room.Lock)
        {
            if (player.Id != GetCurrentArtistId(room) || room.State.Phase != GamePhase.Playing)
            {
                return null;
            }

            var previousStrokeCompleted = false;

            if (room.State.ActiveStroke is { } previousStroke)
            {
                room.State.CompletedStrokes.Add(previousStroke);
                room.State.ActiveStroke = null;
                previousStrokeCompleted = true;
            }

            var stroke = new Stroke { Colour = colour, Width = width };
            stroke.Points.Add(firstPoint);
            room.State.ActiveStroke = stroke;

            return new StrokeStartResult(room.Id, CloneStroke(stroke), previousStrokeCompleted);
        }
    }

    public string? AddStrokePoints(Point[] points, string connectionId)
    {
        if (points.Length == 0 || points.Length > 1000)
        {
            return null;
        }

        foreach (var point in points)
        {
            if (!IsValidPoint(point))
            {
                return null;
            }
        }

        var (room, player) = GetRoomMembership(connectionId);

        lock (room.Lock)
        {
            if (
                player.Id != GetCurrentArtistId(room)
                || room.State.Phase != GamePhase.Playing
                || room.State.ActiveStroke is null
            )
            {
                return null;
            }

            room.State.ActiveStroke.Points.AddRange(points);
            return room.Id;
        }
    }

    public string? EndStroke(string connectionId)
    {
        var (room, player) = GetRoomMembership(connectionId);

        lock (room.Lock)
        {
            if (
                player.Id != GetCurrentArtistId(room)
                || room.State.Phase != GamePhase.Playing
                || room.State.ActiveStroke is null
            )
            {
                return null;
            }

            room.State.CompletedStrokes.Add(room.State.ActiveStroke);
            room.State.ActiveStroke = null;
            return room.Id;
        }
    }

    public (string?, CanvasStateDto?) UndoStroke(string connectionId)
    {
        var (room, player) = GetRoomMembership(connectionId);

        lock (room.Lock)
        {
            if (
                player.Id != GetCurrentArtistId(room)
                || room.State.Phase != GamePhase.Playing
                || room.State.CompletedStrokes.Count < 1
            )
            {
                return (null, null);
            }

            room.State.CompletedStrokes.RemoveAt(room.State.CompletedStrokes.Count - 1);
            return (room.Id, CreateCanvasState(room));
        }
    }

    public (string?, CanvasStateDto?) ClearCanvas(string connectionId)
    {
        var (room, player) = GetRoomMembership(connectionId);

        lock (room.Lock)
        {
            if (player.Id != GetCurrentArtistId(room) || room.State.Phase != GamePhase.Playing)
            {
                return (null, null);
            }

            room.State.ActiveStroke = null;
            room.State.CompletedStrokes.Clear();
            return (room.Id, CreateCanvasState(room));
        }
    }

    public MessageUpdate? ProcessMessage(string connectionId, string message)
    {
        var trimmedMessage = message.Trim();

        if (trimmedMessage.Length is < 1)
        {
            return null;
        }
        else if (trimmedMessage.Length is > 200)
        {
            throw new GameException("Maximum allowed message size is 200 characters.");
        }

        var (room, player) = GetRoomMembership(connectionId);

        lock (room.Lock)
        {
            if (player.Id == GetCurrentArtistId(room) && room.State.Phase == GamePhase.Playing)
            {
                return null;
            }

            if (
                room.State.CorrectAnswerPlayerIds.Contains(player.Id)
                && room.State.Phase == GamePhase.Playing
            )
            {
                return null;
            }

            if (IsCorrectGuess(trimmedMessage, room))
            {
                AwardPoints(room, player.Id);

                var processedMessage = new ChatMessageDto(
                    player.Id,
                    player.UserName,
                    null,
                    _timeProvider.GetUtcNow(),
                    ChatMessageType.CorrectGuess
                );

                room.ChatHistory.Add(processedMessage);
                room.State.CorrectAnswerPlayerIds.Add(player.Id);

                CanvasStateDto? canvasState = null;

                if (EveryoneHasGuessed(room))
                {
                    var canvasWasCleared = FinishTurn(room, _timeProvider.GetUtcNow());
                    canvasState = canvasWasCleared ? CreateCanvasState(room) : null;
                }

                var stateUpdate = new RoomUpdate(room.Id, CreateState(room), canvasState);
                return new MessageUpdate(room.Id, processedMessage, stateUpdate);
            }
            else
            {
                var processedMessage = new ChatMessageDto(
                    player.Id,
                    player.UserName,
                    trimmedMessage,
                    _timeProvider.GetUtcNow(),
                    ChatMessageType.Chat
                );

                room.ChatHistory.Add(processedMessage);

                return new MessageUpdate(room.Id, processedMessage);
            }
        }
    }

    public RoomUpdate PlayAgain(string connectionId)
    {
        var (room, player) = GetRoomMembership(connectionId);

        lock (room.Lock)
        {
            if (room.OwnerId != player.Id)
            {
                throw new GameException("Only the owner may play again.");
            }

            if (room.State.Phase != GamePhase.Results)
            {
                throw new GameException("A rematch can only be requested from the results screen.");
            }

            ResetToLobby(room);

            return new RoomUpdate(room.Id, CreateState(room), CreateCanvasState(room));
        }
    }

    private static bool IsCorrectGuess(string message, GameRoom room)
    {
        if (room.State.CurrentWord is null || room.State.Phase != GamePhase.Playing)
        {
            return false;
        }
        return string.Equals(message, room.State.CurrentWord, StringComparison.OrdinalIgnoreCase);
    }

    public RoomUpdate? RemoveDisconnectedPlayer(string connectionId)
    {
        if (
            !_members.TryGetValue(connectionId, out var member)
            || !_rooms.TryGetValue(member.RoomId, out var room)
        )
        {
            return null;
        }

        lock (room.Lock)
        {
            if (
                !_rooms.TryGetValue(member.RoomId, out var currentRoom)
                || !ReferenceEquals(currentRoom, room)
                || !_members.TryGetValue(connectionId, out var currentMember)
                || currentMember != member
                || !room.Players.TryGetValue(member.PlayerId, out var player)
                || player.ConnectionId != connectionId
            )
            {
                return null;
            }

            var state = room.State;
            var removedArtistIndex = state.ArtistQueue.IndexOf(player.Id);
            var wasCurrentArtist = player.Id == GetCurrentArtistId(room);

            _members.TryRemove(connectionId, out _);
            room.Players.TryRemove(player.Id, out _);
            state.Scores.Remove(player.Id);
            state.CorrectAnswerPlayerIds.Remove(player.Id);

            if (removedArtistIndex >= 0)
            {
                state.ArtistQueue.RemoveAt(removedArtistIndex);

                if (removedArtistIndex < state.CurrentArtistIndex)
                {
                    state.CurrentArtistIndex--;
                }
            }

            if (room.Players.Count == 0)
            {
                _rooms.TryRemove(room.Id, out _);
                return new RoomUpdate(room.Id, null);
            }

            if (room.OwnerId == player.Id)
            {
                room.OwnerId = room.Players.Keys.First();
            }

            var canvasWasCleared = false;

            if (room.Players.Count < 2 && state.Phase != GamePhase.Lobby)
            {
                ResetToLobby(room);
                canvasWasCleared = true;
            }
            else if (state.Phase is GamePhase.WordChoice or GamePhase.Playing)
            {
                if (wasCurrentArtist)
                {
                    canvasWasCleared = ContinueAfterArtistRemoval(room, _timeProvider.GetUtcNow());
                }
                else if (state.Phase == GamePhase.Playing && EveryoneHasGuessed(room))
                {
                    canvasWasCleared = FinishTurn(room, _timeProvider.GetUtcNow());
                }
            }

            return new RoomUpdate(
                room.Id,
                CreateState(room),
                canvasWasCleared ? CreateCanvasState(room) : null
            );
        }
    }

    public IReadOnlyList<RoomUpdate> AdvanceExpiredPhases()
    {
        var now = _timeProvider.GetUtcNow();
        var updates = new List<RoomUpdate>();

        foreach (var room in _rooms.Values)
        {
            lock (room.Lock)
            {
                if (
                    !_rooms.TryGetValue(room.Id, out var currentRoom)
                    || !ReferenceEquals(currentRoom, room)
                )
                {
                    continue;
                }

                var deadline = room.State.PhaseEndsAt;

                if (deadline is null || deadline > now)
                {
                    continue;
                }

                switch (room.State.Phase)
                {
                    case GamePhase.WordChoice:
                        var word =
                            room.State.WordChoices.FirstOrDefault()
                            ?? throw new InvalidOperationException(
                                "No word choices are available."
                            );
                        BeginPlaying(room, word, now);
                        updates.Add(new RoomUpdate(room.Id, CreateState(room)));
                        break;

                    case GamePhase.Playing:
                        var canvasWasCleared = FinishTurn(room, now);
                        updates.Add(
                            new RoomUpdate(
                                room.Id,
                                CreateState(room),
                                canvasWasCleared ? CreateCanvasState(room) : null
                            )
                        );
                        break;
                }
            }
        }
        return updates;
    }

    private void BeginWordChoice(GameRoom room, DateTimeOffset now)
    {
        var state = room.State;

        state.CurrentWord = null;
        state.MaskedWord = null;
        state.WordChoices.Clear();
        state.WordChoices.AddRange(_wordList.GetChoices(room.Config.WordSelectionSize));

        state.CorrectAnswerPlayerIds.Clear();
        state.CompletedStrokes.Clear();
        state.ActiveStroke = null;

        state.Phase = GamePhase.WordChoice;
        state.PhaseEndsAt = now.AddSeconds(room.Config.WordChoiceTimerSeconds);
    }

    private static void BeginPlaying(GameRoom room, string selectedWord, DateTimeOffset now)
    {
        var state = room.State;

        state.CurrentWord = selectedWord;
        state.MaskedWord = MaskWord(selectedWord);
        state.WordChoices.Clear();

        state.Phase = GamePhase.Playing;
        state.PhaseEndsAt = now.AddSeconds(room.Config.DrawTimerSeconds);
    }

    private bool FinishTurn(GameRoom room, DateTimeOffset now)
    {
        var state = room.State;

        state.CurrentArtistIndex++;

        if (state.CurrentArtistIndex >= state.ArtistQueue.Count)
        {
            state.CurrentArtistIndex = 0;
            var nextRound = (state.CurrentRound ?? throw new InvalidOperationException()) + 1;

            if (nextRound > room.Config.NumberOfRounds)
            {
                BeginResults(room);
                return false;
            }

            state.CurrentRound = nextRound;
        }

        BeginWordChoice(room, now);
        return true;
    }

    private bool ContinueAfterArtistRemoval(GameRoom room, DateTimeOffset now)
    {
        var state = room.State;

        if (state.CurrentArtistIndex >= state.ArtistQueue.Count)
        {
            state.CurrentArtistIndex = 0;
            var nextRound = (state.CurrentRound ?? throw new InvalidOperationException()) + 1;

            if (nextRound > room.Config.NumberOfRounds)
            {
                BeginResults(room);
                return false;
            }

            state.CurrentRound = nextRound;
        }

        BeginWordChoice(room, now);
        return true;
    }

    private static void BeginResults(GameRoom room)
    {
        var state = room.State;

        state.Phase = GamePhase.Results;
        state.PhaseEndsAt = null;
        state.CurrentWord = null;
        state.MaskedWord = null;
        state.WordChoices.Clear();
        state.CorrectAnswerPlayerIds.Clear();
        state.ArtistQueue.Clear();
        state.CurrentArtistIndex = 0;
    }

    private static void ResetToLobby(GameRoom room)
    {
        var state = room.State;

        state.Phase = GamePhase.Lobby;
        state.CurrentRound = null;
        state.CurrentArtistIndex = 0;
        state.ArtistQueue.Clear();
        state.CurrentWord = null;
        state.MaskedWord = null;
        state.WordChoices.Clear();
        state.CorrectAnswerPlayerIds.Clear();
        state.GameStartedAt = null;
        state.PhaseEndsAt = null;
        state.CompletedStrokes.Clear();
        state.ActiveStroke = null;

        foreach (var playerId in room.Players.Keys)
        {
            state.Scores[playerId] = 0;
        }
    }

    private static bool EveryoneHasGuessed(GameRoom room)
    {
        var artistId = GetCurrentArtistId(room);

        return room.Players.Count > 1
            && room.Players.Keys.Where(playerId => playerId != artistId)
                .All(room.State.CorrectAnswerPlayerIds.Contains);
    }

    private static void AwardPoints(GameRoom room, string guesserId)
    {
        var artistId =
            GetCurrentArtistId(room)
            ?? throw new InvalidOperationException("The artist is not set.");
        var guesserCount = room.Players.Count - 1;

        if (guesserCount < 1)
        {
            throw new InvalidOperationException("An active turn requires at least one guesser.");
        }

        var guesserPoints = 100 - (room.State.CorrectAnswerPlayerIds.Count * 10);
        var artistPoints = 100 / guesserCount;

        room.State.Scores[guesserId] += guesserPoints;
        room.State.Scores[artistId] += artistPoints;
    }

    private static string MaskWord(string word)
    {
        return string.Concat(word.Select(character => char.IsLetter(character) ? '_' : character));
    }

    private static string? GetCurrentArtistId(GameRoom room)
    {
        return room.State.ArtistQueue.Count > room.State.CurrentArtistIndex
            ? room.State.ArtistQueue[room.State.CurrentArtistIndex]
            : null;
    }

    private (GameRoom Room, Player Player) GetRoomMembership(string connectionId)
    {
        if (!_members.TryGetValue(connectionId, out var member))
        {
            throw new GameException("This connection is not in a room.");
        }

        if (!_rooms.TryGetValue(member.RoomId, out var room))
        {
            throw new InvalidOperationException(
                "A room membership references a room that does not exist."
            );
        }

        if (!room.Players.TryGetValue(member.PlayerId, out var player))
        {
            throw new InvalidOperationException(
                "A room membership references a player that does not exist."
            );
        }

        return (room, player);
    }

    private static bool IsValidPoint(Point point)
    {
        if (
            double.IsFinite(point.X)
            && double.IsFinite(point.Y)
            && point.X is not < 0 and not > 1
            && point.Y is not < 0 and not > 1
        )
        {
            return true;
        }
        else
        {
            return false;
        }
    }

    private static Stroke CloneStroke(Stroke original)
    {
        var clone = new Stroke { Colour = original.Colour, Width = original.Width };

        clone.Points.AddRange(original.Points);
        return clone;
    }

    private static CanvasStateDto CreateCanvasState(GameRoom room)
    {
        return new CanvasStateDto(
            room.State.CompletedStrokes.Select(CloneStroke).ToArray(),
            room.State.ActiveStroke is null ? null : CloneStroke(room.State.ActiveStroke)
        );
    }

    private void EnsureConnectionIsAvailable(string connectionId)
    {
        if (string.IsNullOrWhiteSpace(connectionId))
        {
            throw new ArgumentException("A connection ID is required.", nameof(connectionId));
        }

        if (_members.ContainsKey(connectionId))
        {
            throw new GameException("This connection is already in a room.");
        }
    }

    private static RoomEntryDto CreateEntry(GameRoom room, Player player)
    {
        var session = new RoomSessionDto(room.Id, player.Id);
        return new RoomEntryDto(session, CreateState(room));
    }

    private static GameStateDto CreateState(GameRoom room)
    {
        var currentArtistId = GetCurrentArtistId(room);

        var players = room
            .Players.Values.Select(player => new PlayerDto(
                player.Id,
                player.UserName,
                room.State.Scores.GetValueOrDefault(player.Id),
                player.Id == room.OwnerId,
                player.Id == currentArtistId,
                room.State.CorrectAnswerPlayerIds.Contains(player.Id)
            ))
            .OrderByDescending(player => player.Score)
            .ToArray();

        var config = new GameConfigDto(
            room.Config.MaxPlayers,
            room.Config.WordSelectionSize,
            room.Config.WordChoiceTimerSeconds,
            room.Config.DrawTimerSeconds,
            room.Config.NumberOfRounds
        );

        return new GameStateDto(
            room.Id,
            room.OwnerId,
            config,
            room.State.Phase,
            room.State.CurrentRound,
            currentArtistId,
            room.State.MaskedWord,
            room.State.PhaseEndsAt,
            players,
            room.ChatHistory.ToArray()
        );
    }
}

public sealed record RoomUpdate(
    string RoomId,
    GameStateDto? State,
    CanvasStateDto? CanvasState = null
);

public sealed record MessageUpdate(
    string RoomId,
    ChatMessageDto Message,
    RoomUpdate? StateUpdate = null
);
