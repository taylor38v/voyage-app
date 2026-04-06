## Packages
recharts | Data visualization for the budget chart
framer-motion | Smooth animations for page transitions and micro-interactions
date-fns | Robust date formatting and manipulation
react-day-picker | Date picker component for forms
clsx | Utility for constructing className strings conditionally
tailwind-merge | Utility for merging Tailwind classes safely

## Notes
Weather API calls will fail gracefully without an API key (implemented in use-weather hook).
Map view uses a high-quality static placeholder to ensure reliability without complex 3rd party map library configuration.
Authentication is handled via the existing useAuth hook.
