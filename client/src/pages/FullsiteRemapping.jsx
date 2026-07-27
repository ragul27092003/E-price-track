import { useState, useEffect, useRef } from "react";
import { fetchFullsiteMappingProducts, updatefullsiteProductMapping } from "../services/productsService";
import { fetchCompetitors } from "../services/competitorsService";
import MappingPagination from "../components/MappingPagination";
import API from '../hooks/useApi';
import Swal from "sweetalert2";
import { useStore } from "../store";


const FullsiteRemapping = () => {

  const [products, setProducts] = useState([]);
  const [competitors, setCompetitors] = useState([]);
  const [loading, setLoading] = useState(false);
  const activeStoreId = useStore((s) => s.activeStoreId);

  const [page, setPage] = useState(1);
  const [limit] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [selectedCompetitor, setSelectedCompetitor] = useState("");
  const [mappingStatus, setMappingStatus] = useState("");
  const [counts, setCounts] = useState({ completed: 0, pending: 0, });
  const [urlValues, setUrlValues] = useState({});
  const fileInputRef = useRef(null);

  const loadProducts = async () => {
    try {
      
      setLoading(true);
      const [competitorRes, productRes] = await Promise.all([
        fetchCompetitors(),
        fetchFullsiteMappingProducts({
          page,
          limit,
          search,
          competitor: selectedCompetitor,
          mappingstatus: mappingStatus,
        }),
      ]);
      
      setCompetitors(competitorRes || []);
      setProducts(productRes.data || []);
      setTotal(productRes.total);
      setTotalPages(productRes.totalPages);
      setCounts(productRes.counts);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setUrlValues({});
    }
  };


  const StatusIcon = ({ type }) => {
    if (type === 'match') {
      return (
        <svg className="w-6 h-6 text-green-500 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    return (
      <svg className="w-6 h-6 text-red-500 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };
  
  useEffect(() => {
  setPage(1);
}, [activeStoreId]);

  useEffect(() => {
    loadProducts();
  }, [page, limit, search, selectedCompetitor, mappingStatus,activeStoreId]);


  const productUpdation = async (product, action) => {

    const urlReplace = (urlValues[product._id] || "").trim();

    const isApprove = action === "approve";
    const result = await Swal.fire({
      title: isApprove ? "Approve Product?" : "Remove Product?",
      html: isApprove
        ? urlReplace
          ? `Mapping Status will be <b>Completed</b>.<br><br>
            Competitor URL will also be updated.`
          : `Mapping Status will be <b>Completed</b>.<br><br>
            URL Replace is empty.`
        : `Status will be <b>Inactive</b>.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "OK",
      cancelButtonText: "Cancel",
    });
    if (!result.isConfirmed) return;

    const payload = {
      ean: product.ean,
      productCode: product.productCode,
      productCompetitor: product.competitor.compname,
    };

    if (isApprove) {
      payload.mapping_status = "completed";

      if (urlReplace) {
        payload.product_url_change_competitior_web_url = urlReplace;
      }
    } else {
      payload.status = "inactive";
    }
    try {

      const result = await updatefullsiteProductMapping(payload);
      if (result.success) {

        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Updated successfully.",
        });
        loadProducts();

      }else{
        Swal.fire({
          icon: "error",
          title: "Error",
          text: result.message,
        });
      }

    } catch (err) {

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Update failed.",
      });
    }

  };

  const completedProductsExport = async () => {
    const result = await Swal.fire({

      title: "Export Completed Products?",
      html: `
        <p>This will export all <b>Completed</b> and <b>Active</b> products.</p>
        <p>Do you want to continue?</p>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#dc2626",
      confirmButtonText: "Yes, Export",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    try {

      Swal.fire({
        title: "Exporting...",
        text: "Please wait while generating the CSV.",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const response = await fetch(
        
        `${API.defaults.baseURL}/products/completedproductsexport`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "completed_products.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);

      Swal.fire({
        icon: "success",
        title: "Export Completed",
        text: "CSV downloaded successfully.",
      });

    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Export Failed",
        text: err.message,
      });
    }
  };

  const handleImport = async (e) => {

    const file = e.target.files[0];
    if (!file) return;
    const result = await Swal.fire({
      title: "Import CSV",
      html: `
        <div style="text-align:left">
          <p><strong>File:</strong> ${file.name}</p>
          <br>
          <p>The import will:</p>
          <ul style="text-align:left">
            <li>✔ Update existing products</li>
            <li>✔ Insert new products if they don't exist</li>
          </ul>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Import",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#16a34a",
    });
    if (!result.isConfirmed) {
      e.target.value = "";
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    try {
      Swal.fire({
        title: "Importing...",
        text: "Please wait.",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const response = await API.post(
        "/products/importFullsiteMapping",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      Swal.fire({
        icon: "success",
        title: "Import Completed",
        html: `
          <b>Total :</b> ${response.data.total}<br>
          <b>Updated :</b> ${response.data.updated}<br>
          <b>Inserted :</b> ${response.data.inserted}
        `,
      });

      loadProducts();

    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Import Failed",
        text: err.response?.data?.message || err.message,
      });
    }
    e.target.value = "";
  };

  console.log(competitors);
  console.log(products);

  return (
    <div>
     
      {/* Body */}
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-bold">Fullsite Remapping</h2>

        <div className="mx-auto flex max-w-[1400px] flex-col gap-5 px-2 py-3">
          
          <div className="flex flex-wrap lg:flex-nowrap items-end gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[240px]">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-transparent">
                Search
              </p>

              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                <svg
                  className="text-slate-400"
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>

                <input
                  disabled={loading}
                  type="text"
                  value={search}
                  onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                  }}
                  placeholder="Search by name, brand or EAN..."
                  className="w-full bg-transparent outline-none text-sm"
                />
              </div>
            </div>

            {/* Competitors */}
            <div className="w-52">
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-600">
                Competitors
              </label>

              <select
                disabled={loading}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                value={selectedCompetitor}
                onChange={(e) => {
                    setSelectedCompetitor(e.target.value);
                    setPage(1);
                }}
              >
              <option value="">All</option>
              {competitors.map(
                (item) => (
                    <option key={item.slug} value={item.slug}>{item.name}</option>
                )
              )}
              </select>
            </div>

            {/* Status */}
            <div className="w-52">
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-600">
                Status
              </label>

              <select
                disabled={loading}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                value={mappingStatus}
                onChange={(e) => {
                    setMappingStatus(e.target.value);
                    setPage(1);
                }}
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                
              </select>
            </div>
            
            {/* Export */}
               {mappingStatus === 'completed' && !loading && (
                <div className="w-44">
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-transparent">
                    Export
                  </label>

                  <button
                    onClick={ () => completedProductsExport()}
                    className="flex h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-[#2B86C5] text-sm font-semibold text-white shadow transition hover:bg-[#2B86C5]"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 3v12m0 0l4-4m-4 4l-4-4M4 21h16"
                      />
                    </svg>
                    Export
                  </button>
                </div>
            )}

            {/* Import */}
               {mappingStatus === 'pending' && !loading && (
              <div className="w-44">
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-transparent">
                  Import
                </label>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-[#2B86C5] text-sm font-semibold text-white shadow transition hover:bg-[#2B86C5]"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 21V9m0 0l-4 4m4-4l4 4M4 21h16"
                    />
                  </svg>

                  Import CSV
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleImport}
                />
              </div>
            )}

            {/* Counts */}
            <div className="flex gap-3">
              <div className="flex h-[46px] w-44 items-center justify-between rounded-lg bg-green-600 px-4 text-white shadow">
                <span className="text-sm font-semibold uppercase">Completed</span>
                <span className="rounded bg-white/20 px-2 py-0.5 text-sm font-bold">
                  {counts.completed}
                </span>
              </div>

              <div className="flex h-[46px] w-44 items-center justify-between rounded-lg bg-red-500 px-4 text-white shadow">
                <span className="text-sm font-semibold uppercase">Pending</span>
                <span className="rounded bg-white/20 px-2 py-0.5 text-sm font-bold">
                  {counts.pending}
                </span>
              </div>
            </div>

          </div>

          <div></div>

          <div className="mt-2">

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
            
             
              <MappingPagination
                page={page}
                totalPages={totalPages}
                total={total}
                limit={limit}
                onPageChange={setPage}
              /> 
              
              <div className="container mx-auto px-4 mt-4">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                  {/* Header */}
                  <div className="bg-gray-900 text-white">
                    <div className="grid grid-cols-12 text-center font-bold py-3 text-sm">
                      <div className="col-span-2">Item Name</div>
                      <div className="col-span-3">Store Product</div>
                      <div className="col-span-3">Competitor Product</div>
                      <div className="col-span-1">Status</div>
                      <div className="col-span-3">Action</div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4">

                    {loading ? (
                      
                        <div className="py-10 flex justify-center items-center">
                          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#2B86C5]"></div>
                        </div>
                    
                    ) : products.length === 0 ? (

                        <div className="py-10 flex justify-center items-center">
                            No products found.
                        </div>

                    ) : (

                      products.map((product, index) => {
                        return (

                          <div key={product.id} className={`${product.mapping_status === 'completed' ? "bg-green-100" : "bg-red-100" } p-4 rounded-lg mb-4`}>
                            {/* Images Row */}
                            <div className="grid grid-cols-12 items-center text-center mb-4">
                              <div className="col-span-2 font-bold text-sm">IMAGE</div>
                              <div className="col-span-3">
                                <a href={product.store.link} target="_blank" rel="noopener noreferrer">
                                  <img 
                                    src={product.store.image} 
                                    className="border rounded p-1 bg-white w-16 h-16 object-contain mx-auto"
                                    alt="Store"
                                    onError={(e) => {
                                      e.target.src = "./assets/no-image.png";
                                    }}
                                    
                                  />
                                </a>
                              </div>
                              <div className="col-span-3">
                                <a href={product.competitor.link}
                                 target="_blank" rel="noopener noreferrer">
                                  <img 
                                    src={product.competitor.image} 
                                    className="border rounded p-1 bg-white w-16 h-16 object-contain mx-auto"
                                    alt="Competitor"
                                  
                                  />
                                </a>
                              </div>
                              <div className="col-span-1">
                                <StatusIcon type={product.status.image} />
                              </div>
                              <div className="col-span-3">
                                <div className="border border-gray-800 rounded overflow-hidden">
                                  <div className="bg-blue-500 border-b border-gray-800 py-1">
                                    <p className="text-white text-xs font-semibold">EAN NUMBER</p>
                                  </div>
                                  <div className="py-1 bg-white">
                                    <p className="text-sm font-medium">{product.ean}</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Price Row */}
                            <div className="grid grid-cols-12 text-center mb-3">
                              <div className="col-span-2 font-bold text-sm">PRICE</div>
                              <div className="col-span-3 font-bold text-red-600">{product.store.price}</div>
                              <div className="col-span-3 font-bold text-red-600">{product.competitor.price}</div>
                              <div className="col-span-1">
                                <StatusIcon type={product.status.price} />
                              </div>
                              <div className="col-span-3">
                                <div className="border border-gray-800 rounded overflow-hidden">
                                  <div className="bg-blue-500 border-b border-gray-800 py-1">
                                    <p className="text-white text-xs font-semibold">PRODUCT CODE</p>
                                  </div>
                                  <div className="py-1 bg-white">
                                    <p className="text-sm font-medium">{product.productCode}</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Brand Row */}
                            <div className="grid grid-cols-12 text-center mb-3">
                              <div className="col-span-2 font-bold text-sm">BRAND</div>
                              <div className="col-span-3 font-bold uppercase text-blue-600">{product.store.brand}</div>
                              <div className="col-span-3 font-bold uppercase text-blue-600">{product.competitor.brand}</div>
                              <div className="col-span-1">
                                <StatusIcon type={product.status.brand} />
                              </div>
                              <div className="col-span-3">
                                <div className="border border-gray-800 rounded overflow-hidden">
                                  <div className="bg-blue-500 border-b border-gray-800 py-1">
                                    <p className="text-white text-xs font-semibold">MPN NUMBER</p>
                                  </div>
                                  <div className="py-1 bg-white">
                                    <p className="text-sm font-medium">{product.mpn}</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Name Row */}
                            <div className="grid grid-cols-12 text-center">
                              <div className="col-span-2 font-bold text-sm">NAME</div>
                              <div className="col-span-3 text-xs font-medium uppercase leading-tight">
                               {product.store.name}
                              </div>
                              <div className="col-span-3 text-xs font-medium uppercase leading-tight">
                                {product.competitor.name}
                              </div>
                              <div className="col-span-1">
                                <StatusIcon type={product.status.price} />
                              </div>
                              <div className="col-span-3">
                                <div className="flex flex-col gap-2">
                                  <div>
                                    <img 
                                      width="99px" 
                                      height="33px" 
                                      src={`${API.defaults.baseURL.replace(/\/api\/?$/, '')}${product.competitor.logo}`}
                                      alt="Competitor Logo"
                                      className="mx-auto border rounded"
                                    />
                                  </div>
                                  <div>
                                    <input
                                      type="text"
                                      value={urlValues[product._id] || ""}
                                      onChange={(e) =>
                                        setUrlValues((prev) => ({
                                          ...prev,
                                          [product._id]: e.target.value,
                                        }))
                                      }
                                      placeholder="Paste correct URL"
                                      className="w-full px-3 py-2 border border-gray-300 rounded"
                                    />
                                  </div>
                                  <div className="flex justify-center gap-2">
                                    <button
                                      className="bg-green-500 hover:bg-green-600 text-white font-semibold py-1 px-4 rounded"
                                      onClick={() => productUpdation(product, "approve")}
                                    >
                                      Approve
                                    </button>

                                    <button
                                      className="bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-4 rounded"
                                      onClick={() => productUpdation(product, "remove")}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                        );
                      })

                    )}

                  </div>
                </div>
              </div>

              <MappingPagination
                page={page}
                totalPages={totalPages}
                total={total}
                limit={limit}
                onPageChange={setPage}
              /> 
              

            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default FullsiteRemapping;