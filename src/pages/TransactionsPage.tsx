import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Download,
  FileSpreadsheet,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { SAMPLE_UPLOAD_CSV } from '../data/demoData';
import {
  ALL_CATEGORIES,
  ParsedTransactionDraft,
  Transaction,
  TransactionCategory,
  UploadedDocumentRecord,
  UserProfile,
} from '../types/finance';
import { formatCurrency } from '../utils/currency';
import { parseCsvTransactions, parseXlsxTransactions } from '../utils/documentParser';

interface TransactionsPageProps {
  profile: UserProfile;
  transactions: Transaction[];
  documents: UploadedDocumentRecord[];
  onParsePdf: (fileName: string, base64Data: string) => Promise<ParsedTransactionDraft[]>;
  onConfirmImport: (payload: {
    fileName: string;
    fileType: 'csv' | 'xlsx' | 'pdf';
    totalRows: number;
    transactions: ParsedTransactionDraft[];
  }) => Promise<void>;
  onUpdateCategory: (id: string, category: TransactionCategory) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
}

export const TransactionsPage: React.FC<TransactionsPageProps> = ({
  profile,
  transactions,
  documents,
  onParsePdf,
  onConfirmImport,
  onUpdateCategory,
  onDeleteTransaction,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [drafts, setDrafts] = useState<ParsedTransactionDraft[]>([]);
  const [pendingFileMeta, setPendingFileMeta] = useState<{
    fileName: string;
    fileType: 'csv' | 'xlsx' | 'pdf';
  } | null>(null);
  const [processingMsg, setProcessingMsg] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [onlyUncertain, setOnlyUncertain] = useState(false);

  const cur = profile.currency;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);
    let combinedDrafts: ParsedTransactionDraft[] = [];
    let lastMeta: { fileName: string; fileType: 'csv' | 'xlsx' | 'pdf' } | null = null;

    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      try {
        if (ext === 'csv') {
          setProcessingMsg(`Parsing ${file.name}...`);
          const text = await file.text();
          const parsed = parseCsvTransactions(text, [...transactions, ...combinedDrafts] as Transaction[]);
          combinedDrafts = [...combinedDrafts, ...parsed];
          lastMeta = { fileName: file.name, fileType: 'csv' };
        } else if (ext === 'xlsx' || ext === 'xls') {
          setProcessingMsg(`Reading workbook ${file.name}...`);
          const buf = await file.arrayBuffer();
          const parsed = parseXlsxTransactions(buf, [...transactions, ...combinedDrafts] as Transaction[]);
          combinedDrafts = [...combinedDrafts, ...parsed];
          lastMeta = { fileName: file.name, fileType: 'xlsx' };
        } else if (ext === 'pdf') {
          setProcessingMsg(`Extracting transactions from PDF ${file.name}...`);
          const buf = await file.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);
          const parsed = await onParsePdf(file.name, base64);
          combinedDrafts = [...combinedDrafts, ...parsed];
          lastMeta = { fileName: file.name, fileType: 'pdf' };
        } else {
          setUploadError(`Unsupported format for ${file.name}. Please upload CSV, XLSX, or PDF.`);
        }
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : `Failed to parse ${file.name}.`);
      }
    }

    setProcessingMsg(null);
    if (combinedDrafts.length > 0 && lastMeta) {
      setDrafts(combinedDrafts);
      setPendingFileMeta(lastMeta);
    } else if (!uploadError) {
      setUploadError('No recognizable transaction rows were found in the uploaded document(s).');
    }
  };

  const loadSampleStatement = () => {
    setUploadError(null);
    const parsed = parseCsvTransactions(SAMPLE_UPLOAD_CSV, transactions);
    setDrafts(parsed);
    setPendingFileMeta({
      fileName: 'sample_november_statement.csv',
      fileType: 'csv',
    });
  };

  const downloadSampleCsv = () => {
    const blob = new Blob([SAMPLE_UPLOAD_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aurion_sample_statement.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirm = async () => {
    const selected = drafts.filter((d) => d.selected);
    if (selected.length === 0 || !pendingFileMeta) return;
    setProcessingMsg('Importing confirmed transactions...');
    await onConfirmImport({
      fileName: pendingFileMeta.fileName,
      fileType: pendingFileMeta.fileType,
      totalRows: drafts.length,
      transactions: selected,
    });
    setProcessingMsg(null);
    setDrafts([]);
    setPendingFileMeta(null);
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (categoryFilter !== 'ALL' && tx.category !== categoryFilter) return false;
      if (onlyUncertain && tx.confidence !== 'low') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          tx.merchant.toLowerCase().includes(q) ||
          tx.description.toLowerCase().includes(q) ||
          tx.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [transactions, categoryFilter, onlyUncertain, searchQuery]);

  const uncertainCount = transactions.filter((t) => t.confidence === 'low').length;

  return (
    <div className="space-y-6">
      {/* Document Upload Dropzone */}
      <div className="bg-white rounded-2xl border border-[#E5E1D8] p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#202321]">
              Upload Financial Statements
            </h2>
            <p className="text-xs text-[#5C635E] mt-1">
              Supports single or multiple CSV, XLSX, and PDF bank statements. Extracted rows are
              reviewed before importing so duplicates and uncertain descriptions are caught first.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={downloadSampleCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F6F4EF] border border-[#E2DED4] text-xs font-medium text-[#202321] hover:bg-[#EAE6DC]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Sample CSV</span>
            </button>
            <button
              type="button"
              onClick={loadSampleStatement}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#183B32] text-white text-xs font-semibold hover:bg-[#122D26]"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Test Sample CSV Upload</span>
            </button>
          </div>
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
          className="border-2 border-dashed border-[#D5D1C5] hover:border-[#183B32] rounded-2xl p-6 text-center bg-[#FAF9F6] transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".csv,.xlsx,.xls,.pdf"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = '';
            }}
            className="hidden"
          />
          <Upload className="w-6 h-6 text-[#183B32] mx-auto mb-2" />
          <p className="text-sm font-medium text-[#202321]">
            Drag and drop CSV, Excel (.xlsx), or PDF statements here
          </p>
          <p className="text-xs text-[#5C635E] mt-1 mb-3">
            No bank logins or card PINs required
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded-xl bg-white border border-[#DFDBD0] text-xs font-semibold text-[#183B32] hover:bg-[#EBF0E9]"
          >
            Browse Files
          </button>
        </div>

        {processingMsg && (
          <div className="mt-4 p-3 rounded-xl bg-[#EBF0E9] text-xs font-medium text-[#183B32]">
            {processingMsg}
          </div>
        )}
        {uploadError && (
          <div
            role="alert"
            className="mt-4 p-3 rounded-xl bg-[#FDF2F2] border border-[#F3C6C6] text-xs text-[#991B1B]"
          >
            {uploadError}
          </div>
        )}
      </div>

      {/* Extraction Review & Confirmation Staging Table */}
      {drafts.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-[#183B32] p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-base font-semibold text-[#202321]">
                Review Extracted Transactions ({drafts.filter((d) => d.selected).length} of{' '}
                {drafts.length} selected)
              </h3>
              <p className="text-xs text-[#5C635E] mt-0.5">
                Source: {pendingFileMeta?.fileName} · Possible duplicates are unchecked automatically;
                amber rows need category confirmation.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setDrafts([]);
                  setPendingFileMeta(null);
                }}
                className="px-3.5 py-2 rounded-xl border border-[#DFDBD0] text-xs font-medium text-[#5C635E] hover:text-[#202321]"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={drafts.filter((d) => d.selected).length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#183B32] text-white text-xs font-semibold hover:bg-[#122D26] disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm & Import Selected</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#EAE7DF] text-[#5C635E]">
                  <th className="py-2.5 pr-3">Import</th>
                  <th className="py-2.5 pr-3">Date</th>
                  <th className="py-2.5 pr-3">Description / Merchant</th>
                  <th className="py-2.5 pr-3">Category (Editable)</th>
                  <th className="py-2.5 pr-3">Status</th>
                  <th className="py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1EFE9]">
                {drafts.map((d) => (
                  <tr
                    key={d.tempId}
                    className={
                      d.isDuplicate
                        ? 'bg-[#FDF2F2]/60'
                        : d.confidence === 'low'
                        ? 'bg-[#FEF9EC]'
                        : ''
                    }
                  >
                    <td className="py-2.5 pr-3">
                      <input
                        type="checkbox"
                        checked={d.selected}
                        aria-label={`Select transaction ${d.merchant}`}
                        onChange={(e) =>
                          setDrafts((prev) =>
                            prev.map((item) =>
                              item.tempId === d.tempId
                                ? { ...item, selected: e.target.checked }
                                : item
                            )
                          )
                        }
                      />
                    </td>
                    <td className="py-2.5 pr-3 font-mono-num whitespace-nowrap">{d.date}</td>
                    <td className="py-2.5 pr-3">
                      <div className="font-medium text-[#202321]">{d.merchant}</div>
                      <div className="text-[11px] text-[#5C635E] truncate max-w-[260px]">
                        {d.description}
                      </div>
                    </td>
                    <td className="py-2.5 pr-3">
                      <select
                        value={d.category}
                        aria-label={`Category for ${d.merchant}`}
                        onChange={(e) =>
                          setDrafts((prev) =>
                            prev.map((item) =>
                              item.tempId === d.tempId
                                ? {
                                    ...item,
                                    category: e.target.value as TransactionCategory,
                                    confidence: 'high',
                                  }
                                : item
                            )
                          )
                        }
                        className="px-2.5 py-1.5 rounded-lg border border-[#DFDBD0] bg-white text-xs text-[#202321]"
                      >
                        {ALL_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 pr-3">
                      {d.isDuplicate ? (
                        <span className="text-[#991B1B] font-medium">Possible Duplicate</span>
                      ) : d.confidence === 'low' ? (
                        <span className="text-[#92400E] font-medium">Low Confidence · Review</span>
                      ) : d.isRecurring ? (
                        <span className="text-[#183B32] font-medium">Recurring</span>
                      ) : (
                        <span className="text-[#5C635E]">Ready</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right font-mono-num font-semibold whitespace-nowrap">
                      {d.type === 'income' ? '+' : '−'}
                      {formatCurrency(d.amount, cur)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Uploaded Documents Log */}
      {documents.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E5E1D8] p-5">
          <h3 className="font-display text-sm font-semibold text-[#202321] mb-3">
            Uploaded Statement History ({documents.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#EAE7DF] text-xs"
              >
                <div className="font-semibold text-[#202321] truncate">{doc.fileName}</div>
                <div className="text-[#5C635E] mt-1">
                  {doc.fileType.toUpperCase()} · {doc.importedCount} imported of {doc.rowCount} rows
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Searchable Transaction Ledger */}
      <div className="bg-white rounded-2xl border border-[#E5E1D8] p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-base font-semibold text-[#202321]">
              Transaction Ledger ({filteredTransactions.length})
            </h3>
            {uncertainCount > 0 && (
              <p className="text-xs text-[#92400E] inline-flex items-center gap-1 mt-0.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{uncertainCount} transaction(s) have low categorization confidence.</span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#5C635E] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search merchant or description..."
                aria-label="Search transactions"
                className="pl-8 pr-3 py-2 rounded-xl border border-[#DFDBD0] bg-[#FAF9F6] text-xs text-[#202321] focus:outline-none focus:ring-2 focus:ring-[#183B32]"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by category"
              className="px-3 py-2 rounded-xl border border-[#DFDBD0] bg-[#FAF9F6] text-xs text-[#202321]"
            >
              <option value="ALL">All Categories</option>
              {ALL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setOnlyUncertain((v) => !v)}
              className={`px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${
                onlyUncertain
                  ? 'bg-[#183B32] text-white border-[#183B32]'
                  : 'bg-[#FAF9F6] text-[#202321] border-[#DFDBD0]'
              }`}
            >
              Needs Review ({uncertainCount})
            </button>
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="py-10 text-center text-sm text-[#5C635E]">
            No transactions match your current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#EAE7DF] text-[#5C635E]">
                  <th className="py-2.5 pr-3">Date</th>
                  <th className="py-2.5 pr-3">Merchant & Description</th>
                  <th className="py-2.5 pr-3">Category</th>
                  <th className="py-2.5 pr-3">Source</th>
                  <th className="py-2.5 pr-3 text-right">Amount</th>
                  <th className="py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1EFE9]">
                {filteredTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className={tx.confidence === 'low' ? 'bg-[#FEF9EC]' : 'hover:bg-[#FAF9F6]'}
                  >
                    <td className="py-3 pr-3 font-mono-num whitespace-nowrap">{tx.date}</td>
                    <td className="py-3 pr-3">
                      <div className="font-medium text-[#202321]">
                        {tx.merchant}
                        {tx.isRecurring ? ' · Recurring' : ''}
                      </div>
                      <div className="text-[11px] text-[#5C635E] truncate max-w-[280px]">
                        {tx.description}
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <select
                        value={tx.category}
                        aria-label={`Change category for ${tx.merchant}`}
                        onChange={(e) =>
                          onUpdateCategory(tx.id, e.target.value as TransactionCategory)
                        }
                        className="px-2.5 py-1.5 rounded-lg border border-[#DFDBD0] bg-white text-xs text-[#202321]"
                      >
                        {ALL_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      {tx.confidence === 'low' && (
                        <div className="text-[10px] text-[#92400E] mt-0.5">Uncertain · Confirm</div>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-[#5C635E]">
                      {tx.isSyntheticDemo ? 'Synthetic Demo' : tx.sourceDocument || 'Uploaded'}
                    </td>
                    <td
                      className={`py-3 pr-3 text-right font-mono-num font-semibold whitespace-nowrap ${
                        tx.type === 'income' ? 'text-[#183B32]' : 'text-[#202321]'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '−'}
                      {formatCurrency(tx.amount, cur)}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteTransaction(tx.id)}
                        aria-label={`Delete transaction ${tx.merchant}`}
                        className="p-1.5 rounded-lg text-[#5C635E] hover:text-[#991B1B] hover:bg-[#FDF2F2]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
