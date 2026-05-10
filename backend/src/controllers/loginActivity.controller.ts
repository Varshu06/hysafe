import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { LoginActivity } from '../models/LoginActivity.model';

export const getLoginActivity = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get login activities, most recent first
    const activities = await LoginActivity.find({ userId })
      .sort({ loginAt: -1 })
      .limit(50) // Limit to last 50 logins
      .lean();

    res.json({
      activities: activities.map((activity) => ({
        id: activity._id,
        deviceInfo: activity.deviceInfo || 'Unknown Device',
        ipAddress: activity.ipAddress || 'Unknown',
        location: activity.location || 'Unknown',
        loginAt: activity.loginAt,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching login activity:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch login activity' });
  }
};



