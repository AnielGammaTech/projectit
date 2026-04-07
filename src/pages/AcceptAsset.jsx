import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Monitor, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import SignatureCanvas from '@/components/assets/SignatureCanvas';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const DEFAULT_TERMS =
  'I acknowledge receipt of this company asset in the condition described above. ' +
  'I agree to use it responsibly, report any damage or issues promptly, and return it ' +
  'upon request or when my employment ends.';

const STATUS_LOADING = 'loading';
const STATUS_READY = 'ready';
const STATUS_SUBMITTING = 'submitting';
const STATUS_SUCCESS = 'success';
const STATUS_ERROR = 'error';

async function fetchAcceptanceDetails(token) {
  const res = await fetch(`${API_URL}/api/accept/${token}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    const err = new Error(body.error || `Failed to load acceptance details`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function submitSignature(token, signerName, signatureData) {
  const res = await fetch(`${API_URL}/api/accept/${token}/sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      signer_name: signerName,
      signature_data: signatureData,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    const err = new Error(body.error || 'Failed to submit signature');
    err.status = res.status;
    throw err;
  }
  return res.json();
}

function BrandingHeader({ branding }) {
  const logoUrl = branding?.logo_url;
  const companyName = branding?.company_name;
  const formTitle = branding?.form_title || 'Employee Asset Consent Form';

  return (
    <div className="flex flex-col items-center gap-3 py-6">
      {logoUrl ? (
        <img src={logoUrl} alt={companyName || 'Logo'} className="h-12 w-auto object-contain" />
      ) : (
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-700 text-white font-bold text-lg">
          {(companyName || 'M').charAt(0)}
        </div>
      )}
      {companyName && (
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {companyName}
        </span>
      )}
      <h1 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 text-center">
        {formTitle}
      </h1>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-700" />
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Loading acceptance details...
      </p>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30">
        <AlertTriangle className="w-7 h-7 text-red-600 dark:text-red-400" />
      </div>
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
        Unable to Load
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
        {message}
      </p>
    </div>
  );
}

function SuccessState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
        <CheckCircle className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
      </div>
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
        Acknowledgment Complete
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
        Your signature has been recorded. You may close this page.
      </p>
    </div>
  );
}

function AssetDetailsCard({ acceptance }) {
  const asset = acceptance.asset || {};
  const fields = [
    { label: 'Asset Name', value: asset.name },
    { label: 'Serial Number', value: asset.serial_number },
    { label: 'Model', value: asset.model },
    { label: 'Manufacturer', value: asset.manufacturer },
    { label: 'Condition at Checkout', value: acceptance.condition_at_checkout },
    { label: 'Accessories', value: asset.accessories },
  ];

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Monitor className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Asset Details
        </h3>
      </div>
      <dl className="space-y-2.5">
        {fields.map(({ label, value }) =>
          value ? (
            <div key={label}>
              <dt className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                {label}
              </dt>
              <dd className="text-sm text-slate-800 dark:text-slate-100 mt-0.5">
                {value}
              </dd>
            </div>
          ) : null,
        )}
      </dl>
    </div>
  );
}

function TermsBox({ termsText }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
        Terms of Acceptance
      </h3>
      <div className="max-h-48 overflow-y-auto rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 sm:p-4">
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
          {termsText || DEFAULT_TERMS}
        </p>
      </div>
    </div>
  );
}

function AcceptanceForm({ onSubmit, isSubmitting }) {
  const [signerName, setSignerName] = useState('');
  const [signatureData, setSignatureData] = useState(null);

  const handleSignatureChange = useCallback((data) => {
    setSignatureData(data);
  }, []);

  const canSubmit = signerName.trim().length > 0 && signatureData && !isSubmitting;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(signerName.trim(), signatureData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-4">
        <div>
          <label
            htmlFor="signer-name"
            className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5"
          >
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            id="signer-name"
            type="text"
            required
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="Enter your full name"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
            Signature <span className="text-red-500">*</span>
          </label>
          <SignatureCanvas
            onSignatureChange={handleSignatureChange}
            width={400}
            height={150}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium py-3 text-sm transition-colors flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Submitting...
          </>
        ) : (
          'Sign & Accept'
        )}
      </button>
    </form>
  );
}

export default function AcceptAsset() {
  const { token } = useParams();
  const [status, setStatus] = useState(STATUS_LOADING);
  const [asset, setAsset] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus(STATUS_ERROR);
      setErrorMessage('No acceptance token provided.');
      return;
    }

    let cancelled = false;

    fetchAcceptanceDetails(token)
      .then((data) => {
        if (cancelled) return;
        setAsset(data);
        setStatus(STATUS_READY);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.status === 404) {
          setErrorMessage('This acceptance link was not found or has expired.');
        } else if (err.status === 410) {
          setErrorMessage('This asset has already been acknowledged.');
        } else {
          setErrorMessage(err.message || 'Something went wrong. Please try again later.');
        }
        setStatus(STATUS_ERROR);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = useCallback(
    async (signerName, signatureData) => {
      setStatus(STATUS_SUBMITTING);
      try {
        await submitSignature(token, signerName, signatureData);
        setStatus(STATUS_SUCCESS);
      } catch (err) {
        setErrorMessage(err.message || 'Failed to submit. Please try again.');
        setStatus(STATUS_ERROR);
      }
    },
    [token],
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-lg px-4 pb-12">
        <BrandingHeader branding={asset?.branding} />

        {status === STATUS_LOADING && <LoadingState />}
        {status === STATUS_ERROR && <ErrorState message={errorMessage} />}
        {status === STATUS_SUCCESS && <SuccessState />}

        {(status === STATUS_READY || status === STATUS_SUBMITTING) && asset && (
          <div className="space-y-4">
            <AssetDetailsCard acceptance={asset} />
            <TermsBox termsText={asset.terms_text} />
            <AcceptanceForm
              onSubmit={handleSubmit}
              isSubmitting={status === STATUS_SUBMITTING}
            />
          </div>
        )}
      </div>
    </div>
  );
}
