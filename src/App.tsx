import { useState, useEffect, useRef } from "react";
import { 
  Download, 
  Copy, 
  Check, 
  AlertCircle, 
  BookOpen, 
  Cpu, 
  Layers, 
  Send, 
  Terminal, 
  Sliders, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  CheckCircle,
  FileCode,
  ArrowRight,
  Info,
  Table,
  RefreshCw
} from "lucide-react";
import { generateTdlCode, getModificationDetails, TdlConfig, cleanId } from "./tdlGenerator";

interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export default function App() {
  // Configuration State
  const [fieldName, setFieldName] = useState("Driver Name");
  const [voucherType, setVoucherType] = useState<TdlConfig["voucherType"]>("Sales Invoice");
  const [position, setPosition] = useState<TdlConfig["position"]>("Party Details");
  const [dataType, setDataType] = useState<TdlConfig["dataType"]>("String");
  const [udfIndex, setUdfIndex] = useState(1001);
  const [includeReport, setIncludeReport] = useState(true);
  const [reportType, setReportType] = useState<TdlConfig["reportType"]>("Sales Register");

  // App UI State
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"explanation" | "loading" | "troubleshooting">("explanation");
  const [troubleOpenId, setTroubleOpenId] = useState<number | null>(1); // Open first by default

  // Chat/AI State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "model",
      text: "Welcome to TDL Developer Studio! I can instantly modify this code—for example, making the custom field mandatory, adding dropdown list tables, or troubleshooting Tally Prime compiler warnings. Ask me any question or click a preset below!"
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-align report types with voucher types
  useEffect(() => {
    if (voucherType === "Sales Invoice") {
      setReportType("Sales Register");
    } else if (voucherType === "Purchase Invoice") {
      setReportType("Purchase Register");
    } else {
      setReportType("Day Book");
    }
  }, [voucherType]);

  // Generate TDL based on configurations
  const currentConfig: TdlConfig = {
    fieldName,
    voucherType,
    position,
    dataType,
    udfIndex,
    includeReport,
    reportType
  };

  const generatedTdl = generateTdlCode(currentConfig);
  const modificationDetails = getModificationDetails(currentConfig);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Copy code utility
  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedTdl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download TDL file utility
  const handleDownloadCode = () => {
    const cleanName = cleanId(fieldName).toLowerCase();
    const filename = `tally_udf_${cleanName}.tdl`;
    const element = document.createElement("a");
    const file = new Blob([generatedTdl], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Chat Submission Handler
  const handleSendMessage = async (textToSend?: string) => {
    const input = textToSend || chatInput;
    if (!input.trim() || isGenerating) return;

    const userMessage: ChatMessage = { role: "user", text: input };
    setChatMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setChatInput("");
    setIsGenerating(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          currentCode: generatedTdl,
          history: chatMessages.slice(-8)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to communicate with AI server.");
      }

      const data = await response.json();
      setChatMessages((prev) => [...prev, { role: "model", text: data.text }]);
    } catch (err: any) {
      console.error(err);
      setChatMessages((prev) => [
        ...prev,
        { 
          role: "model", 
          text: `⚠️ **Error:** ${err.message || "Failed to contact the helper assistant. Please check your network or try again."}` 
        }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Preset prompts
  const chatPresets = [
    {
      title: "Make Field Mandatory",
      prompt: "How can I make this custom field mandatory so that the voucher cannot be saved without entering a value?"
    },
    {
      title: "Create Dropdown List Table",
      prompt: "How can I add a list of pre-defined options (like a list of drivers or vehicle types) to choose from?"
    },
    {
      title: "Add Field to Printout",
      prompt: "How do I print this custom field on the default invoice printing formats?"
    },
    {
      title: "Fix 'Duplicate UDF Index'",
      prompt: "I got a compiler error saying 'Duplicate Definition of System UDF'. How do I resolve this?"
    }
  ];

  // Troubleshooting FAQs
  const troubleshootingFaqs = [
    {
      id: 1,
      title: "Error: 'Duplicate UDF definition / Index mismatch'",
      solution: "This occurs if another custom TDL or third-party add-on already registered the same UDF Index Number or UDF Identifier. Try changing the UDF Index Number in the configuration panel (e.g., from 1001 to 5005) or slightly modifying your field name to avoid collisions."
    },
    {
      id: 2,
      title: "Error: 'Part: EI PartyDetails does not exist'",
      solution: "In some older Tally ERP or highly customized TallyPrime releases, supplementary invoice detail parts might have different names. For Sales Invoices, ensure you are editing '#Part: EI PartyDetails' or try placing it on the Voucher Header (which targets '#Part: VCH Top Right'), as those are globally standard across Tally installations."
    },
    {
      id: 3,
      title: "Why is the entered text not saving when I reopen the voucher?",
      solution: "This usually happens if the 'Storage' property of the [Field: ...] definition is missing or is misspelled compared to your declared System UDF. Ensure that the 'Storage' parameter exactly matches the declared name in [System: UDF] at the top of your TDL file. Double check spelling and capitalization."
    },
    {
      id: 4,
      title: "Field is displayed but doesn't let me type anything.",
      solution: "In TDL, a field may be in read-only/display mode if it inherits properties from a read-only template or missing variable references. Adding the attribute 'Type: String' or 'Use: Name Field' directly in your [Field: ...] definition establishes it as an active input block. Also ensure you don't have 'Set Always: Yes' overriding user keystrokes without storage mapping."
    }
  ];

  // Dynamic Mock Rows for Column Register based on chosen Data Type & Field Name
  const getMockRowValues = (): [string, string] => {
    const labelLower = fieldName.toLowerCase();
    if (dataType === "Number") {
      return ["42", "118"];
    }
    if (dataType === "Date") {
      return ["12-Jul-2026", "13-Jul-2026"];
    }
    if (dataType === "Amount") {
      return ["₹ 15,400.00", "₹ 8,920.00"];
    }
    // String - specialize on common concepts
    if (labelLower.includes("driver")) {
      return ["Robert M. Jenkins", "Samuel Peters"];
    }
    if (labelLower.includes("vehicle") || labelLower.includes("truck") || labelLower.includes("car")) {
      return ["MH-12-PQ-4567", "DL-03-AB-8899"];
    }
    if (labelLower.includes("agent") || labelLower.includes("salesman")) {
      return ["Vikram Malhotra", "Ananya Sen"];
    }
    if (labelLower.includes("loc") || labelLower.includes("destination") || labelLower.includes("route")) {
      return ["Mumbai Hub", "Delhi Warehouse"];
    }
    return [`Entered ${fieldName} A`, `Entered ${fieldName} B`];
  };

  const [rowVal1, rowVal2] = getMockRowValues();

  return (
    <div className="min-h-screen bg-[#1e293b] text-slate-300 font-sans flex flex-col overflow-x-hidden selection:bg-[#00A86B]/30 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="h-12 bg-[#0f172a] border-b border-slate-700 flex items-center justify-between px-4 shrink-0 sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-[#00A86B] rounded flex items-center justify-center font-bold text-white text-xs shadow-sm">
            T
          </div>
          <h1 className="text-xs sm:text-sm font-semibold tracking-tight text-white flex items-center gap-1.5">
            TallyPrime TDL Developer Studio 
            <span className="text-slate-500 font-normal hidden sm:inline">| v4.1.2 Compliant</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5 text-[11px] bg-slate-800/80 px-2.5 py-1 rounded border border-slate-700">
            <span className="w-2 h-2 rounded-full bg-green-400"></span>
            Build Status: <span className="text-green-400 font-semibold">Active & Live</span>
          </div>
          <button 
            onClick={handleDownloadCode}
            className="bg-[#00A86B] hover:bg-green-600 active:bg-green-700 text-white text-[11px] font-bold px-3 py-1 rounded transition duration-150 flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3 h-3" />
            DEPLOY TO TALLY
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left Area (8 cols): Config + Editor + Details */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          
          {/* Card: Configuration Panel */}
          <section className="bg-[#0f172a] rounded-lg border border-slate-700 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#00A86B]" />
                <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">1. Configure Custom Field Definition</h2>
              </div>
              <span className="text-[10px] text-slate-400 font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                UDF Unique Index ID: {udfIndex}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              
              {/* Field Label Input */}
              <div className="bg-[#1e293b]/50 p-2.5 rounded border border-slate-800">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Field Label Name
                </label>
                <input
                  type="text"
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  className="w-full px-2.5 py-1 text-xs bg-[#1e293b] border border-slate-700 rounded text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#00A86B] focus:border-[#00A86B] font-medium"
                  placeholder="e.g. Driver Name"
                />
                <div className="text-[9px] text-slate-500 mt-1 truncate">
                  UDF Registry Key: <span className="font-mono text-emerald-400">UDF_{cleanId(fieldName)}</span>
                </div>
              </div>

              {/* Voucher Screen Selection */}
              <div className="bg-[#1e293b]/50 p-2.5 rounded border border-slate-800">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Voucher Screen Type
                </label>
                <select
                  value={voucherType}
                  onChange={(e) => setVoucherType(e.target.value as TdlConfig["voucherType"])}
                  className="w-full px-2 py-1 text-xs bg-[#1e293b] border border-slate-700 rounded text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#00A86B] focus:border-[#00A86B] font-medium"
                >
                  <option value="Sales Invoice">Sales Invoice (Standard EI)</option>
                  <option value="Purchase Invoice">Purchase Invoice</option>
                  <option value="Receipt">Receipt Voucher</option>
                  <option value="Payment">Payment Voucher</option>
                  <option value="Delivery Note">Delivery Note / Challan</option>
                </select>
                <div className="text-[9px] text-slate-500 mt-1 truncate">
                  Target Part: <span className="font-mono text-emerald-400">{voucherType === "Receipt" || voucherType === "Payment" ? "VCH PartyDetails" : "EI PartyDetails"}</span>
                </div>
              </div>

              {/* Placement & Area Selection */}
              <div className="bg-[#1e293b]/50 p-2.5 rounded border border-slate-800">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Visual Placement Area
                </label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value as TdlConfig["position"])}
                  className="w-full px-2 py-1 text-xs bg-[#1e293b] border border-slate-700 rounded text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#00A86B] focus:border-[#00A86B] font-medium"
                >
                  <option value="Party Details">Party supplementary details</option>
                  <option value="Voucher Header">Voucher Header top area</option>
                  <option value="Voucher Footer">Voucher Bottom (above Narration)</option>
                </select>
                <div className="text-[9px] text-slate-500 mt-1 truncate">
                  Visual Layout: <span className="font-mono text-emerald-400">{position}</span>
                </div>
              </div>

              {/* Data Type Selection */}
              <div className="bg-[#1e293b]/50 p-2.5 rounded border border-slate-800">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Field Data Storage Type
                </label>
                <select
                  value={dataType}
                  onChange={(e) => setDataType(e.target.value as TdlConfig["dataType"])}
                  className="w-full px-2 py-1 text-xs bg-[#1e293b] border border-slate-700 rounded text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#00A86B] focus:border-[#00A86B] font-medium"
                >
                  <option value="String">String / Alphanumeric Text</option>
                  <option value="Number">Number / Quantity</option>
                  <option value="Date">Date Field</option>
                  <option value="Amount">Currency / Ledger Amount</option>
                </select>
              </div>

              {/* Registry Index Input */}
              <div className="bg-[#1e293b]/50 p-2.5 rounded border border-slate-800">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  UDF Registry Index (1000 - 9999)
                </label>
                <input
                  type="number"
                  value={udfIndex}
                  onChange={(e) => setUdfIndex(parseInt(e.target.value) || 1001)}
                  min={1000}
                  className="w-full px-2.5 py-1 text-xs bg-[#1e293b] border border-slate-700 rounded text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#00A86B] focus:border-[#00A86B] font-mono"
                />
              </div>

              {/* Toggle switch for Column integration */}
              <div className="bg-[#1e293b]/50 p-2.5 rounded border border-slate-800 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Report Column</span>
                  <span className="text-[9px] text-slate-500">Add to columnar listings</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeReport}
                    onChange={(e) => setIncludeReport(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4.5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#00A86B]"></div>
                </label>
              </div>

            </div>

            {/* Dynamic Column Report Target Selector */}
            {includeReport && (
              <div className="mt-2.5 p-2 bg-[#1e293b]/80 rounded border border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-[#00A86B]" />
                  Active Columnar Register Target:
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setReportType("Sales Register")}
                    disabled={voucherType !== "Sales Invoice"}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded transition ${
                      reportType === "Sales Register"
                        ? "bg-[#00A86B] text-white"
                        : "bg-slate-850 text-slate-400 hover:bg-slate-800 border border-slate-700 disabled:opacity-40"
                    }`}
                  >
                    Sales Register
                  </button>
                  <button
                    onClick={() => setReportType("Purchase Register")}
                    disabled={voucherType !== "Purchase Invoice"}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded transition ${
                      reportType === "Purchase Register"
                        ? "bg-[#00A86B] text-white"
                        : "bg-slate-850 text-slate-400 hover:bg-slate-800 border border-slate-700 disabled:opacity-40"
                    }`}
                  >
                    Purchase Register
                  </button>
                  <button
                    onClick={() => setReportType("Day Book")}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded transition ${
                      reportType === "Day Book"
                        ? "bg-[#00A86B] text-white"
                        : "bg-slate-850 text-slate-400 hover:bg-slate-800 border border-slate-700"
                    }`}
                  >
                    Day Book
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Section: Code Editor Pane */}
          <section className="bg-[#0f172a] rounded-lg border border-slate-700 overflow-hidden shadow-sm flex flex-col flex-1 min-h-[380px]">
            {/* Header tab structure */}
            <div className="bg-[#0a0f1d] border-b border-slate-700 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 bg-[#1e293b] border-t border-x border-slate-700 rounded-t text-white text-[11px] font-mono flex items-center gap-2">
                  <span className="text-yellow-500 text-[9px]">📜</span>
                  custom_field_{cleanId(fieldName).toLowerCase()}.tdl
                </div>
                {includeReport && (
                  <div className="px-3 py-1 text-slate-500 text-[11px] font-mono hidden md:block">
                    {reportType.replace(" ", "_").toLowerCase()}_column.tdl
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded transition flex items-center gap-1"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-green-400" />
                      <span className="text-green-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>COPY CODE</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleDownloadCode}
                  className="px-2 py-1 bg-[#00A86B] hover:bg-green-600 text-white text-[10px] font-bold rounded transition flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>DOWNLOAD</span>
                </button>
              </div>
            </div>

            {/* Code Content Container */}
            <div className="flex-1 p-4 overflow-auto font-mono text-[12px] leading-relaxed text-slate-300 bg-[#0f172a]">
              <pre className="whitespace-pre-wrap select-all">
                {generatedTdl.split("\n").map((line, index) => {
                  let lineClass = "text-slate-400";
                  if (line.startsWith(";;")) {
                    lineClass = "text-slate-500 italic"; // Comments
                  } else if (line.startsWith("[")) {
                    lineClass = "text-teal-400 font-bold"; // Definitions
                  } else if (line.includes(":") && !line.startsWith(" ")) {
                    lineClass = "text-yellow-200"; // Parameters
                  } else if (line.includes("Storage") || line.includes("Use") || line.includes("Fields") || line.includes("Add")) {
                    lineClass = "text-[#00A86B] font-medium"; // TDL operations
                  } else if (line.includes('"')) {
                    lineClass = "text-orange-300"; // Text string values
                  }
                  
                  return (
                    <div key={index} className="flex hover:bg-slate-800/40 px-1 rounded-sm">
                      <span className="w-8 text-slate-600 select-none text-right pr-3">{index + 1}</span>
                      <span className={lineClass}>{line}</span>
                    </div>
                  );
                })}
              </pre>
            </div>

            {/* Footer metadata status */}
            <div className="bg-[#0a0f1d] px-4 py-1.5 border-t border-slate-800 text-[10px] text-slate-500 font-mono flex items-center justify-between">
              <span>Encoding: UTF-8 | Native TDL Standard</span>
              <span>Lines count: {generatedTdl.split("\n").length}</span>
            </div>
          </section>

          {/* Section: Live Tally Register Columnar View */}
          {includeReport && (
            <section className="bg-[#0f172a] rounded-lg border border-slate-700 overflow-hidden shadow-sm">
              <div className="bg-slate-800/60 px-4 py-2 border-b border-slate-700 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-300 tracking-wider uppercase flex items-center gap-1.5">
                  <Table className="w-3.5 h-3.5 text-[#00A86B]" />
                  Interactive Preview: Columnar {reportType}
                </span>
                <span className="text-[9px] text-emerald-400 uppercase font-bold font-mono bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900">
                  Data Persistent via ODBC
                </span>
              </div>
              <div className="p-3.5 bg-[#0a0f1d]">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="text-left text-slate-400 border-b border-slate-700 pb-1">
                      <th className="pb-2 font-semibold">Voucher Date</th>
                      <th className="pb-2 font-semibold">Voucher No</th>
                      <th className="pb-2 font-semibold">Party Ledger Account</th>
                      <th className="pb-2 bg-[#00A86B]/10 text-emerald-400 px-3 font-bold border-l border-r border-[#00A86B]/30 rounded-t">
                        {fieldName} <span className="text-[8px] text-slate-500 font-normal italic">(New Custom Field)</span>
                      </th>
                      <th className="pb-2 text-right font-semibold">Gross Amount</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300 divide-y divide-slate-800/50">
                    <tr className="hover:bg-slate-850/30 transition">
                      <td className="py-2 text-slate-400">12-Jul-2026</td>
                      <td className="py-2 font-mono">INV/26-27/0401</td>
                      <td className="py-2 font-medium">Global Tech Solutions Corp</td>
                      <td className="py-2 bg-[#00A86B]/5 px-3 font-semibold text-white border-l border-r border-[#00A86B]/15">
                        {rowVal1}
                      </td>
                      <td className="py-2 text-right font-mono text-white">₹ 45,000.00</td>
                    </tr>
                    <tr className="hover:bg-slate-850/30 transition">
                      <td className="py-2 text-slate-400">13-Jul-2026</td>
                      <td className="py-2 font-mono">INV/26-27/0402</td>
                      <td className="py-2 font-medium">Acme Industries Private Ltd</td>
                      <td className="py-2 bg-[#00A86B]/5 px-3 font-semibold text-white border-l border-r border-[#00A86B]/15 border-b border-slate-800/20">
                        {rowVal2}
                      </td>
                      <td className="py-2 text-right font-mono text-white">₹ 12,890.00</td>
                    </tr>
                  </tbody>
                </table>
                <div className="text-[10px] text-slate-500 mt-2.5 flex items-center gap-1.5 bg-[#1e293b]/40 p-2 rounded">
                  <Info className="w-3.5 h-3.5 text-[#00A86B]" />
                  <span>
                    When values are entered in the <strong>{fieldName}</strong> field within the {voucherType} entry screen, TallyPrime automatically saves the text or quantity into database registry index <strong>{udfIndex}</strong> and references it inside the row generator line via <code className="text-teal-400 font-mono">$UDF_{cleanId(fieldName)}</code>.
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Card: Guide tabs section */}
          <section className="bg-[#0f172a] rounded-lg border border-slate-700 overflow-hidden shadow-sm">
            <div className="bg-[#0a0f1d] border-b border-slate-700 flex">
              <button
                onClick={() => setActiveTab("explanation")}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition ${
                  activeTab === "explanation"
                    ? "border-[#00A86B] text-white bg-[#0f172a]"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-[#00A86B]" />
                Structure Walkthrough
              </button>
              
              <button
                onClick={() => setActiveTab("loading")}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition ${
                  activeTab === "loading"
                    ? "border-[#00A86B] text-white bg-[#0f172a]"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-[#00A86B]" />
                How to Load in TallyPrime
              </button>

              <button
                onClick={() => setActiveTab("troubleshooting")}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition ${
                  activeTab === "troubleshooting"
                    ? "border-[#00A86B] text-white bg-[#0f172a]"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5 text-[#00A86B]" />
                Troubleshooting FAQs
              </button>
            </div>

            <div className="p-4">
              
              {/* Tab 1: Structure */}
              {activeTab === "explanation" && (
                <div className="space-y-3.5 animate-fadeIn">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    This customization is written in safe object-oriented TDL. Below is a detailed technical analysis of the blocks modified inside Tally database:
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {modificationDetails.map((detail, index) => (
                      <div key={index} className="p-3 bg-[#1e293b]/40 rounded border border-slate-800 hover:border-slate-750 transition">
                        <span className="text-[9px] font-bold tracking-wider text-emerald-400 font-mono bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-900/50 block w-max mb-1.5">
                          {detail.type}
                        </span>
                        <h4 className="text-xs font-bold text-slate-250 font-mono mb-1">{detail.name}</h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed">{detail.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 2: How to Load */}
              {activeTab === "loading" && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#1e293b]/40 p-3 rounded border border-slate-800">
                      <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-[#00A86B] text-white text-[10px] flex items-center justify-center font-bold">1</span>
                        Method A: Live/Interactive Load (Safest)
                      </h3>
                      <ol className="list-decimal list-inside text-xs text-slate-400 space-y-1.5 leading-relaxed">
                        <li>Save the code above into a file named <code className="font-mono bg-slate-800 px-1 py-0.5 rounded text-white">tally_field.tdl</code> on your PC.</li>
                        <li>Launch <strong className="text-slate-300">TallyPrime</strong> and click on <strong className="text-slate-300">F1: Help</strong> in the upper right.</li>
                        <li>Click on <strong className="text-slate-300">TDLs & Add-ons</strong>.</li>
                        <li>Press <strong className="text-slate-300">F4</strong> (Manage Local TDLs).</li>
                        <li>Set <strong className="text-slate-300">"Load selected TDL files on startup"</strong> to <strong className="text-[#00A86B] font-bold">Yes</strong>.</li>
                        <li>Select <strong className="text-slate-300">"Specify Path"</strong> and navigate to your saved folder.</li>
                        <li>Press <strong className="text-slate-300">Ctrl+A</strong> to apply. Custom field will go live immediately!</li>
                      </ol>
                    </div>

                    <div className="bg-[#1e293b]/40 p-3 rounded border border-slate-800">
                      <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-slate-700 text-white text-[10px] flex items-center justify-center font-bold">2</span>
                        Method B: Configuration File (tdl.ini)
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed mb-2">
                        For system administrators deploying to multiple terminal stations:
                      </p>
                      <ol className="list-decimal list-inside text-xs text-slate-400 space-y-1.5 leading-relaxed">
                        <li>Locate TallyPrime install directory (e.g. <code className="font-mono bg-slate-800 text-white px-1 rounded">C:\Program Files\TallyPrime</code>).</li>
                        <li>Open <code className="font-mono bg-slate-800 text-white px-1 rounded">tdl.ini</code> inside Notepad.</li>
                        <li>Add the following file line at the end:</li>
                      </ol>
                      
                      <div className="bg-slate-950 rounded p-2 mt-2 text-[10px] font-mono text-slate-300 border border-slate-800">
                        <span className="text-slate-500 italic block">;; Append to bottom of tdl.ini file:</span>
                        <span className="text-emerald-400">[TDL]</span>
                        <br />
                        tdl = C:\TallyTDL\tally_field_{cleanId(fieldName).toLowerCase()}.tdl
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Troubleshooting */}
              {activeTab === "troubleshooting" && (
                <div className="space-y-3 animate-fadeIn">
                  <p className="text-xs text-slate-400">
                    Interact with common compiler diagnostics and fix guidelines:
                  </p>
                  
                  <div className="space-y-2">
                    {troubleshootingFaqs.map((faq) => (
                      <div key={faq.id} className="border border-slate-800 rounded overflow-hidden">
                        <button
                          onClick={() => setTroubleOpenId(troubleOpenId === faq.id ? null : faq.id)}
                          className="w-full flex items-center justify-between p-2.5 text-left bg-slate-900/60 hover:bg-slate-850/80 transition"
                        >
                          <span className="text-xs font-bold text-slate-200 font-mono flex items-center gap-2">
                            <span className="text-amber-500 font-bold">!</span>
                            {faq.title}
                          </span>
                          {troubleOpenId === faq.id ? (
                            <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                          )}
                        </button>
                        {troubleOpenId === faq.id && (
                          <div className="p-3 bg-slate-950/50 border-t border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                            {faq.solution}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </section>

        </div>

        {/* Right Area (4 cols): AI Customization Assistant */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          
          {/* Card: AI Preset prompts */}
          <section className="bg-[#0f172a] rounded-lg border border-slate-700 p-4 shadow-sm">
            <div className="flex items-center gap-1.5 mb-2.5 pb-1 border-b border-slate-800">
              <Sparkles className="w-4 h-4 text-[#00A86B]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                TDL Feature Enhancements (AI)
              </h2>
            </div>
            
            <p className="text-[11px] text-slate-400 mb-3 leading-normal">
              Directly instruct the assistant to generate customized enhancements for the current field:
            </p>

            <div className="grid grid-cols-1 gap-1.5">
              {chatPresets.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(preset.prompt)}
                  disabled={isGenerating}
                  className="w-full text-left p-2 bg-[#1e293b]/50 hover:bg-emerald-950/20 hover:text-white border border-slate-800 hover:border-emerald-900/60 rounded transition text-xs flex items-center justify-between group disabled:opacity-50"
                >
                  <span className="font-semibold text-slate-300 group-hover:text-emerald-350 truncate">
                    {preset.title}
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-[#00A86B] group-hover:translate-x-0.5 transition shrink-0 ml-1" />
                </button>
              ))}
            </div>
          </section>

          {/* Card: Developer Assistant Chat */}
          <section className="bg-[#0f172a] rounded-lg border border-slate-700 flex flex-col flex-1 min-h-[350px] max-h-[500px] shadow-sm">
            {/* Chat header */}
            <div className="bg-[#0a0f1d] border-b border-slate-700 px-4 py-2.5 flex items-center justify-between rounded-t">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-250">
                  AI Developer Assistant
                </h2>
              </div>
              <button
                onClick={() => setChatMessages([
                  { role: "model", text: "Hello! What TDL customization can I help you implement today?" }
                ])}
                className="text-slate-500 hover:text-slate-300 transition"
                title="Clear conversation"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-auto p-3 space-y-3 text-[11px]">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col max-w-[88%] ${
                    msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-lg leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-[#00A86B] text-white rounded-tr-none"
                        : "bg-[#1e293b] text-slate-300 rounded-tl-none border border-slate-800"
                    }`}
                  >
                    {msg.text.includes("```") ? (
                      <div>
                        {msg.text.split("```").map((chunk, i) => {
                          if (i % 2 === 1) {
                            const lines = chunk.split("\n");
                            const lang = lines[0].trim();
                            const code = lines.slice(1).join("\n");
                            return (
                              <div key={i} className="my-2 bg-slate-950 text-slate-300 font-mono p-2 rounded overflow-x-auto text-[10px] border border-slate-800 select-all">
                                {lang && <span className="text-[9px] text-slate-500 block border-b border-slate-850 pb-1 mb-1">{lang}</span>}
                                <pre>{code}</pre>
                              </div>
                            );
                          }
                          return <span key={i}>{chunk}</span>;
                        })}
                      </div>
                    ) : (
                      <span>{msg.text}</span>
                    )}
                  </div>
                </div>
              ))}
              
              {isGenerating && (
                <div className="flex items-center gap-1.5 text-slate-400 p-2 bg-[#1e293b]/40 border border-slate-800 rounded mr-auto">
                  <div className="w-1 h-1 bg-[#00A86B] rounded-full animate-bounce"></div>
                  <div className="w-1 h-1 bg-[#00A86B] rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1 h-1 bg-[#00A86B] rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  <span className="text-[9px] font-mono ml-1 font-semibold text-emerald-400">Compiling with Gemini AI...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input form */}
            <div className="p-2 border-t border-slate-800 bg-[#0a0f1d] rounded-b">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSendMessage();
                  }}
                  disabled={isGenerating}
                  placeholder="Ask to customize TDL logic..."
                  className="flex-1 px-2.5 py-1.5 text-xs bg-[#1e293b] border border-slate-700 rounded text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#00A86B]"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!chatInput.trim() || isGenerating}
                  className="bg-[#00A86B] hover:bg-green-600 disabled:opacity-50 text-white px-2.5 rounded transition"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </section>

        </div>

      </div>

      {/* Footer disclaimer */}
      <footer className="bg-[#0f172a] border-t border-slate-800 py-3 text-center shrink-0">
        <p className="text-[10px] text-slate-500 font-mono">
          TallyPrime TDL Developer Studio. Code complies with Developer Guidelines and standard ODBC persistence layers.
        </p>
      </footer>
    </div>
  );
}
