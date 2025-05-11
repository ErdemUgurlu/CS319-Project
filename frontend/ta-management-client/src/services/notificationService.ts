import api from './api';
import { Notification } from '../interfaces/notification'; // Assuming an interface will be created

const notificationService = {
  getMyNotifications: async (): Promise<Notification[]> => {
    try {
      const response = await api.get('/accounts/notifications/');
      // The actual data might be in response.data or response.data.results depending on backend pagination
      return response.data?.results || response.data || []; 
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  },

  markAsRead: async (notificationId: number): Promise<any> => {
    try {
      const response = await api.post(`/accounts/notifications/${notificationId}/read/`);
      return response.data;
    } catch (error) {
      console.error(`Error marking notification ${notificationId} as read:`, error);
      throw error;
    }
  },

  markAllAsRead: async (): Promise<any> => {
    try {
      const response = await api.post('/accounts/notifications/mark-all-read/');
      return response.data;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }
};

export default notificationService; 