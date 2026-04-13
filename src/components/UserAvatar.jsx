import { cn } from '@/lib/utils';
import { resolveUploadUrl } from '@/utils';
import { avatarColors, getColorForEmail, getInitials } from '@/constants/colors';

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