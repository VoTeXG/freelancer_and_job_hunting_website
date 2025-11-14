# Global API Error and Toast Conventions

This document defines when to surface a global error banner vs transient toasts, and how to implement them consistently.

## Principles
- Use a toast for local, short-lived feedback related to a single action.
- Use the global banner for session-wide or page-wide issues that block core functionality.
- Prefer concise, user-friendly messages. Include a short title and a clear next step.

## When to use what
- Toast (success/info):
  - Form submitted successfully (e.g., job posted, application submitted)
  - Minor validation or business-rule errors (e.g., cannot apply twice)
  - Background actions and non-blocking updates
- Toast (error):
  - Action failed but the rest of the page still functions (e.g., profile save failed)
  - Network hiccups or retryable errors
- Global banner (error/warning):
  - Authentication required or session expired
  - Critical data failed to load (e.g., profile could not load, dashboard list unavailable)
  - Service outage or persistent errors impacting most actions on the page

## Implementation helpers
- `useApiErrorHandlers()`
  - `toastSuccess(message, title?)`
  - `toastInfo(message, title?)`
  - `toastError(message, title?)`
  - `bannerError(message, title?)`

## Patterns
- Catch errors in hooks/mutations and route toasts/banners per the above.
- After success, invalidate or refetch affected query keys to re-sync.
- Avoid `alert()`; use toasts or the banner for consistent UX and accessibility.

## Examples
- Profile update success: toastSuccess("Profile updated").
- Profile load fails: bannerError("We couldn't load your profile. Please retry.").
- Job post success: toastSuccess("Job posted successfully").
- Not authenticated: bannerError("Please log in to continue").