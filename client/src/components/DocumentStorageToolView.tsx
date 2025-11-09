import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { DocumentScanner, type ExtractedDocumentPayload } from "@/components/DocumentScanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Sparkles, FileText, Calendar, DollarSign, Trash2 } from "lucide-react";
import type { documents } from "@shared/schema";

type Document = typeof documents.$inferSelect;

interface UploadDocumentFormData {
  name: string;
  documentType: string;
  issueDate: string;
  expiryDate: string;
  amount: string;
  description: string;
  objectPath: string;
}

const DOCUMENT_TYPES = [
  'WARRANTY', 'RECEIPT', 'MANUAL', 'INSPECTION_REPORT', 
  'INSURANCE', 'PERMIT', 'CERTIFICATION', 'OTHER'
];

export default function DocumentStorageToolView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [showManualEntry, setShowManualEntry] = useState(false);
  
  const [uploadForm, setUploadForm] = useState<UploadDocumentFormData>({
    name: '',
    documentType: 'OTHER',
    issueDate: '',
    expiryDate: '',
    amount: '',
    description: '',
    objectPath: '',
  });

  const documentsQuery = useQuery({
    queryKey: ["/api/documents"],
    enabled: isAuthenticated,
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: UploadDocumentFormData) => {
      const response = await apiRequest("POST", "/api/documents", {
        name: data.name,
        documentType: data.documentType,
        issueDate: data.issueDate || undefined,
        expiryDate: data.expiryDate || undefined,
        amount: data.amount || undefined,
        description: data.description || undefined,
        objectPath: data.objectPath,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Document Uploaded Successfully",
        description: `${uploadForm.name} has been added to your documents`,
      });
      setUploadForm({
        name: '', documentType: 'OTHER', issueDate: '', expiryDate: '',
        amount: '', description: '', objectPath: '',
      });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setShowManualEntry(false);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload document",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/documents/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Document Deleted",
        description: "Document has been removed from your storage",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete document",
        variant: "destructive",
      });
    },
  });

  const handleAIDataExtracted = (data: ExtractedDocumentPayload) => {
    setUploadForm(prev => ({
      ...prev,
      name: data.documentName || prev.name,
      documentType: data.documentType || prev.documentType,
      issueDate: data.issueDate || prev.issueDate,
      expiryDate: data.expiryDate || prev.expiryDate,
      amount: data.amount || prev.amount,
      description: data.description || prev.description,
      objectPath: data.objectPath, // objectPath is guaranteed to be non-null in ExtractedDocumentPayload
    }));
    toast({
      title: "Data Extracted!",
      description: "Please review the auto-filled information below.",
    });
    setShowManualEntry(true);
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.name || !uploadForm.objectPath) {
      toast({
        title: "Missing Information",
        description: "Please upload a document and provide a name",
        variant: "destructive",
      });
      return;
    }
    uploadMutation.mutate(uploadForm);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const documents = documentsQuery.data as Document[] | undefined;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-primary">
          <Sparkles className="h-5 w-5" />
          <p className="font-semibold">AI-Powered Document Storage</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Scan warranties, receipts, or manuals to automatically extract and organize details
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <DocumentScanner 
            onDataExtracted={handleAIDataExtracted}
            extractionType="document"
          />
        </CardContent>
      </Card>

      <Collapsible open={showManualEntry} onOpenChange={setShowManualEntry}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full" 
            data-testid="button-toggle-manual-entry"
          >
            {showManualEntry ? (
              <>
                <ChevronUp className="mr-2 h-4 w-4" />
                Hide Manual Entry
              </>
            ) : (
              <>
                <ChevronDown className="mr-2 h-4 w-4" />
                Enter Manually Instead
              </>
            )}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-6">
          <form onSubmit={handleUploadSubmit} className="space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="docName">Document Name *</Label>
                    <Input
                      id="docName"
                      placeholder="e.g., HVAC Warranty 2024"
                      value={uploadForm.name}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                      data-testid="input-document-name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="docType">Document Type</Label>
                    <Select 
                      value={uploadForm.documentType} 
                      onValueChange={(value) => setUploadForm(prev => ({ ...prev, documentType: value }))}
                    >
                      <SelectTrigger data-testid="select-document-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_TYPES.map(type => (
                          <SelectItem key={type} value={type}>
                            {type.replace('_', ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="issueDate">Issue Date</Label>
                    <Input
                      id="issueDate"
                      type="date"
                      value={uploadForm.issueDate}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, issueDate: e.target.value }))}
                      data-testid="input-issue-date"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expiryDate">Expiry Date</Label>
                    <Input
                      id="expiryDate"
                      type="date"
                      value={uploadForm.expiryDate}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                      data-testid="input-expiry-date"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      placeholder="e.g., $599.99"
                      value={uploadForm.amount}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, amount: e.target.value }))}
                      data-testid="input-amount"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder="Additional notes..."
                      value={uploadForm.description}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                      data-testid="input-description"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button 
              type="submit" 
              className="w-full"
              disabled={uploadMutation.isPending}
              data-testid="button-submit-document"
            >
              {uploadMutation.isPending ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
                  Uploading Document...
                </>
              ) : (
                'Save Document'
              )}
            </Button>
          </form>
        </CollapsibleContent>
      </Collapsible>

      {documents && documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Your Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {documents.map((doc) => (
                <Card key={doc.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold" data-testid={`text-document-name-${doc.id}`}>
                          {doc.title}
                        </h4>
                        <span className="text-xs px-2 py-1 bg-muted rounded-full">
                          {doc.type.replace('_', ' ')}
                        </span>
                      </div>
                      {doc.description && (
                        <p className="text-sm text-muted-foreground">{doc.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {doc.issueDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Issued: {new Date(doc.issueDate).toLocaleDateString()}
                          </div>
                        )}
                        {doc.expiryDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Expires: {new Date(doc.expiryDate).toLocaleDateString()}
                          </div>
                        )}
                        {doc.amount && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {doc.amount}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(doc.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-document-${doc.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {documentsQuery.isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      )}
    </div>
  );
}
