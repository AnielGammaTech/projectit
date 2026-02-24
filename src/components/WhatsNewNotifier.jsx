import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Sparkles, Rocket, Bug, Star, Wrench } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { changelog, CURRENT_VERSION } from '@/changelog';

const STORAGE_KEY = 'projectit_last_seen_version';

const changeTypeConfig = {
  feature: { icon: Rocket, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', label: 'New' },
  fix: { icon: Bug, color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', label: 'Fix' },
  improvement: { icon: Star, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', label: 'Improved' },
  breaking: { icon: Wrench, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', label: 'Breaking' },
};

export default function WhatsNewNotifier() {
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    const lastSeen = localStorage.getItem(STORAGE_KEY);
    if (lastSeen === CURRENT_VERSION) return;

    // Small delay so the app settles before showing
    const timer = setTimeout(() => {
      toast(
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => {
            setShowDialog(true);
            toast.dismiss();
          }}
        >
          <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span className="text-sm font-medium">See what&apos;s new in v{CURRENT_VERSION}</span>
        </div>,
        {
          duration: 8000,
          position: 'bottom-right',
          dismissible: true,
          onDismiss: () => {
            localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
          },
        }
      );
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setShowDialog(false);
    localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
  };

  return (
    <Dialog open={showDialog} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            What&apos;s New
          </DialogTitle>
          <DialogDescription>
            Latest updates and improvements to ProjectIT
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {changelog.map((release, idx) => (
              <div key={release.version}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    v{release.version}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{release.date}</span>
                </div>
                {release.title && (
                  <h3 className="font-semibold text-sm mb-2">{release.title}</h3>
                )}
                <ul className="space-y-1.5">
                  {release.changes.map((change, i) => {
                    const config = changeTypeConfig[change.type] || changeTypeConfig.feature;
                    return (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Badge className={`${config.color} text-[10px] px-1.5 py-0 flex-shrink-0 mt-0.5 border-0`}>
                          {config.label}
                        </Badge>
                        <span className="text-slate-700 dark:text-slate-300">{change.text}</span>
                      </li>
                    );
                  })}
                </ul>
                {idx < changelog.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="flex justify-end pt-2">
          <Button onClick={handleClose} className="bg-[#0069AF] hover:bg-[#133F5C]">
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
