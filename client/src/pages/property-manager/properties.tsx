import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Building2, Plus, QrCode, MapPin, Search, Edit, X, CheckCircle2, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface Property {
  id: string;
  managedPropertyId: string;
  propertyId: string;
  managementStatus: string;
  masterQrCode: string;
  createdAt: string;
  property: {
    id: string;
    name: string;
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
    propertyType: string;
  };
}

export default function Properties() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { data: properties, isLoading } = useQuery<Property[]>({
    queryKey: ["/api/property-manager/properties"],
  });

  const addPropertyMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/property-manager/properties", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/property-manager/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/property-manager"] });
      toast({
        title: "Success",
        description: "Property added successfully",
      });
      setIsAddDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add property",
        variant: "destructive",
      });
    },
  });

  const updatePropertyMutation = useMutation({
    mutationFn: async ({ id, managementStatus }: { id: string; managementStatus: string }) => {
      return await apiRequest(`/api/property-manager/properties/${id}`, "PATCH", { managementStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/property-manager/properties"] });
      toast({
        title: "Success",
        description: "Property status updated",
      });
    },
  });

  const editPropertyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest(`/api/property-manager/properties/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/property-manager/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/property-manager"] });
      toast({
        title: "Success",
        description: "Property updated successfully",
      });
      setIsEditDialogOpen(false);
      setSelectedProperty(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update property",
        variant: "destructive",
      });
    },
  });

  const deletePropertyMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/property-manager/properties/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/property-manager/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/property-manager"] });
      toast({
        title: "Success",
        description: "Property removed from management",
      });
      setIsDeleteDialogOpen(false);
      setSelectedProperty(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete property",
        variant: "destructive",
      });
    },
  });

  const handleAddProperty = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      addressLine1: formData.get("addressLine1"),
      city: formData.get("city"),
      state: formData.get("state"),
      postalCode: formData.get("postalCode"),
      propertyType: formData.get("propertyType") || "RENTAL",
    };
    addPropertyMutation.mutate(data);
  };

  const handleEditProperty = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProperty) return;
    
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      addressLine1: formData.get("addressLine1"),
      city: formData.get("city"),
      state: formData.get("state"),
      postalCode: formData.get("postalCode"),
      propertyType: formData.get("propertyType"),
    };
    editPropertyMutation.mutate({ id: selectedProperty.id, data });
  };

  const handleDeleteProperty = () => {
    if (!selectedProperty) return;
    deletePropertyMutation.mutate(selectedProperty.id);
  };

  const filteredProperties = properties?.filter((p) => {
    const query = searchQuery.toLowerCase();
    return (
      p.property.name.toLowerCase().includes(query) ||
      p.property.addressLine1.toLowerCase().includes(query) ||
      p.property.city.toLowerCase().includes(query) ||
      p.masterQrCode.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 pb-24">
        <Skeleton className="h-32 w-full mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 pb-24">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2" data-testid="heading-properties">
              Properties
            </h1>
            <p className="text-muted-foreground">
              Manage all properties under your supervision
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} size="lg" data-testid="button-add-property">
            <Plus className="mr-2 h-5 w-5" />
            Add Property
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, address, or QR code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-properties"
          />
          {searchQuery && (
            <Badge variant="secondary" className="absolute right-3 top-1/2 -translate-y-1/2 text-xs">
              {filteredProperties?.length || 0} results
            </Badge>
          )}
        </div>
      </div>

      {/* Properties Grid */}
      {!filteredProperties || filteredProperties.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No properties found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery ? "No properties match your search" : "Add your first property to get started"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-first-property">
                <Plus className="mr-2 h-4 w-4" />
                Add Property
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => (
            <Card
              key={property.id}
              className="hover:shadow-lg transition-all cursor-pointer group"
              data-testid={`property-card-${property.id}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2 group-hover:text-primary transition-colors">
                      {property.property.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <MapPin className="h-3 w-3" />
                      <span>{property.property.addressLine1}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {property.property.city}, {property.property.state} {property.property.postalCode}
                    </div>
                  </div>
                  <Badge
                    variant={property.managementStatus === "ACTIVE" ? "default" : "secondary"}
                    className={property.managementStatus === "ACTIVE" ? "bg-green-500" : ""}
                  >
                    {property.managementStatus}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Property Type:</span>
                    <Badge variant="outline">{property.property.propertyType}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Added:</span>
                    <span>{format(new Date(property.createdAt), "MMM d, yyyy")}</span>
                  </div>
                  <div className="pt-3 border-t space-y-2">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedProperty(property);
                          setIsQrDialogOpen(true);
                        }}
                        data-testid={`button-view-qr-${property.id}`}
                      >
                        <QrCode className="mr-2 h-4 w-4" />
                        QR Code
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedProperty(property);
                          setIsEditDialogOpen(true);
                        }}
                        data-testid={`button-edit-${property.id}`}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      {property.managementStatus === "ACTIVE" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => updatePropertyMutation.mutate({ id: property.id, managementStatus: "INACTIVE" })}
                          data-testid={`button-deactivate-${property.id}`}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => updatePropertyMutation.mutate({ id: property.id, managementStatus: "ACTIVE" })}
                          data-testid={`button-activate-${property.id}`}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Activate
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => {
                          setSelectedProperty(property);
                          setIsDeleteDialogOpen(true);
                        }}
                        data-testid={`button-delete-${property.id}`}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Property Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent data-testid="dialog-add-property">
          <DialogHeader>
            <DialogTitle>Add New Property</DialogTitle>
            <DialogDescription>
              Add a property to your management portfolio
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddProperty}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Property Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="123 Main St Apartment"
                  required
                  data-testid="input-property-name"
                />
              </div>
              <div>
                <Label htmlFor="addressLine1">Address</Label>
                <Input
                  id="addressLine1"
                  name="addressLine1"
                  placeholder="123 Main St"
                  required
                  data-testid="input-address"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" name="city" placeholder="San Francisco" required data-testid="input-city" />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input id="state" name="state" placeholder="CA" required data-testid="input-state" />
                </div>
              </div>
              <div>
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input id="postalCode" name="postalCode" placeholder="94102" required data-testid="input-postal-code" />
              </div>
              <div>
                <Label htmlFor="propertyType">Property Type</Label>
                <Select name="propertyType" defaultValue="RENTAL">
                  <SelectTrigger data-testid="select-property-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RENTAL">Rental</SelectItem>
                    <SelectItem value="CONDO">Condo</SelectItem>
                    <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                    <SelectItem value="SINGLE_FAMILY">Single Family</SelectItem>
                    <SelectItem value="MULTI_FAMILY">Multi Family</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} data-testid="button-cancel-add">
                Cancel
              </Button>
              <Button type="submit" disabled={addPropertyMutation.isPending} data-testid="button-submit-add">
                {addPropertyMutation.isPending ? "Adding..." : "Add Property"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
        <DialogContent data-testid="dialog-qr-code">
          <DialogHeader>
            <DialogTitle>Property Master QR Code</DialogTitle>
            <DialogDescription>
              Tenants can scan this QR code to submit maintenance requests
            </DialogDescription>
          </DialogHeader>
          {selectedProperty && (
            <div className="py-4 space-y-4">
              <div className="text-center">
                <div className="bg-white p-8 rounded-lg inline-block">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                      `${window.location.origin}/tenant-report/${selectedProperty.masterQrCode}`
                    )}`}
                    alt="Property QR Code"
                    className="w-48 h-48"
                    data-testid="img-qr-code"
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Master QR Code: <span className="font-mono font-semibold">{selectedProperty.masterQrCode}</span>
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">{selectedProperty.property.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedProperty.property.addressLine1}<br />
                  {selectedProperty.property.city}, {selectedProperty.property.state} {selectedProperty.property.postalCode}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQrDialogOpen(false)} data-testid="button-close-qr">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Property Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent data-testid="dialog-edit-property">
          <DialogHeader>
            <DialogTitle>Edit Property</DialogTitle>
            <DialogDescription>
              Update property details
            </DialogDescription>
          </DialogHeader>
          {selectedProperty && (
            <form onSubmit={handleEditProperty}>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="edit-name">Property Name</Label>
                  <Input
                    id="edit-name"
                    name="name"
                    defaultValue={selectedProperty.property.name}
                    placeholder="123 Main St Apartment"
                    required
                    data-testid="input-edit-property-name"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-addressLine1">Address</Label>
                  <Input
                    id="edit-addressLine1"
                    name="addressLine1"
                    defaultValue={selectedProperty.property.addressLine1}
                    placeholder="123 Main St"
                    required
                    data-testid="input-edit-address"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-city">City</Label>
                    <Input
                      id="edit-city"
                      name="city"
                      defaultValue={selectedProperty.property.city}
                      placeholder="San Francisco"
                      required
                      data-testid="input-edit-city"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-state">State</Label>
                    <Input
                      id="edit-state"
                      name="state"
                      defaultValue={selectedProperty.property.state}
                      placeholder="CA"
                      required
                      data-testid="input-edit-state"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-postalCode">Postal Code</Label>
                  <Input
                    id="edit-postalCode"
                    name="postalCode"
                    defaultValue={selectedProperty.property.postalCode}
                    placeholder="94102"
                    required
                    data-testid="input-edit-postal-code"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-propertyType">Property Type</Label>
                  <Select name="propertyType" defaultValue={selectedProperty.property.propertyType}>
                    <SelectTrigger data-testid="select-edit-property-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RENTAL">Rental</SelectItem>
                      <SelectItem value="CONDO">Condo</SelectItem>
                      <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                      <SelectItem value="SINGLE_FAMILY">Single Family</SelectItem>
                      <SelectItem value="MULTI_FAMILY">Multi Family</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setSelectedProperty(null);
                  }}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={editPropertyMutation.isPending} data-testid="button-submit-edit">
                  {editPropertyMutation.isPending ? "Updating..." : "Update Property"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent data-testid="dialog-delete-property">
          <DialogHeader>
            <DialogTitle>Delete Property</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this property from management?
            </DialogDescription>
          </DialogHeader>
          {selectedProperty && (
            <div className="py-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">{selectedProperty.property.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedProperty.property.addressLine1}<br />
                  {selectedProperty.property.city}, {selectedProperty.property.state} {selectedProperty.property.postalCode}
                </p>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                This will remove the property from your management portfolio. The property data will be preserved but no longer linked to your account.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setSelectedProperty(null);
              }}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProperty}
              disabled={deletePropertyMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deletePropertyMutation.isPending ? "Deleting..." : "Delete Property"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
