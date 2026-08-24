import React, { useState } from 'react';
import {
  RefreshCcw,
  Pencil,
  Trash2,
  Repeat2,
  X,
  Check
} from 'lucide-react';
import Swal from 'sweetalert2';
import axios from 'axios';
import { deleteProductCompetitor, updateProductCompetitor } from '../services/productsService';

const SingleProductUpdation = ({
  product_ean_id,
  product_code,
  product_name,
  comp_name,
  unique_id,
  cmpid,
  product_status,
  url_status
}) => {

  const [isUpdating, setIsUpdating] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showChangeUrl, setShowChangeUrl] = useState(false);
  const [newProductUrl, setNewProductUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);


  // ============================================================
  // EXISTING REFRESH PROCESS
  // ============================================================

  const handleRefreshClick = async () => {

    const confirmResult = await Swal.fire({
      title: 'Confirm Refresh',
      text: `Do you want to refresh the price?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, Refresh',
      cancelButtonText: 'Cancel'
    });

    if (!confirmResult.isConfirmed) {
      return;
    }

    setIsUpdating(true);

    try {

      const updateUrl =
        `${import.meta.env.VITE_SCRAPE_DOMAIN}/${comp_name}` +
        `?cmpid=plm_user_info_${cmpid}` +
        `&ean=${product_ean_id || ''}` +
        `&itemcode=${product_code || ''}`;

      Swal.fire({
        title: 'Updating...',
        text: 'Please wait while we fetch the latest product data',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const response = await axios.get(updateUrl);
      const rawData = response.data;
      // Find the complete event
      const completeMatch = rawData.match(
        /event:\s*complete\s*data:\s*(\{[\s\S]*?\})(?=\s*(?:event:|$))/
      );
      if (!completeMatch) {
        await Swal.fire({
          icon: "error",
          title: "Scraping Failed",
          text: "Unable to get the updated product data.",
          confirmButtonColor: "#d33",
          heightAuto: false,
        });

        return;
      }
      let completeData;
      try {
        completeData = JSON.parse(completeMatch[1]);
      } catch (error) {
        console.error("Failed to parse complete event:", error);

        await Swal.fire({
          icon: "error",
          title: "Response Error",
          text: "Invalid response received from scraper.",
          confirmButtonColor: "#d33",
          heightAuto: false,
        });

        return;
      }
      const updatedData = completeData?.data?.[0];

      if (!updatedData) {
        await Swal.fire({
          icon: "error",
          title: "No Data",
          text: "Product data was not returned by the scraper.",
          confirmButtonColor: "#d33",
          heightAuto: false,
        });

        return;
      }

      // Partial data
      else if (
        updatedData?.product_price === "No Result" ||
        updatedData?.product_stock === "No Result"
      ) {

        await Swal.fire({
          icon: 'warning',
          title: '⚠️ Partial Data',
          html: `
            <div style="padding: 5px 0;">

              <div style="
                display:flex;
                align-items:center;
                gap:10px;
                margin-bottom:12px;
                padding:8px 12px;
                background:linear-gradient(
                  135deg,
                  #667eea 0%,
                  #764ba2 100%
                );
                border-radius:8px;
                color:white;
              ">
                <span style="font-size:20px;">📦</span>

                <div style="flex:1;min-width:0;">
                  <div style="font-size:11px;opacity:.8;">
                    Product
                  </div>

                  <div style="
                    font-weight:600;
                    font-size:15px;
                    white-space:nowrap;
                    overflow:hidden;
                    text-overflow:ellipsis;
                  ">
                    ${product_name || 'N/A'}
                  </div>
                </div>
              </div>


              <div style="
                display:grid;
                grid-template-columns:1fr 1fr;
                gap:10px;
              ">

                <div style="
                  padding:10px;
                  background:${
                    updatedData?.product_price === "No Result"
                      ? '#fee2e2'
                      : '#f0fdf4'
                  };
                  border-radius:8px;
                ">
                  <div style="font-size:11px;color:#6b7280;">
                    💰 Price
                  </div>

                  <div style="
                    font-size:18px;
                    font-weight:700;
                  ">
                    ${
                      updatedData?.product_price === "No Result"
                        ? '❌'
                        : '₹' + updatedData?.product_price
                    }
                  </div>
                </div>


                <div style="
                  padding:10px;
                  background:${
                    updatedData?.product_stock === "No Result"
                      ? '#fee2e2'
                      : '#f0fdf4'
                  };
                  border-radius:8px;
                ">
                  <div style="font-size:11px;color:#6b7280;">
                    📊 Stock
                  </div>

                  <div style="
                    font-size:18px;
                    font-weight:700;
                  ">
                    ${
                      updatedData?.product_stock === "No Result"
                        ? '❌'
                        : updatedData?.product_stock
                    }
                  </div>
                </div>

              </div>


              <div style="
                margin-top:10px;
                padding:6px 10px;
                background:#f3f4f6;
                border-radius:6px;
                font-size:12px;
                color:#6b7280;
                text-align:center;
              ">
                ⏱️ ${updatedData?.modified_date || 'N/A'}
              </div>

            </div>
          `,
          confirmButtonColor: '#667eea',
          confirmButtonText: 'Update',
          showCancelButton: true,
          cancelButtonColor: '#d33',
          cancelButtonText: 'Cancel',
          heightAuto: false,
          padding: '1.5rem'
        });

      }

      // Full success
      else {

        await Swal.fire({
          icon: 'success',
          title: '✅ Updated!',
          html: `
            <div style="padding:5px 0;">

              <div style="
                display:flex;
                align-items:center;
                gap:10px;
                margin-bottom:12px;
                padding:8px 12px;
                background:linear-gradient(
                  135deg,
                  #22c55e 0%,
                  #16a34a 100%
                );
                border-radius:8px;
                color:white;
              ">

                <span style="font-size:20px;">🎉</span>

                <div style="flex:1;min-width:0;">
                  <div style="font-size:11px;opacity:.8;">
                    Product Name
                  </div>

                  <div style="
                    font-weight:600;
                    font-size:15px;
                    white-space:nowrap;
                    overflow:hidden;
                    text-overflow:ellipsis;
                  ">
                    ${product_name || 'N/A'}
                  </div>
                </div>

              </div>


              <div style="
                display:grid;
                grid-template-columns:1fr 1fr;
                gap:10px;
              ">

                <div style="
                  padding:10px;
                  background:#f0fdf4;
                  border-radius:10px;
                  border:2px solid #22c55e;
                  text-align:center;
                ">
                  <div style="
                    font-size:11px;
                    font-weight:600;
                    color:#16a34a;
                  ">
                    💰 PRICE
                  </div>

                  <div style="
                    font-size:22px;
                    font-weight:700;
                    color:#16a34a;
                  ">
                    ₹${updatedData?.product_price || 'N/A'}
                  </div>

                  <div style="
                    font-size:10px;
                    color:#22c55e;
                  ">
                    ✓ Available
                  </div>
                </div>


                <div style="
                  padding:10px;
                  background:#eff6ff;
                  border-radius:10px;
                  border:2px solid #3b82f6;
                  text-align:center;
                ">
                  <div style="
                    font-size:11px;
                    font-weight:600;
                    color:#2563eb;
                  ">
                    📦 STOCK
                  </div>

                  <div style="
                    font-size:22px;
                    font-weight:700;
                    color:#2563eb;
                  ">
                    ${updatedData?.product_stock || 'N/A'}
                  </div>

                  <div style="
                    font-size:10px;
                    color:#3b82f6;
                  ">
                    ✓ In Stock
                  </div>
                </div>

              </div>


              <div style="
                display:flex;
                align-items:center;
                justify-content:space-between;
                margin-top:10px;
                padding:6px 10px;
                background:#f8fafc;
                border-radius:6px;
                border:1px solid #e2e8f0;
                font-size:11px;
              ">
                <span>🔄 Updated</span>
                <span style="font-weight:600;">
                  ${updatedData?.modified_date || 'N/A'}
                </span>
              </div>


              <div style="
                margin-top:8px;
                padding:4px;
                background:#f0fdf4;
                border-radius:4px;
                text-align:center;
                font-size:11px;
                color:#166534;
              ">
                ✨ Synced successfully
              </div>

            </div>
          `,
          confirmButtonColor: '#22c55e',
          confirmButtonText: '👍 Great',
          showCancelButton: true,
          cancelButtonColor: '#64748b',
          cancelButtonText: 'Close',
          heightAuto: false,
          padding: '1.5rem',
          width: 450
        });

      }

      setShowActions(false);


    } catch (error) {

      console.error('Error updating product:', error);

      if (
        error.response?.status === 403 ||
        error.response?.status === 429
      ) {

        await Swal.fire({
          icon: 'error',
          title: 'Access Blocked',
          text: 'Please use after some time or contact administrator',
          confirmButtonColor: '#d33'
        });

      } else {

        await Swal.fire({
          icon: 'error',
          title: 'Update Failed',
          text:
            error.response?.data?.message ||
            'Failed to update product. Please try again later.',
          confirmButtonColor: '#d33'
        });

      }

    } finally {
      setIsUpdating(false);
      window.location.reload();
    }
  };


  // ============================================================
  // DELETE PRODUCT
  // ============================================================

  const handleDelete = async () => {

    const confirmResult = await Swal.fire({
      title: 'Delete Product?',
      html: `
        <div style="text-align:left">
          <p><strong>Product:</strong> ${product_name || 'N/A'}</p>
          <p><strong>Competitor:</strong> ${comp_name || 'N/A'}</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel'
    });

    if (!confirmResult.isConfirmed) {
      return;
    }

    try {

      setIsSaving(true);

      Swal.fire({
        title: 'Deleting...',
        text: 'Please wait',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      /*
       * IMPORTANT:
       * Change this endpoint to your actual backend route.
       */

      await deleteProductCompetitor(unique_id, cmpid, comp_name);

      await Swal.fire({
        icon: 'success',
        title: 'Deleted!',
        text: 'Competitor product deleted successfully.',
        confirmButtonColor: '#22c55e'
      });

      setShowActions(false);

    } catch (error) {

      console.error('Delete product error:', error);

      await Swal.fire({
        icon: 'error',
        title: 'Delete Failed',
        text:
          error.response?.data?.message ||
          'Failed to delete competitor product.',
        confirmButtonColor: '#d33'
      });

    } finally {
      setIsSaving(false);
      window.location.reload();
    }
  };


  // ============================================================
  // CHANGE PRODUCT URL
  // ============================================================

  const handleChangeUrl = async () => {

    if (!newProductUrl.trim()) {

      await Swal.fire({
        icon: 'warning',
        title: 'URL Required',
        text: 'Please enter the competitor product URL.',
        confirmButtonColor: '#3085d6'
      });

      return;
    }

    if (!/^https?:\/\//i.test(newProductUrl.trim())) {

      await Swal.fire({
        icon: 'warning',
        title: 'Invalid URL',
        text: 'Please enter a valid HTTP/HTTPS URL.',
        confirmButtonColor: '#3085d6'
      });

      return;
    }


    const confirmResult = await Swal.fire({
      title: 'Change Product URL?',
      html: `
        <div style="text-align:left">

          <p>
            <strong>Competitor:</strong>
            ${comp_name || 'N/A'}
          </p>

          <p>
            <strong>EAN:</strong>
            ${product_ean_id || 'N/A'}
          </p>

          <p>
            <strong>Item Code:</strong>
            ${product_code || 'N/A'}
          </p>

          <p style="
            word-break:break-all;
            font-size:12px;
            margin-top:10px;
          ">
            ${newProductUrl.trim()}
          </p>

        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Change',
      cancelButtonText: 'Cancel'
    });

    if (!confirmResult.isConfirmed) {
      return;
    }


    try {

      setIsSaving(true);

      Swal.fire({
        title: 'Updating URL...',
        text: 'Please wait',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });


      /*
       * IMPORTANT:
       * Change this endpoint to your actual backend route.
       */
      
      
      var product_url = newProductUrl.trim()
      await updateProductCompetitor(unique_id, cmpid, comp_name, product_url, product_ean_id, product_code);

      await Swal.fire({
        icon: 'success',
        title: 'URL Changed!',
        text: 'Competitor product URL updated successfully.',
        confirmButtonColor: '#22c55e'
      });


      setNewProductUrl('');
      setShowChangeUrl(false);
      setShowActions(false);

    } catch (error) {

      console.error('Change URL error:', error);

      await Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text:
          error.response?.data?.message ||
          'Failed to change product URL.',
        confirmButtonColor: '#d33'
      });

    } finally {
      window.location.reload();
      setIsSaving(false);
    }
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="relative flex items-center shrink-0 whitespace-nowrap">

      {/* EDIT BUTTON */}
      {!showActions && !showChangeUrl && (
        <button
          type="button"
          onClick={() => setShowActions(true)}
          disabled={isUpdating || isSaving}
          className="
            group
            flex items-center justify-center
            h-8 w-8 rounded-full
            bg-slate-50 border border-slate-200
            text-slate-500
            hover:bg-indigo-50
            hover:border-indigo-300
            hover:text-indigo-600
            hover:rotate-90
            transition-all duration-300
            shrink-0 ml-1
            focus:outline-none focus:ring-2 focus:ring-indigo-400/50
            disabled:opacity-50 disabled:cursor-not-allowed
          "
          title="Settings"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      )}


      {/* ACTION BUTTONS */}
      {showActions && !showChangeUrl && (
        <div className="flex items-center gap-1">
          
          {/* REFRESH - Only show if product_status is "completed" */}
          {url_status &&(
            <button
              type="button"
              onClick={handleRefreshClick}
              disabled={isUpdating || isSaving}
              className="
                flex items-center justify-center
                h-6 w-6 rounded-full
                border border-green-200
                bg-green-50 text-green-600
                hover:bg-green-500
                hover:text-white
                hover:border-green-500
                hover:shadow-sm
                transition-all
              "
              title="Refresh product"
            >
              <RefreshCcw
                size={13}
                className={isUpdating ? 'animate-spin' : ''}
              />
            </button>
          )}

          {/* DELETE - Only show if product_status is "completed" */}
          {product_status === "completed" && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isUpdating || isSaving}
              className="
                flex items-center justify-center
                h-6 w-6 rounded-full
                border border-red-200
                bg-red-50 text-red-600
                hover:bg-red-500
                hover:text-white
                hover:border-red-500
                hover:shadow-sm
                transition-all
              "
              title="Delete product"
            >
              <Trash2 size={13} />
            </button>
          )}

          {/* CHANGE URL - Show for both "completed" and "pending" */}
          <button
            type="button"
            onClick={() => setShowChangeUrl(true)}
            disabled={isUpdating || isSaving}
            className="
              flex items-center justify-center
              h-6 w-6 rounded-full
              border border-amber-200
              bg-amber-50 text-amber-600
              hover:bg-amber-500
              hover:text-white
              hover:border-amber-500
              hover:shadow-sm
              transition-all
            "
            title="Change product URL"
          >
            <Repeat2 size={13} />
          </button>

          {/* CLOSE */}
          <button
            type="button"
            onClick={() => setShowActions(false)}
            disabled={isUpdating || isSaving}
            className="
              flex items-center justify-center
              h-6 w-6 rounded-full
              border border-gray-200
              bg-gray-50 text-gray-500
              hover:bg-gray-500
              hover:text-white
              hover:border-gray-500
              transition-all
            "
            title="Close"
          >
            <X size={13} />
          </button>

        </div>
      )}


      {/* CHANGE URL */}
      {showChangeUrl && (
        <div className="flex items-center gap-1">

          <input
            type="url"
            value={newProductUrl}
            onChange={(e) => setNewProductUrl(e.target.value)}
            placeholder="Enter new product URL"
            autoFocus
            disabled={isSaving}
            className="
              h-7
              w-[100px]
              px-2
              text-[11px]
              rounded-md
              border
              border-amber-300
              bg-white
              dark:bg-gray-800
              dark:border-gray-600
              dark:text-white
              outline-none
              focus:ring-1
              focus:ring-amber-400
            "
          />

          {/* SAVE */}
          <button
            type="button"
            onClick={handleChangeUrl}
            disabled={isSaving}
            className="
              flex items-center justify-center
              h-6 w-6 rounded-full
              border border-green-200
              bg-green-50 text-green-600
              hover:bg-green-500
              hover:text-white
              hover:border-green-500
              transition-all
            "
            title="Save URL"
          >
            <Check size={13} />
          </button>

          {/* CANCEL */}
          <button
            type="button"
            onClick={() => {
              setShowChangeUrl(false);
              setNewProductUrl('');
            }}
            disabled={isSaving}
            className="
              flex items-center justify-center
              h-6 w-6 rounded-full
              border border-gray-200
              bg-gray-50 text-gray-500
              hover:bg-gray-500
              hover:text-white
              transition-all
            "
            title="Cancel"
          >
            <X size={13} />
          </button>

        </div>
      )}

    </div>
  );

};

export default SingleProductUpdation;