import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquarePlus, X, Upload, Image, Loader2, Send, Bug, Lightbulb, HelpCircle, MessageCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { api } from '@/api/apiClient';
import { cn } from '@/lib/utils';

const feedbackTypes = [
  { value: 'bug', label: 'Bug Report', icon: Bug, color: 'bg-red-100 text-red-600 border-red-200' },
  { value: 'feature_request', label: 'Feature Request', icon: Lightbulb, color: 'bg-amber-100 text-amber-600 border-amber-200' },
  { value: 'question', label: 'Question', icon: HelpCircle, color: 'bg-blue-100 text-blue-600 border-blue-200' },
  { value: 'general', label: 'General Feedback', icon: MessageCircle, color: 'bg-slate-100 text-slate-600 border-slate-200' },
];

const priorityOptions = [
  { value: 'low', label: 'Low', color: 'bg-slate-100 text-slate-600' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-100 text-amber-700' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-700' },
];

export default function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'general',
    priority: 'medium',
    screenshots: []
  });

  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;

    setUploadingImage(true);
    const newScreenshots = [...formData.screenshots];

    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const { file_url } = await api.integrations.Core.UploadFile({ file });
        newScreenshots.push(file_url);
      }
    }

    setFormData(prev => ({ ...prev, screenshots: newScreenshots }));
    setUploadingImage(false);
    e.target.value = '';
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        setUploadingImage(true);
        const file = item.getAsFile();
        if (file) {
          const { file_url } = await api.integrations.Core.UploadFile({ file });
          setFormData(prev => ({ ...prev, screenshots: [...prev.screenshots, file_url] }));
        }
        setUploadingImage(false);
        break;
      }
    }
  };

  const removeScreenshot = (index) => {
    setFormData(prev => ({
      ...prev,
      screenshots: prev.screenshots.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.description.trim()) return;

    setSubmitting(true);
    
    let user = null;
    try {
      user = await api.auth.me();
    } catch (e) {}

    await api.entities.Feedback.create({
      ...formData,
      page_url: window.location.href,
      user_agent: navigator.userAgent,
      submitter_name: user?.full_name || 'Anonymous',
      submitter_email: user?.email || ''
    });

    setSubmitting(false);
    setSubmitted(true);
    
    setTimeout(() => {
      setIsOpen(false);
      setSubmitted(false);
      setFormData({
        title: '',
        description: '',
        type: 'general',
        priority: 'medium',
        screenshots: []
      });
    }, 2000);
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-50 p-4 rounded-full bg-[#0069AF] text-white shadow-xl hover:bg-[#005a96] transition-colors"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <MessageSquarePlus className="w-6 h-6" />
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              className="fixed bottom-24 left-6 z-50 w-[420px] max-h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
              onPaste={handlePaste}
            >
              {/* Header */}
              <div className="p-4 border-b bg-gradient-to-r from-[#0069AF] to-[#0F2F44] text-white flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">Send Feedback</h3>
                  <p className="text-sm text-white/70">Help us improve your experience</p>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-12 text-center"
                >
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Send className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h4 className="text-xl font-semibold text-slate-900 mb-2">Thank you!</h4>
                  <p className="text-slate-500">Your feedback has been submitted.</p>
                </motion.div>
              ) : (
                <>
                  {/* Content */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Feedback Type */}
                    <div>
                      <Label className="text-sm font-medium text-slate-700 mb-2 block">What type of feedback?</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {feedbackTypes.map((type) => {
                          const Icon = type.icon;
                          return (
                            <button
                              key={type.value}
                              onClick={() => setFormData(prev => ({ ...prev, type: type.value }))}
                              className={cn(
                                "flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium",
                                formData.type === type.value
                                  ? type.color + " border-current"
                                  : "border-slate-200 text-slate-600 hover:border-slate-300"
                              )}
                            >
                              <Icon className="w-4 h-4" />
                              {type.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Title */}
                    <div>
                      <Label className="text-sm font-medium text-slate-700 mb-2 block">Summary *</Label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Brief description of your feedback"
                        className="w-full"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <Label className="text-sm font-medium text-slate-700 mb-2 block">Details *</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Please provide as much detail as possible. You can paste screenshots directly (Ctrl+V)."
                        className="w-full min-h-[120px]"
                      />
                    </div>

                    {/* Priority */}
                    <div>
                      <Label className="text-sm font-medium text-slate-700 mb-2 block">Priority</Label>
                      <div className="flex gap-2">
                        {priorityOptions.map((priority) => (
                          <button
                            key={priority.value}
                            onClick={() => setFormData(prev => ({ ...prev, priority: priority.value }))}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                              formData.priority === priority.value
                                ? priority.color + " ring-2 ring-offset-1 ring-current"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            )}
                          >
                            {priority.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Screenshots */}
                    <div>
                      <Label className="text-sm font-medium text-slate-700 mb-2 block">Screenshots</Label>
                      <div className="space-y-3">
                        {/* Upload area */}
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-[#0069AF] hover:bg-slate-50 transition-all"
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                          {uploadingImage ? (
                            <Loader2 className="w-6 h-6 mx-auto animate-spin text-[#0069AF]" />
                          ) : (
                            <>
                              <Upload className="w-6 h-6 mx-auto text-slate-400 mb-2" />
                              <p className="text-sm text-slate-500">Click to upload or paste (Ctrl+V)</p>
                            </>
                          )}
                        </div>

                        {/* Preview screenshots */}
                        {formData.screenshots.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {formData.screenshots.map((url, idx) => (
                              <div key={idx} className="relative group">
                                <img
                                  src={url}
                                  alt={`Screenshot ${idx + 1}`}
                                  className="w-20 h-20 object-cover rounded-lg border border-slate-200"
                                />
                                <button
                                  onClick={() => removeScreenshot(idx)}
                                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-4 border-t bg-slate-50">
                    <Button
                      onClick={handleSubmit}
                      disabled={!formData.title.trim() || !formData.description.trim() || submitting}
                      className="w-full bg-[#0069AF] hover:bg-[#005a96]"
                    >
                      {submitting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      Submit Feedback
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}