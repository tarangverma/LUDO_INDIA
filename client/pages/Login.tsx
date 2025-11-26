import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error("Please enter a username");
      return;
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        await login(username , password);
        toast.success(`Welcome back, ${username}!`);
      } else {
        await signup(username, password);
        toast.success(`Welcome to Ludo, ${username}!`);
      }
      navigate("/rooms");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-emerald-50 to-amber-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-slate-200 bg-white/80 backdrop-blur p-8 shadow-lg">
          <div className="text-center mb-8">
            <div className="h-12 w-12 rounded-md bg-gradient-to-br from-emerald-500 to-sky-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900">Ludo</h1>
            <p className="text-sm text-slate-600 mt-1">Play with friends online</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                disabled={isLoading}
                className="w-full"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={isLoading}
                className="w-full"
              />
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "Please wait..." : isLogin ? "Login" : "Sign Up"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-slate-600 hover:text-slate-900 hover:underline focus:outline-none"
              disabled={isLoading}
            >
              {isLogin ? "Need an account? Sign up" : "Already have an account? Login"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
