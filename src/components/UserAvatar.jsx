import { cn } from '@/lib/utils';
import { resolveUploadUrl } from '@/utils';

const avatarColors = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500',
  'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-blue-500',
  'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-pink-500'
];

const getColorForEmail = (email) => {
  if (!email) return avatarColors[0];
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

/**
 * UserAvatar - Displays user profile picture or fallback initials
 * @param {string} email - User email (for color generation)
 * @param {string} name - User name (for initials)
 * @param {string} avatarUrl - Profile picture URL (auto-resolved via resolveUploadUrl)
 * @param {string} avatarColor - Optional Tailwind bg color class override
 * @param {string} size - Size variant: 'xs', 'sm', 'md', 'lg', 'xl'
 * @param {string} className - Additional classes
 */
export default function UserAvatar({ email, name, avatarUrl, avatarColor, size = 'md', className }) {
  const sizeClasses = {
    xs: 'w-5 h-5 text-[10px]',
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
    xl: 'w-14 h-14 text-lg'
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;
  const resolvedUrl = avatarUrl ? resolveUploadUrl(avatarUrl) : null;

  if (resolvedUrl) {
    return (
      <img
        src={resolvedUrl}
        alt={name || email || 'User'}
        title={name || email}
        className={cn(
          "rounded-full object-cover flex-shrink-0",
          sizeClass,
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center text-white font-medium flex-shrink-0",
        sizeClass,
        avatarColor || getColorForEmail(email),
        className
      )}
      title={name || email}
    >
      {getInitials(name)}
    </div>
  );
}

export { getColorForEmail, getInitials, avatarColors };