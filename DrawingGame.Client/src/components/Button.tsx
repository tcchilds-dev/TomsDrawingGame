// TODO: add variants
export default function Button({ type }: { type: "Leave" | "CreateRoom" | "JoinRoom" }) {
  if (type == "Leave") {
    return <button className="btn btn-soft btn-error w-full">Leave</button>;
  }
  if (type == "CreateRoom") {
    return <button className="btn btn-primary">Create Room</button>;
  }
  if (type == "JoinRoom") {
    return <button className="btn btn-secondary">Join Room</button>;
  }
}
