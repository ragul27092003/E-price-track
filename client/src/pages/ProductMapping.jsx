import { useState, useEffect, useRef } from "react";
import {
  fetchPendingProducts,
  fetchProductsMeta,
  saveProductMapping,
} from "../services/productsService";
import { fetchCompetitors } from "../services/competitorsService";
import Swal from "sweetalert2";
import MappingPagination from "../components/MappingPagination";
import { useStore } from "../store";
import API from '../hooks/useApi';
import { NavLink } from "react-router-dom";



const ProductMapping = () => {
  const activeStoreId = useStore((s) => s.activeStoreId);

  const [data, setData] = useState([]);
  const [filterdata, setFilterdata] = useState({
    brands: [],
    categories: [],
    ranks: [],
    itemGroups: [],
  });
  const [competitors, setCompetitors] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(2);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [brandsearch, setBrandsearch] = useState("");
  const [itemgroupsearch, setItemGroupsearch] = useState("");
  const [categorysearch, setCategory] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [mappingData, setMappingData] = useState({});

  const openModal = (product) => {

    setSelectedProduct(product);
    setMappingData({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setMappingData({});
    setSelectedProduct(null);
  };


  const loadInitialData = async () => {
    try {
      const [activeCompetitors, filterData] = await Promise.all([
        fetchCompetitors(),
        fetchProductsMeta(),
      ]);

      setCompetitors(activeCompetitors);
      setFilterdata(filterData);

    } catch (err) {
      console.error(err);
    }
  };

  const loadProducts = async (
    
    pageNo = 1,
    searchText = "",
    searchBrand = "",
    searchItemgroup = "",
    searchCategory = ""
  ) => {
    try {
      setLoading(true);
      const result = await fetchPendingProducts({
        page: pageNo,
        limit,
        search: searchText,
        brandsearch: searchBrand,
        itemgroupsearch: searchItemgroup,
        catogysearch: searchCategory,
      });
      setData(result.data || []);
      setTotal(result.total || 0);
      setTotalPages(result.totalPages || 1);

    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  // Competitors + filter metadata (brands/categories/ranks/item groups) are
  // per-tenant. Refetch whenever the super admin switches to a different
  // store — same as Products.jsx does.
  useEffect(() => {
    loadInitialData();
  }, [activeStoreId]);

  // Reset back to page 1 whenever the store changes, so we don't end up
  // requesting a page number that doesn't exist for the new store's data.
  useEffect(() => {
    setPage(1);
  }, [activeStoreId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts(page, search, brandsearch, itemgroupsearch, categorysearch);
    }, 500);
    return () => clearTimeout(timer);
  }, [page, search, brandsearch, itemgroupsearch, categorysearch, activeStoreId]);

  const handleInputChange = (slug, field, value) => {
    setMappingData((prev) => ({
      ...prev,
      [slug]: {
        ...prev[slug],
        [field]: value,
      },
    }));
  };

  const handleSaveChanges = () => {
    Swal.fire({
      icon: "info",
      title: "Mapping The New Product",
      text: "Are you sure you want to proceed?",
      showCancelButton: true,
      confirmButtonText: "OK",
      cancelButtonText: "Cancel",
      reverseButtons: true,

      confirmButtonColor: "#0d6efd",
      cancelButtonColor: "#6c757d",

      customClass: {
        popup: "rounded-xl",
        title: "text-3xl font-bold",
        confirmButton: "px-8 py-2 rounded-lg",
        cancelButton: "px-8 py-2 rounded-lg",
      },
    }).then((result) => {
      if (result.isConfirmed) {
        saveProductMappingData();
      }
    });
  };

  const saveProductMappingData = async () => {
    try {
      const arrMappingData = competitors.map((competitor) => ({
        competitor_slug: competitor.slug,
        prod_url: mappingData[competitor.slug]?.prod_url || "",
        prod_price: mappingData[competitor.slug]?.prod_price || "",
      }));

      const payload = {
        product_ean_id: selectedProduct.product_ean_id,
        product_code: selectedProduct.product_code,
        company_name: localStorage.getItem("activeShopName"),
        arrMappingData,
      };

      const result = await saveProductMapping(payload);

      if (result.success) {
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Product Mapping Saved Successfully",
        });

        closeModal();

        loadProducts(
          page,
          search,
          brandsearch,
          itemgroupsearch,
          categorysearch
        );
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: result.message,
        });
      }
    } catch (err) {
      console.log(err);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Unable to save mapping.",
      });
    }
  };
  

  return (
    <div>
     
      {/* Body */}
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-bold">Pending Products Activation</h2>

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
                  type="text"
                  placeholder="Search by name, brand or EAN..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-transparent outline-none text-sm"
                />
              </div>
            </div>

            {/* Item Group */}
            <div className="w-52">
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-600">
                Item Group
              </label>

              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                value={itemgroupsearch}
                onChange={(e) => {
                  setItemGroupsearch(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Item Groups</option>
                {filterdata.itemGroups.map((group) => (
                  <>
                    <option key={group} value={group}>
                      {group}
                    </option>
                  </>
                ))}
              </select>
            </div>

            {/* Brand */}
            <div className="w-52">
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-600">
                BRAND
              </label>

              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                value={brandsearch}
                onChange={(e) => {
                  setBrandsearch(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Brands</option>
                {filterdata.brands.map((group) => (
                  <>
                    <option key={group} value={group}>
                      {group}
                    </option>
                  </>
                ))}
              </select>
            </div>

            {/* Category */}
            <div className="w-52">
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-600">
                Category
              </label>

              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                value={categorysearch}
                onChange={(e) => {
                  setItemGroupsearch(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Categories</option>
                {filterdata.categories.map((group) => (
                  <>
                    <option key={group} value={group}>
                      {group}
                    </option>
                  </>
                ))}
              </select>
            </div>

            {/* Export Button */}
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-transparent">
                Export
              </p>

              {/* <button className="flex items-center gap-2 rounded-lg bg-[#2B86C5] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#226fa3]">
                    <svg
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>

                    Export
                  </button> */}
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

              <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
                <table className="w-full min-w-[1000px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">
                        Item Code
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">
                        Product Details
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500">
                        Price
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="py-16">
                          <div className="flex justify-center items-center">
                            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#2B86C5]"></div>
                          </div>
                        </td>
                      </tr>
                    ) : data.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-16 text-center text-slate-500"
                        >
                          No products found.
                        </td>
                      </tr>
                    ) : (
                      data.map((product, index) => {
                        return (
                          <tr
                            key={
                              product.product_code || product.item_code || index
                            }
                            className="hover:bg-slate-50/80 transition-colors"
                          >
                            {/*<td className="px-5 py-4">
                                        <span className="inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-bold bg-blue-100 text-blue-700">
                                          {product.product_code}
                                        </span>
                                      </td> */}

                            <td className="px-5 py-4">
                              <button
                                onClick={() => openModal(product)}
                                className="inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-bold bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                              >
                                {product.product_code}
                              </button>
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex items-center gap-4">
                                <a
                                  href={product.product_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Open product page"
                                  className="shrink-0 hover:opacity-80 transition-opacity"
                                >
                                  <img
                                    src={product.product_image}
                                    alt="Butterfly Outer Lid Induction Bottom Cooker (3LSTDPLUS)"
                                    className="h-10 w-10 shrink-0 rounded-lg border border-slate-100 dark:border-slate-700/50 object-contain shadow-sm bg-slate-50 dark:bg-[#151a2a]"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src = "/assets/no-image-rounded.png";
                                    }}
                                  />
                                </a>
                                <div>
                                  <a
                                    href={product.product_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Open product page"
                                    className="inline-flex items-center gap-1 font-bold text-slate-800 dark:text-white text-[13px] hover:text-black dark:hover:text-black"
                                  >
                                    {product.product_name}
                                    <svg
                                      viewBox="0 0 24 24"
                                      width="11"
                                      height="11"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2.5"
                                      className="shrink-0 opacity-60"
                                    >
                                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                      <path d="M15 3h6v6"></path>
                                      <path d="M10 14 21 3"></path>
                                    </svg>
                                  </a>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    <span>{product.product_ean_id}</span> -{" "}
                                    <span>{product.product_brand}</span> -{" "}
                                    <span>{product.product_item_group}</span> -{" "}
                                    <span className="bg-red-100 rounded-md px-2 py-1">
                                      {product.ean_created_date}
                                    </span>
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <span className="inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-bold bg-blue-100 text-blue-700">
                                {product.product_price}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
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

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[94vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between py-3 px-5 bg-slate-800 text-white">
              <div>
                <h2 className="text-xl font-bold">Product Competitor Info</h2>

                <p className="text-xs text-slate-300 mt-1">
                  Manage competitor URLs and prices
                </p>
              </div>

              <button
                onClick={closeModal}
                className="w-10 h-10 rounded-lg bg-red-500 hover:bg-red-600 text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Body */}

            <div className="grid lg:grid-cols-12 gap-6 p-6 overflow-y-auto max-h-[70vh]">
              <div className="lg:col-span-4">
                <div className="bg-slate-50 rounded-xl border">
                  <div className="bg-cyan-500 text-white text-lg font-semibold text-center py-4 rounded-t-xl">
                    Product Detail
                  </div>

                  <div className="p-1">
                    <img
                      src={selectedProduct?.product_image}
                      className="w-24 h-24 object-contain mx-auto border rounded-lg bg-white p-2"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/assets/no-image.png";
                      }}
                    />

                    <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                      <table className="w-full text-sm">
                        <tbody>
                          <tr className="bg-slate-50">
                            <td className="px-4 py-3 font-semibold text-slate-700 align-top">
                              Product Name
                            </td>
                            <td className="px-4 py-3">
                              <a
                                href={selectedProduct?.product_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-blue-600 hover:text-blue-800 hover:underline transition-all duration-200"
                              >
                                {selectedProduct?.product_name}
                              </a>
                            </td>
                          </tr>

                          <tr className="border-b border-slate-200 bg-white">
                            <td className="px-4 py-3 font-semibold text-slate-700">
                              Product Code
                            </td>
                            <td className="px-4 py-3">
                              <span className="rounded-md bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                                {selectedProduct?.product_code || "-"}
                              </span>
                            </td>
                          </tr>

                          <tr className="border-b border-slate-200 bg-slate-50">
                            <td className="w-32 px-4 py-3 font-semibold text-slate-700">
                              Product Ean
                            </td>
                            <td className="px-4 py-3 text-slate-600 break-all">
                              {selectedProduct?.product_ean_id || "-"}
                            </td>
                          </tr>

                          <tr className="border-b border-slate-200 bg-slate-50">
                            <td className="w-32 px-4 py-3 font-semibold text-slate-700">
                              Product Mpn
                            </td>
                            <td className="px-4 py-3 text-slate-600 break-all">
                              {selectedProduct?.product_mpn || "-"}
                            </td>
                          </tr>

                          <tr className="border-b border-slate-200 bg-slate-50">
                            <td className="px-4 py-3 font-semibold text-slate-700">
                              Product Brand
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {selectedProduct?.product_brand || "-"}
                            </td>
                          </tr>

                          <tr className="border-b border-slate-200 bg-white">
                            <td className="px-4 py-3 font-semibold text-slate-700">
                              Product Price
                            </td>
                            <td className="px-4 py-3">
                              <span className="rounded-md bg-green-100 px-3 py-1 text-sm font-bold text-green-700">
                                ₹ {selectedProduct?.product_price || "0"}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-8">
                {/*<div className="space-y-4">
                         
                        <div className="border rounded-xl p-4 bg-white shadow-sm">

                            <div className="grid grid-cols-12 gap-3 items-center">

                                <div className="col-span-12 md:col-span-2">
                                    <img src="" className="h-10 object-contain" />
                                </div>

                                <div className="col-span-12 md:col-span-5">

                                    <input
                                        className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                                        placeholder="Competitor URL"
                                    />

                                </div>

                                <div className="col-span-6 md:col-span-2">

                                    <input
                                        className="w-full border rounded-lg px-4 py-2"
                                        placeholder="Price"
                                    />

                                </div>

                                <div className="col-span-6 md:col-span-3 flex justify-end gap-2">

                                    <button className="bg-red-500 text-white rounded-lg px-3 py-2">
                                        GS →
                                    </button>

                                    <button className="bg-red-500 text-white rounded-lg px-3 py-2">
                                        MP →
                                    </button>

                                    <button className="bg-blue-500 text-white rounded-lg px-3 py-2">
                                        SS →
                                    </button>

                                </div>

                            </div>

                        </div>

                      </div> */}

                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-4 bg-slate-100 px-4 py-3 border-b border-slate-200">
                    <div className="col-span-12 sm:col-span-3 lg:col-span-2">
                      <span className="text-sm font-semibold text-slate-700">
                        Competitor
                      </span>
                    </div>

                    <div className="col-span-12 sm:col-span-9 lg:col-span-5">
                      <span className="text-sm font-semibold text-slate-700">
                        Competitor URL
                      </span>
                    </div>

                    <div className="col-span-6 sm:col-span-4 lg:col-span-2">
                      <span className="text-sm font-semibold text-slate-700">
                        Price
                      </span>
                    </div>

                    <div className="col-span-6 sm:col-span-8 lg:col-span-3">
                      <span className="text-sm font-semibold text-slate-700">
                        Actions
                      </span>
                    </div>
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-slate-200">
                    {competitors.map((competitor) => (
                      <div
                        key={competitor._id}
                        className="grid grid-cols-12 gap-4 items-center px-4 py-1 hover:bg-slate-50 transition"
                      >
                        {/* Logo */}
                        <div className="col-span-12 sm:col-span-3 lg:col-span-2 flex items-center">
                          <div className="w-16 h-12 border rounded-lg bg-slate-50 flex items-center justify-center p-2">
                            <img
                              src={`${API.defaults.baseURL.replace(/\/api\/?$/, '')}${competitor.logo}`}
                              alt={competitor.name}
                              className="max-h-10 object-contain"
                            />
                          </div>
                        </div>

                        {/* URL */}
                        <div className="col-span-12 sm:col-span-9 lg:col-span-5">
                          <input
                            type="text"
                            placeholder={`Enter ${competitor.name} URL`}
                            value={mappingData[competitor.slug]?.prod_url || ""}
                            onChange={(e) =>
                              handleInputChange(
                                competitor.slug,
                                "prod_url",
                                e.target.value
                              )
                            }
                            className="w-full h-8 rounded-lg border border-slate-300 px-4 text-sm"
                          />
                        </div>

                        {/* Price */}
                        <div className="col-span-6 sm:col-span-4 lg:col-span-2">
                          <input
                            type="text"
                            placeholder="₹ 0.00"
                            value={
                              mappingData[competitor.slug]?.prod_price || ""
                            }
                            onChange={(e) =>
                              handleInputChange(
                                competitor.slug,
                                "prod_price",
                                e.target.value
                              )
                            }
                            className="w-full h-8 rounded-lg border border-slate-300 px-4 text-sm"
                          />
                        </div>

                        {/* Buttons */}
                        <div className="col-span-6 sm:col-span-8 lg:col-span-3">
                          <div className="grid grid-cols-3 gap-2">
                            <a
                              href={`https://www.google.com/search?q=${encodeURIComponent(
                                selectedProduct?.product_name || ""
                              )} site: ${competitor.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-8 items-center justify-center rounded-lg bg-red-500 px-3 text-sm font-semibold text-white hover:bg-red-600"
                            >
                              GNS&nbsp;➜
                            </a>

                            <a
                              href={`https://www.google.com/search?q=${encodeURIComponent(
                                selectedProduct?.product_mpn || ""
                              )} site: ${competitor.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-8 items-center justify-center rounded-lg bg-cyan-500 px-3 text-sm font-semibold text-white hover:bg-red-600"
                            >
                              GMS&nbsp;➜
                            </a>

                            <a
                              href={competitor.searchUrl.replace(
                                "search_term",
                                encodeURIComponent(
                                  selectedProduct?.product_ean_id || ""
                                )
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-8 items-center justify-center rounded-lg bg-blue-500 px-3 text-sm font-semibold text-white hover:bg-red-600"
                            >
                              SES&nbsp;➜
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t bg-slate-50 px-4 py-2 flex justify-end gap-2">
              <button
                onClick={closeModal}
                className="h-10 px-6 rounded-lg bg-gray-200 hover:bg-gray-300"
              >
                Close
              </button>

              <button
                onClick={handleSaveChanges}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProductMapping;