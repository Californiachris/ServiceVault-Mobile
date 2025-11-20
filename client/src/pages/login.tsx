import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Shield, Wrench, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function Login() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const workerLoginMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/worker/login", {
        username,
        password,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Login failed");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      setLocation("/worker/check-in");
    },
    onError: (error: any) => {
      setError(error.message || "Invalid username or password");
    },
  });

  const handleWorkerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError("Please enter both username and password");
      return;
    }
    workerLoginMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/">
          <div className="flex flex-col items-center mb-8 cursor-pointer group">
            <img 
              src="/vault-logo.png?v=3" 
              alt="ServiceVault Logo" 
              className="h-20 w-20 object-contain mb-3 group-hover:opacity-80 transition-opacity"
            />
            <span className="text-3xl font-extrabold tracking-tight whitespace-nowrap bg-gradient-to-r from-cyan-400 via-cyan-300 to-yellow-400 bg-clip-text text-transparent">
              ServiceVault™
            </span>
          </div>
        </Link>

        <Card className="bg-slate-900/80 border-slate-700/50 shadow-2xl shadow-cyan-500/20 rounded-3xl backdrop-blur-xl">
          <CardHeader className="space-y-2 pb-4">
            <CardTitle className="text-3xl font-bold text-center text-white">
              Sign In
            </CardTitle>
            <CardDescription className="text-center text-slate-300 text-base">
              Choose your sign-in method
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="user" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 p-1 rounded-xl mb-6">
                <TabsTrigger 
                  value="user" 
                  className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
                  data-testid="tab-user-login"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  User Login
                </TabsTrigger>
                <TabsTrigger 
                  value="worker" 
                  className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
                  data-testid="tab-worker-login"
                >
                  <Wrench className="h-4 w-4 mr-2" />
                  Worker Login
                </TabsTrigger>
              </TabsList>

              {/* User Login Tab */}
              <TabsContent value="user" className="space-y-4">
                <div className="text-center py-6">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 inline-flex items-center justify-center mb-4 shadow-xl shadow-cyan-500/30">
                    <Shield className="h-12 w-12 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    Sign in with ServiceVault
                  </h3>
                  <p className="text-slate-300 mb-6">
                    For contractors, homeowners, and property managers
                  </p>
                  <Button
                    onClick={() => window.location.href = "/api/login"}
                    className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold h-12 px-8 rounded-2xl shadow-xl hover:shadow-cyan-500/50 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] transform"
                    data-testid="button-replit-login"
                  >
                    Continue with ServiceVault
                  </Button>
                </div>
              </TabsContent>

              {/* Worker Login Tab */}
              <TabsContent value="worker" className="space-y-4">
                <div className="text-center mb-4">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 inline-flex items-center justify-center mb-3 shadow-xl shadow-cyan-500/30">
                    <Wrench className="h-12 w-12 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">
                    Worker Sign In
                  </h3>
                  <p className="text-slate-300 text-sm">
                    Use your worker credentials
                  </p>
                </div>

                <form onSubmit={handleWorkerSubmit} className="space-y-5">
                  {error && (
                    <Alert variant="destructive" className="bg-red-500/10 border-red-500/30" data-testid="alert-error">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-semibold text-slate-300">
                      Username
                    </Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="johnny.king"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={workerLoginMutation.isPending}
                      className="h-11 bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
                      data-testid="input-username"
                      autoComplete="username"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-semibold text-slate-300">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={workerLoginMutation.isPending}
                      className="h-11 bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
                      data-testid="input-password"
                      autoComplete="current-password"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold h-12 rounded-2xl shadow-xl hover:shadow-cyan-500/50 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] transform"
                    disabled={workerLoginMutation.isPending}
                    data-testid="button-worker-login-submit"
                  >
                    {workerLoginMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 text-center">
              <Link href="/">
                <Button variant="ghost" className="text-slate-400 hover:text-white" data-testid="button-back-home">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
