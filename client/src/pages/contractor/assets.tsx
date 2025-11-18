import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import {
  Package,
  Search,
  ArrowLeft,
} from "lucide-react";

export default function ContractorAssets() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  const { data: assetsData, isLoading } = useQuery({
    queryKey: ["/api/contractor/assets"],
  });

  const { data: workersData } = useQuery({
    queryKey: ["/api/contractor/workers"],
  });

  const assets = assetsData?.assets || [];
  const workers = workersData?.workers || [];

  // Filter assets based on tab, search, and worker selection
  const filteredAssets = useMemo(() => {
    if (!assets || assets.length === 0) return [];

    let result = [...assets];

    // Filter by tab
    if (activeTab === "mine") {
      // Show only assets installed by the current contractor
      result = result.filter((asset: any) => asset.installerId === user?.id);
    } else if (activeTab === "team" && selectedWorker) {
      // Show only assets installed by the selected worker
      result = result.filter((asset: any) => asset.installerId === selectedWorker);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((asset: any) => {
        const searchFields = [
          asset.name,
          asset.category,
          asset.brand,
          asset.model,
          asset.serialNumber,
          asset.propertyName,
          asset.propertyAddress,
        ];
        return searchFields.some(
          (field) => field && field.toLowerCase().includes(query)
        );
      });
    }

    return result;
  }, [assets, activeTab, selectedWorker, searchQuery, user?.id]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1" data-testid="heading-assets">Assets</h1>
            <p className="text-muted-foreground">Every asset you or your team has ever tagged.</p>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by address, customer name, model, serial..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-assets"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="all" data-testid="tab-all-assets">All Assets</TabsTrigger>
            <TabsTrigger value="mine" data-testid="tab-my-installs">My Installs</TabsTrigger>
            <TabsTrigger value="team" data-testid="tab-by-team">By Team Member</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Worker filter (only show on team tab) */}
        {activeTab === "team" && (
          <Select value={selectedWorker || undefined} onValueChange={setSelectedWorker}>
            <SelectTrigger className="w-full md:w-64" data-testid="select-worker-filter">
              <SelectValue placeholder="Select team member" />
            </SelectTrigger>
            <SelectContent>
              {workers.map((worker: any) => (
                <SelectItem key={worker.id} value={worker.id} data-testid={`select-worker-${worker.id}`}>
                  {worker.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Assets List */}
      <div className="space-y-4">
        {isLoading ? (
          <>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </>
        ) : filteredAssets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                {searchQuery || selectedWorker || activeTab !== "all" 
                  ? "No assets match your filters" 
                  : "No assets found"}
              </p>
              <Button asChild data-testid="button-scan-first-asset">
                <Link href="/scan">Scan First Asset</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredAssets.map((asset: any) => (
            <Link key={asset.id} href={`/asset/${asset.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer" data-testid={`asset-card-${asset.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{asset.name}</h3>
                        <Badge variant="outline">{asset.category}</Badge>
                        {asset.status === 'WARRANTY_ACTIVE' && (
                          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                            Under Warranty
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p data-testid={`asset-property-${asset.id}`}>
                          {asset.propertyAddress || asset.propertyName || 'Unknown location'}
                        </p>
                        <p>Installed: {asset.installedAt ? new Date(asset.installedAt).toLocaleDateString() : 'N/A'}</p>
                        {asset.brand && <p>Brand: {asset.brand} {asset.model && `- ${asset.model}`}</p>}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" data-testid={`button-view-${asset.id}`}>
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
