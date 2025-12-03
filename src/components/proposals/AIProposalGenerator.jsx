import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, Loader2, Plus, Wand2, Clock, DollarSign, FileText, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export default function AIProposalGenerator({ open, onClose, customer, project, inventory, onGenerated }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [projectScope, setProjectScope] = useState('');
  const [requirements, setRequirements] = useState('');
  const [budget, setBudget] = useState('');
  const [timeline, setTimeline] = useState('');
  const [generatedProposal, setGeneratedProposal] = useState(null);

  const generateProposal = async () => {
    setLoading(true);
    
    const inventoryContext = inventory?.slice(0, 50).map(i => ({
      name: i.name,
      category: i.category,
      sell_price: i.sell_price,
      description: i.description
    }));

    const prompt = `You are a professional proposal generator for an IT/technology services company. Generate a detailed proposal based on the following information:

CUSTOMER INFORMATION:
- Name: ${customer?.name || 'Not specified'}
- Company: ${customer?.company || customer?.name || 'Not specified'}
- Email: ${customer?.email || 'Not specified'}

PROJECT DETAILS:
- Project Name: ${project?.name || 'New Project'}
- Project Description: ${project?.description || 'Not specified'}
- Scope: ${projectScope}
- Requirements: ${requirements}
- Budget Range: ${budget || 'Not specified'}
- Desired Timeline: ${timeline || 'Not specified'}

AVAILABLE PRODUCTS/SERVICES (use these when relevant):
${JSON.stringify(inventoryContext, null, 2)}

Generate a professional proposal with:
1. Executive summary
2. Scope of work broken into areas/phases
3. Recommended products and services (include items from the inventory when applicable)
4. Timeline estimate with milestones
5. Pricing breakdown
6. Terms and conditions summary

Return as JSON with this structure:
{
  "title": "Proposal title",
  "summary": "Executive summary text",
  "areas": [
    {
      "name": "Area/Phase name",
      "description": "Description for customer",
      "items": [
        {
          "name": "Item name",
          "description": "Item description", 
          "quantity": 1,
          "unit_price": 0,
          "from_inventory": false,
          "inventory_item_id": null
        }
      ]
    }
  ],
  "timeline": {
    "total_days": 30,
    "milestones": [
      { "name": "Milestone", "days": 7 }
    ]
  },
  "estimated_total": 0,
  "terms": "Suggested terms and conditions"
}`;

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            summary: { type: "string" },
            areas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        description: { type: "string" },
                        quantity: { type: "number" },
                        unit_price: { type: "number" },
                        from_inventory: { type: "boolean" },
                        inventory_item_id: { type: "string" }
                      }
                    }
                  }
                }
              }
            },
            timeline: {
              type: "object",
              properties: {
                total_days: { type: "number" },
                milestones: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      days: { type: "number" }
                    }
                  }
                }
              }
            },
            estimated_total: { type: "number" },
            terms: { type: "string" }
          }
        }
      });

      setGeneratedProposal(response);
      setStep(3);
    } catch (error) {
      console.error('AI generation error:', error);
    }
    
    setLoading(false);
  };

  const handleUseProposal = () => {
    if (generatedProposal && onGenerated) {
      onGenerated(generatedProposal);
    }
    onClose();
  };

  const resetAndClose = () => {
    setStep(1);
    setProjectScope('');
    setRequirements('');
    setBudget('');
    setTimeline('');
    setGeneratedProposal(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            AI Proposal Generator
          </DialogTitle>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-2 my-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                step >= s ? "bg-purple-600 text-white" : "bg-slate-200 text-slate-500"
              )}>
                {s}
              </div>
              {s < 3 && <ChevronRight className="w-4 h-4 text-slate-300 mx-1" />}
            </div>
          ))}
        </div>

        {/* Step 1: Project Details */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
              <h3 className="font-medium text-purple-900 mb-1">Describe Your Project</h3>
              <p className="text-sm text-purple-700">Provide details about the project scope and the AI will generate a professional proposal.</p>
            </div>

            {customer && (
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">Customer</p>
                <p className="font-medium">{customer.company || customer.name}</p>
              </div>
            )}

            <div>
              <Label>Project Scope *</Label>
              <Textarea
                value={projectScope}
                onChange={(e) => setProjectScope(e.target.value)}
                placeholder="Describe what this project involves. E.g., 'Network infrastructure upgrade for a 50-employee office including new switches, access points, and cabling'"
                className="mt-1 h-24"
              />
            </div>

            <div>
              <Label>Specific Requirements</Label>
              <Textarea
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="Any specific products, technologies, or requirements. E.g., 'Must support PoE, need guest WiFi network, require redundant internet'"
                className="mt-1 h-20"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={resetAndClose}>Cancel</Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!projectScope}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Budget & Timeline */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
              <h3 className="font-medium text-purple-900 mb-1">Budget & Timeline</h3>
              <p className="text-sm text-purple-700">Optional: Provide budget and timeline constraints for more accurate estimates.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-slate-400" />
                  Budget Range
                </Label>
                <Input
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="e.g., $10,000 - $15,000"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  Desired Timeline
                </Label>
                <Input
                  value={timeline}
                  onChange={(e) => setTimeline(e.target.value)}
                  placeholder="e.g., 2-3 weeks"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl">
              <h4 className="font-medium text-slate-700 mb-2">Summary</h4>
              <p className="text-sm text-slate-600">{projectScope}</p>
              {requirements && (
                <p className="text-sm text-slate-500 mt-2">Requirements: {requirements}</p>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button
                onClick={generateProposal}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate Proposal
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Review Generated Proposal */}
        {step === 3 && generatedProposal && (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
              <h3 className="font-medium text-green-900 mb-1">Proposal Generated!</h3>
              <p className="text-sm text-green-700">Review the AI-generated proposal below. You can edit it after importing.</p>
            </div>

            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-2">{generatedProposal.title}</h3>
                <p className="text-sm text-slate-600 mb-4">{generatedProposal.summary}</p>

                <div className="space-y-3">
                  {generatedProposal.areas?.map((area, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                      <h4 className="font-medium text-slate-900">{area.name}</h4>
                      <p className="text-sm text-slate-500 mb-2">{area.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {area.items?.map((item, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {item.name} × {item.quantity}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-slate-900">
                        ${generatedProposal.estimated_total?.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500">Estimated Total</p>
                    </div>
                    {generatedProposal.timeline && (
                      <div className="text-center">
                        <p className="text-2xl font-bold text-slate-900">
                          {generatedProposal.timeline.total_days}
                        </p>
                        <p className="text-xs text-slate-500">Days</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>Regenerate</Button>
              <Button onClick={handleUseProposal} className="bg-[#0069AF] hover:bg-[#133F5C]">
                <FileText className="w-4 h-4 mr-2" />
                Use This Proposal
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}