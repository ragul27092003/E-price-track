
const express = require('express');
const router = express.Router();
const AlertNotification = require('../models/AlertNotification');
const { authenticateToken, checkTenantAccess } = require('../middleware/auth');

// Get notification settings for a tenant
router.get('/notifications/settings/:storeId', 
  authenticateToken, 
  checkTenantAccess,
  async (req, res) => {
    try {
      const { storeId } = req.params;
      const { companyId } = req.user;

      let settings = await AlertNotification.findOne({ 
        storeId, 
        companyId 
      });

      if (!settings) {
        // Create default settings if not exists
        settings = new AlertNotification({
          storeId,
          companyId,
          updatedBy: req.user.user_id || req.user.email
        });
        await settings.save();
      }

      res.status(200).json({
        success: true,
        data: settings
      });
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notification settings',
        error: error.message
      });
    }
  }
);



// Toggle a specific notification type
router.patch('/notifications/settings/:storeId/toggle',
  authenticateToken,
  checkTenantAccess,
  async (req, res) => {
    try {
      const { storeId } = req.params;
      const { companyId } = req.user;
      const { type, enabled } = req.body;

      if (!type || !['payment', 'admin', 'festival'].includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid notification type'
        });
      }

      const updatePath = `types.${type}.enabled`;
      
      const settings = await AlertNotification.findOneAndUpdate(
        { storeId, companyId },
        {
          $set: {
            [updatePath]: enabled,
            updatedBy: req.user.user_id || req.user.email,
            updatedAt: new Date()
          }
        },
        { 
          new: true, 
          upsert: true 
        }
      );

      // Update enabledNotifications array
      const enabledTypes = ['payment', 'admin', 'festival'].filter(t => 
        settings.types[t].enabled
      );
      
      await AlertNotification.findOneAndUpdate(
        { storeId, companyId },
        { $set: { enabledNotifications: enabledTypes } }
      );

      res.status(200).json({
        success: true,
        message: 'Notification toggled successfully',
        data: settings
      });
    } catch (error) {
      console.error('Error toggling notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle notification',
        error: error.message
      });
    }
  }
);

// Get only enabled notifications for a tenant (for TopBar)
router.get('/notifications/enabled/:storeId',
  authenticateToken,
  checkTenantAccess,
  async (req, res) => {
    try {
      const { storeId } = req.params;
      const { companyId } = req.user;

      const settings = await AlertNotification.findOne({ 
        storeId, 
        companyId 
      });

      if (!settings) {
        return res.status(200).json({
          success: true,
          data: {
            enabledNotifications: [],
            types: {}
          }
        });
      }

      // Get only enabled types with their messages
      const enabledTypes = {};
      Object.keys(settings.types).forEach(type => {
        if (settings.types[type].enabled) {
          enabledTypes[type] = {
            enabled: true,
            message: settings.types[type].message || settings.types[type].aiMessage || settings.types[type].defaultMessage,
            daysRemaining: settings.types[type].daysRemaining || null,
            title: type === 'payment' ? 'Payment Reminder' : 
                   type === 'admin' ? 'Admin Message' : 'Festival Wishes',
            color: type === 'payment' ? 'blue' : 
                   type === 'admin' ? 'purple' : 'amber'
          };
        }
      });

      res.status(200).json({
        success: true,
        data: {
          enabledNotifications: settings.enabledNotifications || [],
          types: enabledTypes
        }
      });
    } catch (error) {
      console.error('Error fetching enabled notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch enabled notifications',
        error: error.message
      });
    }
  }
);

module.exports = router;