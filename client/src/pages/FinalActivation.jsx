import { useRef, useState } from "react";
import { Upload, FileJson, X, AlertTriangle, CheckCircle2, ArrowRight, Layers, Play, RefreshCw, LogOut } from "lucide-react";
import API from "../hooks/useApi";
import md5 from "md5";

const FinalActivation = () => {
    const fileInputRef = useRef(null);

    const [jsonData, setJsonData] = useState(null);
    const [fileName, setFileName] = useState("");

    // Extracted competitor names and validation states
    const [competitors, setCompetitors] = useState([]);
    const [validationResult, setValidationResult] = useState(null);
    const [isValidating, setIsValidating] = useState(false);

    // Step state: 1 = CSV Preview, 2 = Final Transformed Data Preview
    const [currentStep, setCurrentStep] = useState(1);
    const [transformedData, setTransformedData] = useState(null);
    const [isActivating, setIsActivating] = useState(false);
    const [activationResult, setActivationResult] = useState(null);

    // Call backend API to validate against tenant DB ept_competitor_info
    const validateCompetitorsWithBackend = async (competitorList) => {
        if (!competitorList || competitorList.length === 0) {
            setValidationResult(null);
            return;
        }

        setIsValidating(true);
        try {
            // POST /api/products/validatecompetitors (API auto-injects activeStoreId / x-tenant-id and Bearer Token)
            const response = await API.post('/products/validatecompetitors', {
                competitors: competitorList
            });

            setValidationResult(response.data);
        } catch (error) {
            console.error("Competitor validation error:", error);
        } finally {
            setIsValidating(false);
        }
    };

    // Robust CSV Parser supporting commas and newlines inside quotes
    const parseCSV = (text) => {
        const p = [];
        let row = [""];
        let inQuotes = false;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const nextChar = text[i + 1];

            if (char === '"' && inQuotes && nextChar === '"') {
                row[row.length - 1] += '"';
                i++;
            } else if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                row.push("");
            } else if ((char === '\r' || char === '\n') && !inQuotes) {
                if (char === '\r' && nextChar === '\n') i++;
                if (row.length > 1 || row[0] !== "") {
                    p.push(row);
                }
                row = [""];
            } else {
                row[row.length - 1] += char;
            }
        }
        if (row.length > 1 || row[0] !== "") {
            p.push(row);
        }

        if (p.length < 2) return [];

        const headers = p[0].map((h) => h.replace(/^["']|["']$/g, '').trim());

        return p.slice(1).map((values) => {
            return headers.reduce((obj, header, index) => {
                obj[header] = values[index] ? values[index].replace(/^["']|["']$/g, '').trim() : "";
                return obj;
            }, {});
        });
    };

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];

        if (!file) return;
        if (!file.name.startsWith(`${localStorage.getItem("activeStoreId")}`)) {
            alert("please upload file of your store");
            return;
        }

        if (!file.name.endsWith(".csv")) {
            alert("Please upload only a CSV file");
            return;
        }

        setFileName(file.name);
        setCurrentStep(1);
        setTransformedData(null);
        setActivationResult(null);

        const reader = new FileReader();

        reader.onload = (e) => {
            const csvText = e.target.result;
            const parsedData = parseCSV(csvText);

            setJsonData(parsedData);

            // Extract unique product_url_change_competitior_name values
            const extractedNames = parsedData
                .map((row) => row["product_url_change_competitior_name"] || row["product_url_change_competitor_name"])
                .filter(Boolean)
                .map((name) => name.replace(/["\\]/g, "").trim())
                .filter((name) => name.length > 0);

            const uniqueList = Array.from(new Set(extractedNames));
            setCompetitors(uniqueList);

            // Validate against database
            validateCompetitorsWithBackend(uniqueList);
        };

        reader.readAsText(file);
    };

    const handleRemove = () => {
        setJsonData(null);
        setFileName("");
        setCompetitors([]);
        setValidationResult(null);
        setTransformedData(null);
        setActivationResult(null);
        setCurrentStep(1);

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    // Loading state for transformation API
    const [isTransforming, setIsTransforming] = useState(false);

    // Transform imported CSV data into final DB export schema via Backend API
    const handleNextStep = async () => {
        if (!jsonData || !validationResult?.isValid) return;

        setIsTransforming(true);
        try {
            const response = await API.post('/products/transform-final-activation', {
                products: jsonData
            });

            if (response.data?.success) {
                setTransformedData(response.data.data);
                setCurrentStep(2);
            }
        } catch (error) {
            console.error("Backend transformation failed:", error);
            alert("Failed to transform data in backend: " + (error.response?.data?.message || error.message));
        } finally {
            setIsTransforming(false);
        }
    };

    // Run Final Activation directly to database
    const handleRunFinalActivation = async () => {
        if (!jsonData || jsonData.length === 0) return;

        setIsActivating(true);
        setActivationResult(null);
        try {
            const response = await API.post('/products/run-final-activation', {
                products: jsonData
            });

            if (response.data?.success) {
                setActivationResult(response.data);
            }
        } catch (error) {
            console.error("Final activation execution failed:", error);
            alert("Failed to run final activation: " + (error.response?.data?.message || error.message));
        } finally {
            setIsActivating(false);
        }
    };

    const isNextEnabled = Boolean(
        jsonData &&
        jsonData.length > 0 &&
        validationResult &&
        validationResult.isValid === true &&
        !isTransforming
    );

    return (
        <div className="min-h-screen bg-[#f8fafc] p-6">

            {/* Header */}
            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-[#1e293b]">
                        Final Activation
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Upload store CSV, validate database competitor mapping, and generate final activation documents.
                    </p>
                </div>

                {/* Step Navigation Pill */}
                {jsonData && (
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                        <button
                            onClick={() => setCurrentStep(1)}
                            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition ${currentStep === 1
                                ? "bg-[#1e6191] text-white"
                                : "text-slate-600 hover:bg-slate-100"
                                }`}
                        >
                            <FileJson size={14} />
                            1. CSV Preview
                        </button>

                        <button
                            onClick={handleNextStep}
                            disabled={!isNextEnabled}
                            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition ${currentStep === 2
                                ? "bg-[#1e6191] text-white"
                                : isNextEnabled
                                    ? "text-slate-700 hover:bg-slate-100"
                                    : "cursor-not-allowed text-slate-400"
                                }`}
                        >
                            <Layers size={14} />
                            2. Transformed Final Data
                        </button>
                    </div>
                )}
            </div>

            {/* Top Activation Result Summary Banner */}
            {activationResult && (
                <div className="mb-6 rounded-xl border border-emerald-300 bg-emerald-50 p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
                        <div>
                            <h3 className="text-sm font-bold text-emerald-900">
                                Final Activation Executed Successfully!
                            </h3>
                            <p className="text-xs text-emerald-700 mt-0.5">
                                Database collections have been updated and synchronized with the CSV data.
                            </p>
                        </div>
                    </div>

                    {activationResult.stats && (
                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="rounded-lg bg-white p-3 border border-emerald-200 shadow-xs">
                                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Total Processed</p>
                                <p className="text-lg font-bold text-slate-800 mt-0.5">{activationResult.stats.total || 0}</p>
                            </div>
                            <div className="rounded-lg bg-white p-3 border border-emerald-200 shadow-xs">
                                <p className="text-[11px] font-medium text-emerald-600 uppercase tracking-wide">Competitor Inserted</p>
                                <p className="text-lg font-bold text-emerald-700 mt-0.5">{activationResult.stats.inserted || 0}</p>
                            </div>
                            <div className="rounded-lg bg-white p-3 border border-emerald-200 shadow-xs">
                                <p className="text-[11px] font-medium text-blue-600 uppercase tracking-wide">Competitor Updated</p>
                                <p className="text-lg font-bold text-blue-700 mt-0.5">{activationResult.stats.updated || 0}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Upload Section */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">

                    <div>
                        <h2 className="text-lg font-semibold text-slate-800">
                            {currentStep === 1 ? "Import CSV File" : "Final Activation Execution"}
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            {currentStep === 1
                                ? "Upload a CSV file to preview its data."
                                : "Review the formatted document and run final activation to the database."}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,text/csv"
                            onChange={handleFileChange}
                            className="hidden"
                            id="csv-upload"
                        />

                        {/* Import button ONLY on starting page / step 1 */}
                        {currentStep === 1 && (
                            <label
                                htmlFor="csv-upload"
                                className="flex cursor-pointer items-center gap-2 rounded-lg bg-[#1e6191] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#174d73]"
                            >
                                <Upload size={18} />
                                Import CSV File
                            </label>
                        )}

                        {/* STEP 1: NEXT BUTTON */}
                        {currentStep === 1 && (
                            <button
                                onClick={handleNextStep}
                                disabled={!isNextEnabled}
                                className={`flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition shadow-sm ${isNextEnabled
                                        ? "bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                    }`}
                            >
                                Next Step
                                <ArrowRight size={16} />
                            </button>
                        )}

                        {/* STEP 2: RUN FINAL ACTIVATION OR RED EXIT BUTTON */}
                        {currentStep === 2 && (
                            activationResult ? (
                                <button
                                    onClick={handleRemove}
                                    className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 active:scale-95 shadow-sm cursor-pointer"
                                >
                                    <LogOut size={16} />
                                    Exit
                                </button>
                            ) : (
                                <button
                                    onClick={handleRunFinalActivation}
                                    disabled={isActivating}
                                    className={`flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition shadow-sm ${isActivating
                                            ? "bg-slate-400 text-white cursor-not-allowed"
                                            : "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 cursor-pointer"
                                        }`}
                                >
                                    {isActivating ? (
                                        <>
                                            <RefreshCw size={16} className="animate-spin" />
                                            Activating in DB...
                                        </>
                                    ) : (
                                        <>
                                            <Play size={16} fill="currentColor" />
                                            Run Final Activation
                                        </>
                                    )}
                                </button>
                            )
                        )}
                    </div>

                </div>

                {/* Selected File */}
                {fileName && (
                    <div className="mt-5 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">

                        <div className="flex items-center gap-3">
                            <FileJson
                                size={20}
                                className="text-[#1e6191]"
                            />

                            <div>
                                <p className="text-sm font-semibold text-slate-700">
                                    {fileName}
                                </p>

                                <p className="text-xs text-slate-500">
                                    {jsonData?.length || 0} records found
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={handleRemove}
                            className="rounded-md p-2 text-red-500 hover:bg-red-100"
                        >
                            <X size={18} />
                        </button>

                    </div>
                )}

                {/* Extracted Competitors Badge Section */}
                {competitors.length > 0 && (
                    <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-slate-700">
                                Extracted Competitors ({competitors.length})
                            </p>
                            {isValidating && (
                                <span className="text-xs text-blue-600 font-medium animate-pulse">
                                    Checking database competitor status...
                                </span>
                            )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {competitors.map((name, idx) => (
                                <span
                                    key={idx}
                                    className="rounded-md bg-white border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm"
                                >
                                    {name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Validation Warnings (Missing / Inactive / Disabled) */}
                {validationResult && !validationResult.isValid && validationResult.errors?.length > 0 && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
                            <div className="w-full">
                                <h3 className="text-sm font-bold text-red-800">
                                    Competitor Validation Failed
                                </h3>
                                <p className="mt-1 text-xs text-red-600">
                                    The following issues were found in your client database (<strong>ept_competitor_info</strong>):
                                </p>

                                <div className="mt-3 space-y-1.5">
                                    {validationResult.missing?.length > 0 && (
                                        <div className="text-xs text-red-700">
                                            <strong>❌ Missing Competitors:</strong> {validationResult.missing.join(", ")}
                                        </div>
                                    )}
                                    {validationResult.inactive?.length > 0 && (
                                        <div className="text-xs text-amber-700">
                                            <strong>⚠️ Inactive (status != 'active'):</strong> {validationResult.inactive.join(", ")}
                                        </div>
                                    )}
                                    {validationResult.disabled?.length > 0 && (
                                        <div className="text-xs text-amber-700">
                                            <strong>⚠️ Disabled (competitor_status != 'enable'):</strong> {validationResult.disabled.join(", ")}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Validation Success */}
                {validationResult && validationResult.isValid && competitors.length > 0 && (
                    <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="text-green-600 shrink-0" size={20} />
                            <p className="text-xs font-semibold text-green-700">
                                All extracted competitors are active and enabled in the database. You can now proceed to Next Step.
                            </p>
                        </div>
                    </div>
                )}

            </div>

            {/* STEP 1: CSV Preview */}
            {currentStep === 1 && jsonData && (
                <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

                    {/* JSON Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">

                        <div>
                            <h2 className="text-lg font-semibold text-slate-800">
                                Step 1: Raw CSV Data Preview
                            </h2>

                            <p className="text-sm text-slate-500">
                                Raw parsed JSON response preview
                            </p>
                        </div>

                        <span className="rounded-md bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                            {jsonData.length} Records
                        </span>
                    </div>

                    {/* Postman Style JSON */}
                    <div className="bg-[#1e293b] p-5">
                        <pre className="max-h-[600px] overflow-auto text-sm leading-7 text-slate-100">
                            <code>
                                {JSON.stringify(jsonData, null, 2)}
                            </code>
                        </pre>
                    </div>

                </div>
            )}

            {/* STEP 2: Transformed Final Activation Data Preview */}
            {currentStep === 2 && transformedData && (
                <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    {/* Header */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 px-6 py-4 bg-emerald-50/50">

                            <div>
                                <h2 className="text-lg font-bold text-emerald-950 flex items-center gap-2">
                                    <CheckCircle2 size={20} className="text-emerald-600" />
                                    Step 2: Formatted Final Activation Document
                                </h2>

                                <p className="text-sm text-slate-500">
                                    Transformed into target competitor collections schema
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                <span className="rounded-md bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                                    {transformedData.length} Formatted Docs
                                </span>

                                <button
                                    onClick={() => setCurrentStep(1)}
                                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline"
                                >
                                    Back to CSV Preview
                                </button>
                            </div>
                        </div>

                        {/* Postman Style JSON Preview */}
                        <div className="bg-[#1e293b] p-5">
                            <pre className="max-h-[600px] overflow-auto text-sm leading-7 text-emerald-300">
                                <code>
                                    {JSON.stringify(transformedData, null, 2)}
                                </code>
                            </pre>
                        </div>
                    </div>
            )}

        </div>
    );
};

export default FinalActivation;

