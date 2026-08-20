using System.Collections.Concurrent;
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

    // <room.Id, room>
    private readonly ConcurrentDictionary<string, GameRoom> _rooms = new(StringComparer.Ordinal);

    // <connection.Id, room member>
    private readonly ConcurrentDictionary<string, RoomMember> _members = new();
    private readonly WordList _wordList;

    public GameManager(WordList wordList)
    {
        _wordList = wordList;
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

        return CreateEntry(room, player);
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

    public RoomEntryDto RejoinRoom(string connectionId, RoomSessionDto? session)
    {
        if (
            session is null
            || string.IsNullOrWhiteSpace(session.RoomId)
            || string.IsNullOrWhiteSpace(session.PlayerId)
            || !_rooms.TryGetValue(session.RoomId, out var room)
            || !room.Players.TryGetValue(session.PlayerId, out var player)
        )
        {
            throw InvalidRoomSession();
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

    public GameStateDto StartGame(string connectionId)
    {
        var (room, player) = GetRoomMembership(connectionId);

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

        var playerIds = room.Players.Keys;

        room.State.CurrentRound = 1;
        room.State.ArtistQueue.Clear();
        room.State.ArtistQueue.AddRange(playerIds);
        room.State.CurrentArtistIndex = 0;
        room.State.Phase = GamePhase.WordChoice;

        return CreateState(room);
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

        if (
            !room.Players.TryGetValue(member.PlayerId, out var player)
            || player.ConnectionId != connectionId
        )
        {
            _members.TryRemove(connectionId, out _);
            return null;
        }

        _members.TryRemove(connectionId, out _);
        room.Players.TryRemove(player.Id, out _);
        room.State.Scores.Remove(player.Id);
        room.State.CorrectAnswerPlayerIds.Remove(player.Id);
        room.State.ArtistQueue.RemoveAll(playerId => playerId == player.Id);

        if (room.Players.Count == 0)
        {
            _rooms.TryRemove(room.Id, out _);
            return new RoomUpdate(room.Id, null);
        }

        if (room.OwnerId == player.Id)
        {
            room.OwnerId = room.Players.Keys.First();
        }

        return new RoomUpdate(room.Id, CreateState(room));
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
        var currentArtistId =
            room.State.ArtistQueue.Count > room.State.CurrentArtistIndex
                ? room.State.ArtistQueue[room.State.CurrentArtistIndex]
                : null;

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

    private static GameException InvalidRoomSession()
    {
        return new GameException("Room session is no longer valid.");
    }
}

public sealed record RoomUpdate(string RoomId, GameStateDto? State);
