"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import {
  Upload,
  FileText,
  FileSpreadsheet,
  File,
  Grid3X3,
  List,
  Search,
  Trash2,
  Eye,
  MessageSquare,
  Download,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  FolderOpen,
  Plus,
  ChevronRight,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDocuments } from "@/hooks/use-documents";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDebounce } from "@/hooks/use-debounce";
import { formatDate, formatRelativeDate } from "@/lib/utils";
import type { Document } from "@/types";

const FILE_TYPE_CONFIG: Record<
  string,
  { icon: typeof FileText; color: string; bg: string }
> = {
  pdf: { icon: FileText, color: "text-red-400", bg: "bg-red-500/10" },
  docx: { icon: File, color: "text-blue-400", bg: "bg-blue-500/10" },
  doc: { icon: File, color: "text-blue-400", bg: "bg-blue-500/10" },
  csv: { icon: FileSpreadsheet, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  xlsx: { icon: FileSpreadsheet, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  xls: { icon: FileSpreadsheet, color: "text-emerald-400", bg: "bg-emerald-500/10" },
};

function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface UploadProgress {
  file: File;
  progress: number;
  status: "uploading" | "done" | "error";
}

interface DocumentViewerProps {
  document: Document;
  onClose: () => void;
  isAsking: boolean;
  askResult: { answer: string; citations: { id: string; source: string; page?: number; text: string; relevance: number }[] } | undefined;
  onAsk: (question: string) => void;
}

function DocumentViewer({
  document: doc,
  onClose,
  isAsking,
  askResult,
  onAsk,
}: DocumentViewerProps) {
  const [question, setQuestion] = useState("");
  const ext = getFileExtension(doc.filename);
  const config = FILE_TYPE_CONFIG[ext] || FILE_TYPE_CONFIG.pdf;

  const handleAsk = () => {
    if (!question.trim()) return;
    onAsk(question.trim());
    setQuestion("");
  };

  return (
    <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
      <DialogHeader>
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${config.bg}`}>
            <config.icon className={`h-5 w-5 ${config.color}`} />
          </div>
          <div>
            <DialogTitle className="text-left">{doc.filename}</DialogTitle>
            <DialogDescription>
              Uploaded {formatDate(doc.createdAt)} · {formatFileSize(doc.fileSize)} · {doc.chunkCount} chunks
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto space-y-4 mt-2">
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Status</span>
              <div className="mt-1">
                <StatusBadge status={doc.status} />
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Type</span>
              <p className="mt-1 font-medium uppercase text-foreground">{ext}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Size</span>
              <p className="mt-1 font-medium text-foreground">{formatFileSize(doc.fileSize)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Chunks</span>
              <p className="mt-1 font-medium text-foreground">{doc.chunkCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
          <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-emerald-400" />
            Ask a Question
          </h4>
          <div className="flex gap-2">
            <Input
              placeholder="Ask anything about this document..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              disabled={isAsking}
            />
            <Button onClick={handleAsk} disabled={isAsking || !question.trim()} size="sm">
              {isAsking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ask"}
            </Button>
          </div>

          {askResult && (
            <div className="mt-4 space-y-3">
              <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-4">
                <p className="text-sm text-foreground leading-relaxed">{askResult.answer}</p>
              </div>
              {askResult.citations.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">Sources</span>
                  {askResult.citations.map((citation) => (
                    <div key={citation.id} className="rounded-lg bg-white/[0.03] px-3 py-2 text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px] py-0">{citation.source}</Badge>
                        {citation.page && <span className="text-muted-foreground/60">p. {citation.page}</span>}
                      </div>
                      <p className="text-muted-foreground">{citation.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <Button variant="outline" className="w-full gap-2" size="sm">
          <Download className="h-4 w-4" />
          Download Extracted Text
        </Button>
      </div>
    </DialogContent>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "processing") {
    return (
      <Badge variant="warning" className="gap-1.5">
        <Loader2 className="h-3 w-3 animate-spin" />
        Processing
      </Badge>
    );
  }
  if (status === "ready") {
    return (
      <Badge variant="success" className="gap-1.5">
        <CheckCircle2 className="h-3 w-3" />
        Ready
      </Badge>
    );
  }
  return (
    <Badge variant="danger" className="gap-1.5">
      <XCircle className="h-3 w-3" />
      Error
    </Badge>
  );
}

function DocumentCard({
  doc,
  viewMode,
  onView,
  onAsk,
  onDelete,
  isDeleting,
}: {
  doc: Document;
  viewMode: "grid" | "list";
  onView: () => void;
  onAsk: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const ext = getFileExtension(doc.filename);
  const config = FILE_TYPE_CONFIG[ext] || FILE_TYPE_CONFIG.pdf;

  if (viewMode === "list") {
    return (
      <div className="group flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 hover:border-emerald-500/20 hover:bg-white/[0.04] transition-all">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${config.bg}`}>
          <config.icon className={`h-5 w-5 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{doc.filename}</p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-muted-foreground">{formatRelativeDate(doc.createdAt)}</span>
            <span className="text-xs text-muted-foreground/40">·</span>
            <span className="text-xs text-muted-foreground">{formatFileSize(doc.fileSize)}</span>
            <span className="text-xs text-muted-foreground/40">·</span>
            <span className="text-xs text-muted-foreground">{doc.chunkCount} chunks</span>
          </div>
        </div>
        <StatusBadge status={doc.status} />
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onView}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onAsk}>
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={onDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex flex-col rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-emerald-500/20 hover:bg-white/[0.04] transition-all overflow-hidden">
      <div className="flex items-center justify-center h-28 bg-white/[0.02] border-b border-white/[0.06]">
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${config.bg}`}>
          <config.icon className={`h-7 w-7 ${config.color}`} />
        </div>
      </div>
      <div className="flex-1 p-3 space-y-2">
        <p className="truncate text-sm font-medium text-foreground">{doc.filename}</p>
        <div className="flex items-center justify-between">
          <StatusBadge status={doc.status} />
          <span className="text-xs text-muted-foreground">{formatFileSize(doc.fileSize)}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground/60">
          <span>{formatRelativeDate(doc.createdAt)}</span>
          <span>{doc.chunkCount} chunks</span>
        </div>
      </div>
      <div className="flex border-t border-white/[0.06]">
        <button onClick={onView} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.03] transition-colors">
          <Eye className="h-3.5 w-3.5" />
          View
        </button>
        <button onClick={onAsk} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.03] transition-colors border-x border-white/[0.06]">
          <MessageSquare className="h-3.5 w-3.5" />
          Ask
        </button>
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
}

function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/20">
        <FolderOpen className="h-10 w-10 text-emerald-400/70" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">No documents yet</h3>
      <p className="max-w-sm text-sm text-muted-foreground leading-relaxed">
        Upload financial documents to extract insights, answer questions, and perform AI-powered analysis.
      </p>
      <Button onClick={onUpload} className="mt-6 gap-2" size="lg">
        <Upload className="h-4 w-4" />
        Upload Documents
      </Button>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <Skeleton className="h-28 w-full" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <div className="flex justify-between">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-4 w-12" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-14" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export default function DocumentsPage() {
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerMode, setViewerMode] = useState<"view" | "ask">("view");
  const [uploadQueue, setUploadQueue] = useState<UploadProgress[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    documents,
    total,
    isLoadingDocuments,
    uploadDocument,
    deleteDocument,
    askDocument,
    isUploading,
    isDeleting,
    isAsking,
    askResult,
  } = useDocuments();

  const filteredDocs = useMemo(() => {
    let result = documents;
    if (debouncedSearch) {
      result = result.filter((d: Document) =>
        d.filename.toLowerCase().includes(debouncedSearch.toLowerCase())
      );
    }
    if (filterType !== "all") {
      result = result.filter((d: Document) => getFileExtension(d.filename) === filterType);
    }
    if (filterStatus !== "all") {
      result = result.filter((d: Document) => d.status === filterStatus);
    }
    return result;
  }, [documents, debouncedSearch, filterType, filterStatus]);

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const validFiles = fileArray.filter((f) => {
        const ext = getFileExtension(f.name);
        return ["pdf", "docx", "csv", "xlsx", "xls"].includes(ext);
      });

      if (validFiles.length === 0) return;

      const newUploads: UploadProgress[] = validFiles.map((file) => ({
        file,
        progress: 0,
        status: "uploading" as const,
      }));

      setUploadQueue((prev) => [...prev, ...newUploads]);

      validFiles.forEach((file, index) => {
        const uploadIndex = uploadQueue.length + index;
        uploadDocument(file, {
          onSuccess: () => {
            setUploadQueue((prev) =>
              prev.map((u, i) =>
                i === uploadIndex ? { ...u, progress: 100, status: "done" } : u
              )
            );
            setTimeout(() => {
              setUploadQueue((prev) => prev.filter((_, i) => i !== uploadIndex));
            }, 2000);
          },
          onError: () => {
            setUploadQueue((prev) =>
              prev.map((u, i) =>
                i === uploadIndex ? { ...u, status: "error" } : u
              )
            );
          },
        });
      });
    },
    [uploadDocument, uploadQueue.length]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleViewDoc = (doc: Document) => {
    setSelectedDoc(doc);
    setViewerMode("view");
    setViewerOpen(true);
  };

  const handleAskDoc = (doc: Document) => {
    setSelectedDoc(doc);
    setViewerMode("ask");
    setViewerOpen(true);
  };

  const handleDeleteDoc = (docId: string) => {
    deleteDocument(docId);
  };

  const handleAsk = (question: string) => {
    if (!selectedDoc) return;
    askDocument({ documentId: selectedDoc.id, data: { question } });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Documents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total} document{total !== 1 ? "s" : ""} uploaded
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            className="h-9 w-9"
          >
            {viewMode === "grid" ? (
              <List className="h-4 w-4" />
            ) : (
              <Grid3X3 className="h-4 w-4" />
            )}
          </Button>
          <Button onClick={() => fileInputRef.current?.click()} className="gap-2" size="sm">
            <Upload className="h-4 w-4" />
            Upload
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
          isDragOver
            ? "border-emerald-500/50 bg-emerald-500/5"
            : "border-white/[0.12] hover:border-white/[0.2]"
        }`}
      >
        <Upload className={`mx-auto h-8 w-8 mb-3 ${isDragOver ? "text-emerald-400" : "text-muted-foreground/40"}`} />
        <p className="text-sm text-muted-foreground">
          {isDragOver ? (
            <span className="text-emerald-400 font-medium">Drop files here</span>
          ) : (
            <>
              Drag & drop files here or{" "}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
              >
                browse
              </button>
            </>
          )}
        </p>
        <p className="mt-1 text-xs text-muted-foreground/50">
          PDF, DOCX, CSV, XLSX up to 10MB
        </p>
      </div>

      {uploadQueue.length > 0 && (
        <div className="space-y-2">
          {uploadQueue.map((upload, i) => (
            <div
              key={`${upload.file.name}-${i}`}
              className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3"
            >
              <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm text-foreground">{upload.file.name}</p>
                {upload.status === "uploading" && (
                  <Progress value={upload.progress} className="mt-2 h-1.5" />
                )}
              </div>
              {upload.status === "done" && (
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              )}
              {upload.status === "error" && (
                <XCircle className="h-5 w-5 text-destructive shrink-0" />
              )}
              {upload.status === "uploading" && (
                <Loader2 className="h-5 w-5 text-muted-foreground animate-spin shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex-1 w-full sm:w-auto">
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="h-4 w-4" />}
            className="h-9"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[120px] h-9">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="docx">DOCX</SelectItem>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="xlsx">XLSX</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoadingDocuments ? (
        <LoadingGrid />
      ) : filteredDocs.length === 0 ? (
        searchQuery || filterType !== "all" || filterStatus !== "all" ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-foreground">No documents found</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or search query</p>
          </div>
        ) : (
          <EmptyState onUpload={() => fileInputRef.current?.click()} />
        )
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDocs.map((doc: Document) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              viewMode="grid"
              onView={() => handleViewDoc(doc)}
              onAsk={() => handleAskDoc(doc)}
              onDelete={() => handleDeleteDoc(doc.id)}
              isDeleting={isDeleting}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredDocs.map((doc: Document) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              viewMode="list"
              onView={() => handleViewDoc(doc)}
              onAsk={() => handleAskDoc(doc)}
              onDelete={() => handleDeleteDoc(doc.id)}
              isDeleting={isDeleting}
            />
          ))}
        </div>
      )}

      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        {selectedDoc && (
          <DocumentViewer
            document={selectedDoc}
            onClose={() => setViewerOpen(false)}
            isAsking={isAsking}
            askResult={askResult}
            onAsk={handleAsk}
          />
        )}
      </Dialog>
    </div>
  );
}
