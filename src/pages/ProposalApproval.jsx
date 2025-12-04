import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';

export default function ProposalApproval() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  
  const [proposal, setProposal] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [signerName, setSignerName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  // Fetch proposal on mount
  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      setError('No token provided');
      return;
    }

    const fetchProposal = async () => {
      try {
        const response = await fetch(`/api/logProposalView?token=${encodeURIComponent(token)}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        
        if (data.error) {
          setError(data.error);
        } else {
          setProposal(data.proposal);
          // Log view
          fetch('/api/logProposalView', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, action: 'viewed' })
          }).catch(() => {});
        }
      } catch (err) {
        setError('Failed to load proposal');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProposal();
  }, [token]);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      const ctx = canvas.getContext('2d');
      ctx.scale(2, 2);
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctxRef.current = ctx;
    }
  }, [proposal]);

  const startDrawing = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctxRef.current.lineTo(x, y);
    ctxRef.current.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    ctxRef.current.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSubmit = async () => {
    if (!signerName || !agreed) return;
    
    setSubmitting(true);
    try {
      const signatureData = canvasRef.current.toDataURL();
      
      await fetch('/api/logProposalView', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token, 
          action: 'approved',
          signerName: signerName,
          signatureData: signatureData,
          details: `Approved and signed by ${signerName}`
        })
      });
      
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0069AF]" />
      </div>
    );
  }

  if (!proposal || error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Proposal Not Found</h1>
          <p className="text-slate-500">{error || 'This proposal link is invalid or has expired.'}</p>
        </div>
      </div>
    );
  }

  if (proposal.status === 'approved' || submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md"
        >
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Proposal Approved!</h1>
          <p className="text-slate-500 mb-4">Thank you for approving this proposal. We'll be in touch shortly.</p>
          {proposal.signer_name && (
            <p className="text-sm text-slate-400">
              Signed by {proposal.signer_name} on {proposal.signed_date && format(new Date(proposal.signed_date), 'MMMM d, yyyy')}
            </p>
          )}
        </motion.div>
      </div>
    );
  }

  if (proposal.status === 'rejected') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Proposal Declined</h1>
          <p className="text-slate-500">This proposal has been declined.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6"
        >
          <div className="bg-[#133F5C] text-white p-6">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-6 h-6" />
              <span className="text-sm opacity-80">{proposal.proposal_number}</span>
            </div>
            <h1 className="text-2xl font-bold">{proposal.title}</h1>
          </div>
          <div className="p-6 border-b border-slate-100">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-slate-400 uppercase mb-1">Prepared For</p>
                <p className="font-medium text-slate-900">{proposal.customer_name}</p>
                {proposal.customer_company && <p className="text-sm text-slate-500">{proposal.customer_company}</p>}
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 uppercase mb-1">Valid Until</p>
                <p className="font-medium text-slate-900">
                  {proposal.valid_until ? format(new Date(proposal.valid_until), 'MMMM d, yyyy') : 'No expiration'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Line Items */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg p-6 mb-6"
        >
          <h2 className="font-semibold text-slate-900 mb-4">Items & Services</h2>
          <div className="space-y-3">
            {proposal.items?.map((item, idx) => {
              const lineTotal = (item.quantity || 0) * (item.unit_price || 0) * (1 - (item.discount_percent || 0) / 100);
              return (
                <div key={idx} className="flex justify-between items-start py-3 border-b border-slate-100 last:border-0">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{item.name}</p>
                    {item.description && <p className="text-sm text-slate-500">{item.description}</p>}
                    <p className="text-xs text-slate-400 mt-1">
                      {item.quantity} × ${item.unit_price?.toFixed(2)}
                      {item.discount_percent > 0 && ` (${item.discount_percent}% off)`}
                    </p>
                  </div>
                  <p className="font-semibold text-slate-900">${lineTotal.toFixed(2)}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="flex justify-between text-2xl font-bold">
              <span>Total</span>
              <span className="text-[#0069AF]">${proposal.total?.toFixed(2)}</span>
            </div>
          </div>
        </motion.div>

        {/* Terms */}
        {proposal.terms_conditions && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg p-6 mb-6"
          >
            <h2 className="font-semibold text-slate-900 mb-3">Terms & Conditions</h2>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{proposal.terms_conditions}</p>
          </motion.div>
        )}

        {/* Signature Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h2 className="font-semibold text-slate-900 mb-4">Approve & Sign</h2>
          
          <div className="space-y-4">
            <div>
              <Label>Your Full Name</Label>
              <Input
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Enter your full name"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Signature</Label>
              <div className="mt-1 border-2 border-slate-200 rounded-xl overflow-hidden bg-white">
                <canvas
                  ref={canvasRef}
                  className="w-full h-32 cursor-crosshair touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <Button variant="ghost" size="sm" onClick={clearSignature} className="mt-1 text-slate-500">
                Clear Signature
              </Button>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox checked={agreed} onCheckedChange={setAgreed} className="mt-0.5" />
              <span className="text-sm text-slate-600">
                I agree to the terms and conditions outlined in this proposal and authorize the work to proceed.
              </span>
            </label>

            <Button
              onClick={handleSubmit}
              disabled={!signerName || !agreed || submitting}
              className="w-full bg-[#0069AF] hover:bg-[#133F5C] h-12 text-lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Approve Proposal
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}