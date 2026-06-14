export const themeOptions = [
  { value: 'classic-light', label: 'Classic L', description: 'Existing clean light theme', mode: 'light', swatch: ['#f5f7fb', '#1f6f5b'] },
  { value: 'void-light', label: 'Void L', description: 'Bright purple galaxy', mode: 'light', swatch: ['#f2efff', '#6d5df5'] },
  { value: 'ocean-light', label: 'Ocean L', description: 'Bright coastal blue', mode: 'light', swatch: ['#e9f8ff', '#0897c5'] },
  { value: 'synthwave-light', label: 'Synthwave L', description: 'Bright neon pink', mode: 'light', swatch: ['#fff0f7', '#ef2d73'] },
  { value: 'forest-light', label: 'Forest L', description: 'Bright fresh green', mode: 'light', swatch: ['#eefdf3', '#16a05d'] },
  { value: 'ember-light', label: 'Ember L', description: 'Bright warm orange', mode: 'light', swatch: ['#fff5ea', '#f47a16'] },
  { value: 'classic-dark', label: 'Classic D', description: 'Existing deep dashboard', mode: 'dark', swatch: ['#14181d', '#1f6f5b'] },
  { value: 'void-dark', label: 'Void D', description: 'Dark purple galaxy', mode: 'dark', swatch: ['#0d1028', '#6957f5'] },
  { value: 'ocean-dark', label: 'Ocean D', description: 'Deep space navy', mode: 'dark', swatch: ['#061b2e', '#00bde8'] },
  { value: 'synthwave-dark', label: 'Synthwave D', description: 'Neon retro-futurist', mode: 'dark', swatch: ['#15091f', '#ff2b7a'] },
  { value: 'forest-dark', label: 'Forest D', description: 'Deep green nature', mode: 'dark', swatch: ['#071d16', '#19c86f'] },
  { value: 'ember-dark', label: 'Ember D', description: 'Action / fire orange', mode: 'dark', swatch: ['#201006', '#ff781f'] },
];

export function resolveTheme(theme, prefersDark = false) {
  if (theme === 'system') return prefersDark ? 'classic-dark' : 'classic-light';
  if (theme === 'light') return 'classic-light';
  if (theme === 'dark') return 'classic-dark';
  return themeOptions.some((option) => option.value === theme) ? theme : 'classic-light';
}

export function isDarkTheme(theme, prefersDark = false) {
  return resolveTheme(theme, prefersDark).endsWith('-dark');
}
