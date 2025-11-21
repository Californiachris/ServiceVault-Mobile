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
import { Shield, Wrench, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function Login() {
  const [, setLocation] = useLocation();
  
  // User login state
  const [email, setEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userError, setUserError] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  
  // Worker login state
  const [username, setUsername] = useState("");
  const [workerPassword, setWorkerPassword] = useState("");
  const [workerError, setWorkerError] = useState("");

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/login", { email, password: userPassword });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Login failed");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      setUserError(error.message);
    },
  });

  const signupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/signup", {
        email,
        password: userPassword,
        firstName,
        lastName,
        role: "HOMEOWNER",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Signup failed");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      setUserError(error.message);
    },
  });

  const workerLoginMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/worker/login", {
        username,
        password: workerPassword,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Login failed");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/worker/check-in");
    },
    onError: (error: any) => {
      setWorkerError(error.message || "Invalid username or password");
    },
  });

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUserError("");
    if (!email || !userPassword) {
      setUserError("Please fill in all fields");
      return;
    }
    if (isSignUp && (!firstName || !lastName)) {
      setUserError("Please enter your first and last name");
      return;
    }
    if (isSignUp) {
      signupMutation.mutate();
    } else {
      loginMutation.mutate();
    }
  };

  const handleWorkerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setWorkerError("");
    if (!username.trim() || !workerPassword) {
      setWorkerError("Please enter both username and password");
      return;
    }
    workerLoginMutation.mutate();
  };

  const isUserLoading = loginMutation.isPending || signupMutation.isPending;
  const isWorkerLoading = workerLoginMutation.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
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
                <form onSubmit={handleUserSubmit} className="space-y-4" data-testid="form-user-auth">
                  {userError && (
                    <Alert variant="destructive" className="bg-red-950/50 border-red-900/50 text-red-200">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{userError}</AlertDescription>
                    </Alert>
                  )}

                  {isSignUp && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-slate-200">First Name</Label>
                        <Input
                          id="firstName"
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="bg-slate-800/50 border-slate-700 text-white rounded-xl"
                          placeholder="John"
                          data-testid="input-firstname"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="text-slate-200">Last Name</Label>
                        <Input
                          id="lastName"
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="bg-slate-800/50 border-slate-700 text-white rounded-xl"
                          placeholder="Doe"
                          data-testid="input-lastname"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-200">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-slate-800/50 border-slate-700 text-white rounded-xl"
                      placeholder="your@email.com"
                      data-testid="input-email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="userPassword" className="text-slate-200">Password</Label>
                    <Input
                      id="userPassword"
                      type="password"
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                      className="bg-slate-800/50 border-slate-700 text-white rounded-xl"
                      placeholder="••••••••"
                      data-testid="input-user-password"
                    />
                    {isSignUp && (
                      <p className="text-xs text-slate-400">
                        Min 8 chars, 1 uppercase, 1 lowercase, 1 number
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isUserLoading}
                    className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold h-12 rounded-2xl shadow-xl hover:shadow-cyan-500/50 transition-all duration-300 hover:scale-[1.02] transform"
                    data-testid="button-user-submit"
                  >
                    {isUserLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {isSignUp ? "Creating account..." : "Signing in..."}
                      </>
                    ) : (
                      <>
                        {isSignUp ? "Create Account" : "Sign In"}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp(!isSignUp);
                        setUserError("");
                        setEmail("");
                        setUserPassword("");
                        setFirstName("");
                        setLastName("");
                      }}
                      className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                      data-testid="button-toggle-auth"
                    >
                      {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
                    </button>
                  </div>
                </form>
              </TabsContent>

              {/* Worker Login Tab */}
              <TabsContent value="worker" className="space-y-4">
                <div className="text-center mb-4">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 inline-flex items-center justify-center mb-3 shadow-xl shadow-cyan-500/30">
                    <Wrench className="h-12 w-12 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">
                    Worker Access
                  </h3>
                  <p className="text-slate-300 text-sm">
                    Sign in with your worker credentials
                  </p>
                </div>

                <form onSubmit={handleWorkerSubmit} className="space-y-4" data-testid="form-worker-auth">
                  {workerError && (
                    <Alert variant="destructive" className="bg-red-950/50 border-red-900/50 text-red-200">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{workerError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-slate-200">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="bg-slate-800/50 border-slate-700 text-white rounded-xl"
                      placeholder="Enter your username"
                      data-testid="input-username"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="workerPassword" className="text-slate-200">Password</Label>
                    <Input
                      id="workerPassword"
                      type="password"
                      value={workerPassword}
                      onChange={(e) => setWorkerPassword(e.target.value)}
                      className="bg-slate-800/50 border-slate-700 text-white rounded-xl"
                      placeholder="••••••••"
                      data-testid="input-worker-password"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isWorkerLoading}
                    className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold h-12 rounded-2xl shadow-xl hover:shadow-cyan-500/50 transition-all duration-300 hover:scale-[1.02] transform"
                    data-testid="button-worker-submit"
                  >
                    {isWorkerLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign In as Worker
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
