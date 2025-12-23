import React, { useEffect, useState } from 'react';
import { X, AlertCircle, Info, Megaphone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Announcement {
  id: string;
  title: string;
  content: string;
  target_audience: 'all' | 'merchants' | 'customers';
}

export const AnnouncementBanner: React.FC = () => {
  const { user, profile } = useAuth();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    loadAnnouncement();
  }, [user, profile]);

  const loadAnnouncement = async () => {
    try {
      // Get active announcements
      const now = new Date().toISOString();
      const { data: announcements, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('status', 'active')
        .lte('start_date', now)
        .or(`end_date.is.null,end_date.gte.${now}`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      if (!announcements || announcements.length === 0) {
        setIsVisible(false);
        return;
      }

      const activeAnnouncement = announcements[0];

      // Check target audience
      const shouldShow = shouldShowForUser(activeAnnouncement.target_audience);
      if (!shouldShow) {
        setIsVisible(false);
        return;
      }

      // Check if user has dismissed this announcement
      if (user) {
        const { data: dismissed } = await supabase
          .from('announcement_dismissed_by_users')
          .select('id')
          .eq('announcement_id', activeAnnouncement.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (dismissed) {
          setIsVisible(false);
          return;
        }
      } else {
        // For non-authenticated users, check localStorage
        const dismissedAnnouncements = JSON.parse(
          localStorage.getItem('dismissedAnnouncements') || '[]'
        );
        if (dismissedAnnouncements.includes(activeAnnouncement.id)) {
          setIsVisible(false);
          return;
        }
      }

      // Show announcement
      setAnnouncement(activeAnnouncement);
      setTimeout(() => setIsVisible(true), 100);
    } catch (err: any) {
      console.error('Load announcement error:', err);
    }
  };

  const shouldShowForUser = (targetAudience: string): boolean => {
    if (targetAudience === 'all') return true;

    if (!profile) return targetAudience === 'all';

    if (targetAudience === 'merchants') {
      return profile.role === 'seller' || profile.role === 'admin' || profile.role === 'superadmin';
    }

    if (targetAudience === 'customers') {
      return profile.role === 'customer' || profile.role === 'user';
    }

    return false;
  };

  const handleDismiss = async () => {
    if (!announcement) return;

    setIsClosing(true);

    try {
      if (user) {
        // For authenticated users, save to database
        await supabase
          .from('announcement_dismissed_by_users')
          .insert({
            announcement_id: announcement.id,
            user_id: user.id,
          });
      } else {
        // For non-authenticated users, save to localStorage
        const dismissedAnnouncements = JSON.parse(
          localStorage.getItem('dismissedAnnouncements') || '[]'
        );
        dismissedAnnouncements.push(announcement.id);
        localStorage.setItem('dismissedAnnouncements', JSON.stringify(dismissedAnnouncements));
      }

      // Fade out animation
      setTimeout(() => {
        setIsVisible(false);
        setAnnouncement(null);
      }, 300);
    } catch (err: any) {
      console.error('Dismiss error:', err);
    }
  };

  if (!announcement || !isVisible) return null;

  return (
    <div
      className={`w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md transition-all duration-300 ${
        isClosing ? 'opacity-0 -translate-y-full' : 'opacity-100 translate-y-0'
      }`}
      style={{
        animation: isVisible && !isClosing ? 'slideDown 0.3s ease-out' : 'none',
      }}
    >
      <style>
        {`
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-100%);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>

      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0">
              <Megaphone className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm md:text-base">{announcement.title}</p>
              <p className="text-sm text-blue-50 mt-0.5">{announcement.content}</p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1.5 hover:bg-blue-700 rounded-lg transition-colors"
            aria-label="إغلاق الإعلان"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
