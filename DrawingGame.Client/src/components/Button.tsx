type ButtonProps = {
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type: "Leave" | "CreateRoom" | "JoinRoom" | "Start";
};

export default function Button({ disabled = false, onClick, type }: ButtonProps) {
  if (type == "Leave") {
    return (
      <button
        className="btn btn-soft btn-error w-full"
        disabled={disabled}
        onClick={onClick}
        type="button"
      >
        Leave
      </button>
    );
  }
  if (type == "CreateRoom") {
    return (
      <button className="btn btn-primary" disabled={disabled} onClick={onClick} type="button">
        Create Room
      </button>
    );
  }
  if (type == "JoinRoom") {
    return (
      <button className="btn btn-secondary" disabled={disabled} onClick={onClick} type="button">
        Join Room
      </button>
    );
  }
  if (type == "Start") {
    return (
      <button
        className="btn btn-primary w-full"
        disabled={disabled}
        onClick={onClick}
        type="button"
      >
        Start Game
      </button>
    );
  }
}
