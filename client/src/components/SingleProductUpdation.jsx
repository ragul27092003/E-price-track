import React, { useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import Swal from 'sweetalert2';
import axios from 'axios';

const SingleProductUpdation = ({ product_ean_id, product_code, product_name, comp_name, cmpid }) => {

  const [isUpdating, setIsUpdating] = useState(false);
  
  const handleRefreshClick = async () => {
    // Show confirmation dialog
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

    // Start the update process
    setIsUpdating(true);

    try {
      // Construct the URL with product details
      const updateUrl = `${import.meta.env.VITE_SCRAPE_DOMAIN}/${comp_name}?cmpid=plm_user_info_${cmpid}&ean=${product_ean_id || ''}&itemcode=${product_code || ''}`;

      // Show loading state
      Swal.fire({
        title: 'Updating...',
        text: 'Please wait while we fetch the latest product data',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Make API call to update product
      const response = await axios.get(updateUrl);
      const updatedData = response.data.data[0];
    
      // Check the updated product status

      {/* if (updatedData?.product_price === "No Result" && updatedData?.product_stock === "No Result") {
        // Product not available
        await Swal.fire({
          icon: 'error',
          title: 'Product Not Available',
          text: 'Product is not available on the website',
          confirmButtonColor: '#3085d6'
        });
      } else if (updatedData?.product_price === "No Result" || updatedData?.product_stock === "No Result") {
        // Partial data available
        await Swal.fire({
          icon: 'warning',
          title: 'Partial Product Data',
          html: `
            <div style="text-align: left;">
              <p><strong>Product Name:</strong> ${product_name || 'N/A'}</p>
              <p><strong>Product Price:</strong> ${updatedData?.product_price || 'N/A'}</p>
              <p><strong>Product Stock:</strong> ${updatedData?.product_stock || 'N/A'}</p>
              <p><strong>Last Updated:</strong> ${updatedData?.modified_date || 'N/A'}</p>
            </div>
          `,
          confirmButtonColor: '#3085d6'
        });
      } else {
        // Product updated successfully with full data
        await Swal.fire({
          icon: 'success',
          title: 'Product Updated Successfully!',
          html: `
            <div style="text-align: left;">
              <p><strong>Product Name:</strong> ${product_name || 'N/A'}</p>
              <p><strong>Product Price:</strong> ₹${updatedData?.product_price || 'N/A'}</p>
              <p><strong>Product Stock:</strong> ${updatedData?.product_stock || 'N/A'}</p>
              <p><strong>Last Updated:</strong> ${updatedData?.modified_date || 'N/A'}</p>
            </div>
          `,
          confirmButtonColor: '#3085d6'
        });
      } */}

      if (updatedData?.product_price === "No Result" && updatedData?.product_stock === "No Result") {
  // Product not available
  await Swal.fire({
    icon: 'error',
    title: '🚫 Product Not Available',
    text: 'Product is not available on the website',
    confirmButtonColor: '#3085d6',
    confirmButtonText: 'Got it',
    background: '#fff5f5',
    heightAuto: false,
    padding: '1.5rem'
  });
} else if (updatedData?.product_price === "No Result" || updatedData?.product_stock === "No Result") {
  // Partial data available
  await Swal.fire({
    icon: 'warning',
    title: '⚠️ Partial Data',
    html: `
      <div style="padding: 5px 0;">
        <!-- Product Name - Compact -->
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; padding: 8px 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; color: white;">
          <span style="font-size: 20px;">📦</span>
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 11px; opacity: 0.8;">Product</div>
            <div style="font-weight: 600; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${product_name || 'N/A'}</div>
          </div>
        </div>
        
        <!-- Price & Stock - Compact Grid -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; max-height: 90px;">
          <div style="padding: 10px; background: ${updatedData?.product_price === "No Result" ? '#fee2e2' : '#f0fdf4'}; border-radius: 8px; border-left: 3px solid ${updatedData?.product_price === "No Result" ? '#ef4444' : '#22c55e'};">
            <div style="display: flex; align-items: center; gap: 4px; font-size: 11px; color: #6b7280;">
              <span>💰</span> Price
            </div>
            <div style="font-size: 18px; font-weight: 700; color: ${updatedData?.product_price === "No Result" ? '#ef4444' : '#22c55e'};">
              ${updatedData?.product_price === "No Result" ? '❌' : '₹' + updatedData?.product_price}
            </div>
          </div>
          
          <div style="padding: 10px; background: ${updatedData?.product_stock === "No Result" ? '#fee2e2' : '#f0fdf4'}; border-radius: 8px; border-left: 3px solid ${updatedData?.product_stock === "No Result" ? '#ef4444' : '#22c55e'};">
            <div style="display: flex; align-items: center; gap: 4px; font-size: 11px; color: #6b7280;">
              <span>📊</span> Stock
            </div>
            <div style="font-size: 18px; font-weight: 700; color: ${updatedData?.product_stock === "No Result" ? '#ef4444' : '#22c55e'};">
              ${updatedData?.product_stock === "No Result" ? '❌' : updatedData?.product_stock}
            </div>
          </div>
        </div>
        
        <!-- Updated Date - Compact -->
        <div style="margin-top: 10px; padding: 6px 10px; background: #f3f4f6; border-radius: 6px; font-size: 12px; color: #6b7280; text-align: center;">
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
} else {
  // Product updated successfully with full data
  await Swal.fire({
    icon: 'success',
    title: '✅ Updated!',
    html: `
      <div style="padding: 5px 0;">
        <!-- Product Header - Compact -->
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; padding: 8px 12px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 8px; color: white;">
          <span style="font-size: 20px;">🎉</span>
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 11px; opacity: 0.8;">Product Name</div>
            <div style="font-weight: 600; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${product_name || 'N/A'}</div>
          </div>
        </div>
        
        <!-- Price & Stock Cards - Compact -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; max-height: 100px;">
          <div style="padding: 10px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 10px; border: 2px solid #22c55e; text-align: center;">
            <div style="font-size: 11px; font-weight: 600; color: #16a34a;">💰 PRICE</div>
            <div style="font-size: 22px; font-weight: 700; color: #16a34a;">₹${updatedData?.product_price || 'N/A'}</div>
            <div style="font-size: 10px; color: #22c55e;">✓ Available</div>
          </div>
          
          <div style="padding: 10px; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 10px; border: 2px solid #3b82f6; text-align: center;">
            <div style="font-size: 11px; font-weight: 600; color: #2563eb;">📦 STOCK</div>
            <div style="font-size: 22px; font-weight: 700; color: #2563eb;">${updatedData?.product_stock || 'N/A'}</div>
            <div style="font-size: 10px; color: #3b82f6;">✓ In Stock</div>
          </div>
        </div>
        
        <!-- Footer Info - Compact -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 10px; padding: 6px 10px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 11px;">
          <span style="color: #475569;">🔄 Updated</span>
          <span style="font-weight: 600; color: #0f172a;">${updatedData?.modified_date || 'N/A'}</span>
        </div>
        
        <div style="margin-top: 8px; padding: 4px; background: #f0fdf4; border-radius: 4px; text-align: center; font-size: 11px; color: #166534;">
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
       

      

    } catch (error) {
      console.error('Error updating product:', error);
      
      // Check if the error is due to blocked access
      if (error.response?.status === 403 || error.response?.status === 429) {
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
          text: error.response?.data?.message || 'Failed to update product. Please try again later.',
          confirmButtonColor: '#d33'
        });
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex items-center shrink-0 whitespace-nowrap">
      <button
        onClick={handleRefreshClick}
        disabled={isUpdating}
        className="flex items-center justify-center p-1 h-6 w-6 rounded-full border border-green-200 bg-green-50 text-green-600 hover:bg-green-500 hover:text-white hover:border-green-500 hover:shadow-sm transition-all shrink-0 ml-0.5"
        title="Refresh product price"
      >
        <RefreshCcw className={`${isUpdating ? 'animate-spin' : ''} text-xs`} />
      </button>
    </div>
  );
};

export default SingleProductUpdation;