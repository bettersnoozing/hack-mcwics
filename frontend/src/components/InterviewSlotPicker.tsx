import { useState, useEffect } from 'react';
import { Calendar, Clock, Check, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { SkeletonCard } from './ui/SkeletonCard';
import { EmptyStateCard } from './ui/EmptyStateCard';
import { EmailPreviewModal, generateInterviewScheduledEmail } from './EmailPreviewModal';
import { useApi } from '../contexts/ApiContext';
import { useOutbox } from '../contexts/OutboxContext';
import { useToast } from '../contexts/ToastContext';
import type { Application, InterviewSlot } from '../contracts';

interface InterviewSlotPickerProps {
  open: boolean;
  onClose: () => void;
  application: Application;
  onSlotBooked: (slot: InterviewSlot) => void;
}

export function InterviewSlotPicker({ open, onClose, application, onSlotBooked }: InterviewSlotPickerProps) {
  const api = useApi();
  const { addEmail } = useOutbox();
  const { showToast } = useToast();
  
  const [slots, setSlots] = useState<InterviewSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<InterviewSlot | null>(null);
  const [booking, setBooking] = useState(false);
  
  // Email preview
  const [emailPreview, setEmailPreview] = useState<{ to: string; subject: string; body: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.listInterviewSlots(application.positionId).then((s) => {
      setSlots(s);
      setLoading(false);
    });
  }, [open, api, application.positionId]);

  const availableSlots = slots.filter((s) => s.bookedCount < s.capacity);

  const handleSelectSlot = (slot: InterviewSlot) => {
    setSelectedSlot(slot);
  };

  const handleConfirmSlot = () => {
    if (!selectedSlot) return;
    
    // Generate email preview
    const timeStr = `${new Date(selectedSlot.startTime).toLocaleDateString()} at ${new Date(selectedSlot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const email = generateInterviewScheduledEmail({
      studentEmail: application.applicantEmail,
      studentName: application.applicantName,
      clubName: application.clubName,
      positionTitle: application.positionTitle,
      timeSlot: timeStr,
    });
    setEmailPreview(email);
  };

  const confirmBooking = async () => {
    if (!selectedSlot || !emailPreview) return;
    
    setBooking(true);
    try {
      // Book the slot
      const updated = await api.bookInterviewSlot(application.id, selectedSlot.id, application.applicantName);
      
      // Update application status to interview_scheduled
      await api.updateApplicationStatus(application.id, 'interview_scheduled');
      
      // Add email to outbox
      addEmail(emailPreview);
      
      showToast('Interview slot booked successfully!');
      onSlotBooked(updated);
      onClose();
    } catch {
      showToast('Failed to book slot. Please try again.');
    } finally {
      setBooking(false);
      setEmailPreview(null);
    }
  };

  const cancelEmailPreview = () => {
    setEmailPreview(null);
  };

  // Group slots by date
  const slotsByDate = availableSlots.reduce((acc, slot) => {
    const date = new Date(slot.startTime).toLocaleDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(slot);
    return acc;
  }, {} as Record<string, InterviewSlot[]>);

  return (
    <>
      <Dialog open={open && !emailPreview} onClose={onClose}>
        <div className="flex items-center gap-2 text-warmGray-800 mb-1">
          <Calendar size={18} className="text-brand-500" />
          <span className="font-semibold">Pick an Interview Time</span>
        </div>
        <p className="text-sm text-warmGray-500 mb-4">
          Select your preferred time slot for your {application.positionTitle} interview at {application.clubName}
        </p>

        <div className="max-h-72 overflow-y-auto -mx-2 px-2">
          {loading ? (
            <div className="space-y-3">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : availableSlots.length === 0 ? (
            <EmptyStateCard 
              emoji="📅" 
              title="No slots available" 
              description="All interview slots have been booked. Please contact the club for alternative arrangements."
            />
          ) : (
            <div className="space-y-4">
              {Object.entries(slotsByDate).map(([date, dateSlots]) => (
                <div key={date}>
                  <h3 className="text-xs font-semibold text-warmGray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <Calendar size={12} />
                    {date}
                  </h3>
                  <div className="space-y-2">
                    {dateSlots.map((slot) => {
                      const isSelected = selectedSlot?.id === slot.id;
                      const spotsLeft = slot.capacity - slot.bookedCount;
                      
                      return (
                        <motion.button
                          key={slot.id}
                          onClick={() => handleSelectSlot(slot)}
                          className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'border-brand-400 bg-brand-50/50 ring-2 ring-brand-400/30'
                              : 'border-warmGray-200 bg-white hover:border-warmGray-300 hover:bg-warmGray-50/50'
                          }`}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                              isSelected ? 'bg-brand-100 text-brand-600' : 'bg-warmGray-100 text-warmGray-500'
                            }`}>
                              <Clock size={18} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-warmGray-800">
                                {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {' - '}
                                {new Date(slot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              <p className="text-xs text-warmGray-500">{slot.duration} minutes</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={spotsLeft <= 1 ? 'warning' : 'default'} className="text-xs">
                              <Users size={10} className="mr-1" />
                              {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left
                            </Badge>
                            {isSelected && (
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-white">
                                <Check size={14} />
                              </div>
                            )}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="cozyGradient"
            onClick={handleConfirmSlot}
            disabled={!selectedSlot || booking}
          >
            {booking ? 'Booking...' : 'Confirm Time'}
          </Button>
        </div>
      </Dialog>

      {/* Email Preview Modal */}
      <EmailPreviewModal
        open={!!emailPreview}
        onClose={cancelEmailPreview}
        onConfirm={confirmBooking}
        email={emailPreview}
      />
    </>
  );
}
