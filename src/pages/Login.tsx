import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Lock, User, Loader2, Eye, EyeOff } from "lucide-react";

const REMEMBER_KEY = "printstock_remember";

const Login = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      try {
        const { username: u, password: p } = JSON.parse(saved);
        setUsername(u || "");
        setPassword(p || "");
        setRemember(true);
      } catch { /* ignore */ }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const ok = await login(username, password);
      if (ok) {
        if (remember) {
          localStorage.setItem(REMEMBER_KEY, JSON.stringify({ username, password }));
        } else {
          localStorage.removeItem(REMEMBER_KEY);
        }
      } else {
        setError("Username atau password salah");
      }
    } catch {
      setError("Terjadi kesalahan, coba lagi");
    }
    setLoading(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-32 -right-32 h-72 w-72 rounded-full bg-primary/15 blur-3xl"
          style={{ animation: 'float 8s ease-in-out infinite' }}
        />
        <div
          className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-accent/15 blur-3xl"
          style={{ animation: 'float 10s ease-in-out infinite 2s' }}
        />
        <div
          className="absolute top-1/4 right-1/4 h-40 w-40 rounded-full bg-safe/10 blur-2xl"
          style={{ animation: 'float 6s ease-in-out infinite 1s' }}
        />
        <div
          className="absolute bottom-1/3 left-1/3 h-56 w-56 rounded-full bg-primary/8 blur-3xl"
          style={{ animation: 'float 12s ease-in-out infinite 3s' }}
        />
      </div>

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Login Card */}
      <Card
        className="relative w-full max-w-md shadow-2xl border-border/50 backdrop-blur-sm bg-card/95"
        style={{ animation: 'card-enter 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
      >
        <CardHeader className="text-center space-y-4 pb-2">
          <div
  className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25 overflow-hidden"
  style={{ animation: 'logo-bounce 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both' }}
>
  <img
    src="/logo.png"
    alt="PrintStock Logo"
    className="h-10 w-10 object-contain"
  />
</div>
          <div style={{ animation: 'fade-up 0.5s ease-out 0.4s both' }}>
            <CardTitle className="text-2xl font-bold">PrintStock</CardTitle>
            <p className="text-sm italic capitalize text-muted-foreground mt-1">Barang terpantau rapi, stock aman terkendali</p>
            
            
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2" style={{ animation: 'fade-up 0.5s ease-out 0.5s both' }}>
              <Label>Username</Label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  value={username}
                  onChange={e => setUsername(e.target.value.slice(0, 50))}
                  placeholder="Username"
                  className="pl-9 transition-shadow focus:shadow-md focus:shadow-primary/10"
                  maxLength={50}
                  autoFocus
                  disabled={loading}
                />
              </div>
            </div>
            <div className="space-y-2" style={{ animation: 'fade-up 0.5s ease-out 0.6s both' }}>
              <Label>Password</Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value.slice(0, 100))}
                  placeholder="Password"
                  className="pl-9 pr-10 transition-shadow focus:shadow-md focus:shadow-primary/10"
                  maxLength={100}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2" style={{ animation: 'fade-up 0.5s ease-out 0.65s both' }}>
              <Checkbox
                id="remember"
                checked={remember}
                onCheckedChange={(v) => setRemember(v === true)}
                disabled={loading}
              />
              <Label htmlFor="remember" className="text-sm font-normal cursor-pointer text-muted-foreground">
                Ingatkan saya
              </Label>
            </div>

            {error && (
              <p className="text-sm text-destructive font-medium animate-fade-in">{error}</p>
            )}
            <div style={{ animation: 'fade-up 0.5s ease-out 0.7s both' }}>
              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/25"
                disabled={loading}
              >
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memproses...</>
                ) : (
                  "Masuk"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }
        @keyframes card-enter {
          0% { opacity: 0; transform: translateY(30px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes logo-bounce {
          0% { opacity: 0; transform: scale(0) rotate(-10deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes fade-up {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Login;
