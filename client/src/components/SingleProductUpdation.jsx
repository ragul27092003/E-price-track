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
      const updatedData = response.data;

      // Check the updated product status
      if (updatedData?.product_price === "No Result" && updatedData?.product_stock === "No Result") {
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