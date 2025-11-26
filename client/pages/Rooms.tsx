import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import { toast } from "sonner";
import { LogOut, Plus, Share2 } from "lucide-react";

export default function Rooms() {
  const [mode, setMode] = useState<"menu" | "create" | "join">("menu");
  const [roomName, setRoomName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [roomId, setRoomId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { user, logout } = useAuth();
  const { createRoom, joinRoom } = useGame();
  const navigate = useNavigate();

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) {
      toast.error("Please enter a room name");
      return;
    }

    setIsLoading(true);
    try {
      const id = await createRoom(roomName, maxPlayers);
      toast.success("Room created!");
      navigate(`/game/${id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create room");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId.trim()) {
      toast.error("Please enter a room ID");
      return;
    }

    setIsLoading(true);
    try {
      await joinRoom(roomId.toUpperCase(), user?.username || "Guest");
      toast.success("Joined room!");
      navigate(`/game/${roomId.toUpperCase()}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to join room");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-emerald-50 to-amber-100">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/60 border-b border-slate-200">
        <div className="container mx-auto py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-gradient-to-br from-emerald-500 to-sky-500" />
            <h1 className="text-lg font-semibold tracking-tight">Ludo</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">{user?.username}</span>
            <Button onClick={handleLogout} variant="secondary" size="sm">
              <LogOut className="w-4 h-4 mr-1" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-12">
        {mode === "menu" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900">Play Ludo Online</h2>
              <p className="text-slate-600 mt-2">Create or join a room to play with friends</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div
                onClick={() => {
                  setMode("create");
                  setRoomName("");
                  setMaxPlayers(4);
                }}
                className="rounded-xl border border-slate-200 bg-white/70 backdrop-blur p-6 cursor-pointer hover:border-slate-300 hover:shadow-lg transition"
              >
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center mb-4">
                  <Plus className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Create Room</h3>
                <p className="text-sm text-slate-600 mt-2">Start a new game and invite friends</p>
              </div>

              <div
                onClick={() => {
                  setMode("join");
                  setRoomId("");
                }}
                className="rounded-xl border border-slate-200 bg-white/70 backdrop-blur p-6 cursor-pointer hover:border-slate-300 hover:shadow-lg transition"
              >
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-sky-100 to-sky-200 flex items-center justify-center mb-4">
                  <Share2 className="w-6 h-6 text-sky-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Join Room</h3>
                <p className="text-sm text-slate-600 mt-2">Join a friend's game with a room ID</p>
              </div>
            </div>
          </div>
        )}

        {mode === "create" && (
          <div className="max-w-md mx-auto">
            <div className="rounded-xl border border-slate-200 bg-white/80 backdrop-blur p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Create Room</h2>

              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Room Name</label>
                  <Input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="e.g., Friends Game"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Max Players</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[2, 3, 4].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setMaxPlayers(n)}
                        className={`py-2 px-3 rounded-lg font-medium transition ${
                          maxPlayers === n
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {n}P
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setMode("menu")}
                    disabled={isLoading}
                  >
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isLoading}>
                    {isLoading ? "Creating..." : "Create"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {mode === "join" && (
          <div className="max-w-md mx-auto">
            <div className="rounded-xl border border-slate-200 bg-white/80 backdrop-blur p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Join Room</h2>

              <form onSubmit={handleJoinRoom} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Room ID</label>
                  <Input
                    type="text"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                    placeholder="e.g., ABC123"
                    disabled={isLoading}
                    maxLength={6}
                  />
                  <p className="text-xs text-slate-500 mt-2">Ask your friend for their room ID</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setMode("menu")}
                    disabled={isLoading}
                  >
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isLoading}>
                    {isLoading ? "Joining..." : "Join"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
