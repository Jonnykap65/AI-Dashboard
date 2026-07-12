export const entityConfig = {
  calendar: {
    label: 'Calendar',
    path: '/api/calendar',
    titleField: 'title',
    dateField: 'date',
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'date', label: 'Date', type: 'date', required: true },
      { name: 'end_date', label: 'End date', type: 'date' },
      { name: 'start_time', label: 'Start time', type: 'time' },
      { name: 'end_time', label: 'End time', type: 'time' },
      { name: 'location', label: 'Location', type: 'text' },
      { name: 'category', label: 'Category', type: 'text' },
      { name: 'notes', label: 'Notes', type: 'textarea' }
    ],
    empty: { title: '', date: '', end_date: '', start_time: '', end_time: '', location: '', category: '', notes: '' }
  },
  bills: {
    label: 'Bills & Subscriptions',
    path: '/api/bills',
    titleField: 'name',
    dateField: 'due_date',
    dateLabel: 'Due date',
    showDateColumn: false,
    detailsField: 'notes',
    columns: [
      { key: 'amount', label: 'Amount', render: (item) => `$${Number(item.amount || 0).toFixed(2)}` },
      { key: 'billing_cycle', label: 'Billing cycle' }
    ],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'amount', label: 'Amount', type: 'number', required: true },
      { name: 'due_date', label: 'Due date', type: 'date', required: true },
      { name: 'billing_cycle', label: 'Billing cycle', type: 'select', options: ['weekly', 'monthly', 'quarterly', 'yearly', 'one-time'] },
      { name: 'category', label: 'Category', type: 'text' },
      { name: 'status', label: 'Status', type: 'select', options: ['active', 'paused', 'cancelled', 'review'] },
      { name: 'autopay', label: 'Autopay', type: 'checkbox' },
      { name: 'url', label: 'URL', type: 'url' },
      { name: 'notes', label: 'Notes', type: 'textarea' }
    ],
    empty: { name: '', amount: 0, due_date: '', billing_cycle: 'monthly', category: '', status: 'active', autopay: false, url: '', notes: '' }
  },
  notes: {
    label: 'Knowledge Base',
    path: '/api/notes',
    titleField: 'title',
    dateField: 'updated_at',
    detailsField: 'body',
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'note_type', label: 'Category', type: 'select', options: ['note', 'runbook', 'troubleshooting', 'script', 'codex_prompt', 'decision', 'reference', 'how_to', 'other'] },
      { name: 'tags', label: 'Tags', type: 'text' },
      { name: 'pinned', label: 'Pinned', type: 'checkbox' },
      { name: 'body', label: 'Body', type: 'textarea' }
    ],
    empty: { title: '', note_type: 'note', tags: '', pinned: false, body: '' }
  },
  assets: {
    label: 'Assets',
    path: '/api/assets',
    titleField: 'name',
    dateField: 'updated_at',
    detailsField: 'notes',
    columns: [
      { key: 'type', label: 'Type' },
      { key: 'hostname', label: 'Hostname' },
      { key: 'ip_address', label: 'IP' }
    ],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'type', label: 'Type', type: 'select', options: ['workstation', 'laptop', 'server', 'router', 'storage', 'cloud_service', 'application', 'mobile_device', 'other'] },
      { name: 'role', label: 'Role', type: 'text' },
      { name: 'hostname', label: 'Hostname', type: 'text' },
      { name: 'ip_address', label: 'IP address', type: 'text' },
      { name: 'platform', label: 'Platform', type: 'text' },
      { name: 'environment', label: 'Environment', type: 'text' },
      { name: 'status', label: 'Status', type: 'select', options: ['healthy', 'needs_attention', 'offline', 'retired', 'unknown'] },
      { name: 'notes', label: 'Notes', type: 'textarea' }
    ],
    empty: { name: '', type: 'other', role: '', hostname: '', ip_address: '', platform: '', environment: '', status: 'unknown', notes: '' }
  },
  securityRecords: {
    label: 'Security Review Records',
    path: '/api/security-records',
    titleField: 'name',
    dateField: 'next_review_date',
    detailsField: 'notes',
    columns: [
      { key: 'type', label: 'Type' },
      { key: 'provider', label: 'Provider' },
      { key: 'risk_level', label: 'Risk' },
      { key: 'expiration_date', label: 'Expires' }
    ],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'type', label: 'Type', type: 'select', options: ['account', 'admin_account', 'service_account', 'mfa_review', 'oauth_app', 'app_password_reference', 'api_key_reference', 'certificate', 'domain', 'recovery_method', 'other'] },
      { name: 'provider', label: 'Provider', type: 'text' },
      { name: 'status', label: 'Status', type: 'select', options: ['healthy', 'review_needed', 'expiring_soon', 'expired', 'disabled', 'unknown'] },
      { name: 'risk_level', label: 'Risk level', type: 'select', options: ['low', 'medium', 'high', 'critical'] },
      { name: 'last_reviewed', label: 'Last reviewed', type: 'date' },
      { name: 'next_review_date', label: 'Next review date', type: 'date' },
      { name: 'expiration_date', label: 'Expiration date', type: 'date' },
      { name: 'storage_reference', label: 'Storage reference', type: 'text' },
      { name: 'notes', label: 'Notes', type: 'textarea' }
    ],
    empty: { name: '', type: 'other', provider: '', status: 'unknown', risk_level: 'medium', last_reviewed: '', next_review_date: '', expiration_date: '', storage_reference: '', notes: '' }
  },
  links: {
    label: 'Quick Links',
    path: '/api/links',
    titleField: 'name',
    dateField: 'updated_at',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'url', label: 'URL', type: 'url', required: true },
      { name: 'category', label: 'Category', type: 'text' },
      { name: 'environment', label: 'Environment', type: 'select', options: ['local', 'personal', 'work', 'public', 'other'] },
      { name: 'tags', label: 'Tags', type: 'text' },
      { name: 'favorite', label: 'Favorite', type: 'checkbox' },
      { name: 'notes', label: 'Notes', type: 'textarea' }
    ],
    empty: { name: '', url: '', category: '', environment: 'personal', tags: '', favorite: false, notes: '' }
  },
  projects: {
    label: 'Projects',
    path: '/api/projects',
    titleField: 'name',
    dateField: 'due_date',
    detailsField: 'next_step',
    columns: [
      { key: 'priority', label: 'Priority' }
    ],
    fields: [
      { name: 'name', label: 'Project name', type: 'text', required: true },
      { name: 'category', label: 'Project type', type: 'select', options: ['general', 'codex', 'software', 'work', 'home', 'learning', 'maintenance', 'event', 'finance', 'health', 'creative', 'other'] },
      { name: 'status', label: 'Status', type: 'select', options: ['active', 'in_progress', 'completed', 'archived'] },
      { name: 'priority', label: 'Priority', type: 'select', options: ['low', 'medium', 'high'] },
      { name: 'due_date', label: 'Target date', type: 'date' },
      { name: 'local_path', label: 'Local path', type: 'text' },
      { name: 'repo_url', label: 'Repository URL', type: 'url' },
      { name: 'next_action', label: 'Next action', type: 'text' },
      { name: 'goal', label: 'Goal', type: 'text' },
      { name: 'blocker', label: 'Blocker', type: 'text' },
      { name: 'frontend_command', label: 'Frontend command', type: 'text' },
      { name: 'backend_command', label: 'Backend command', type: 'text' },
      { name: 'codex_prompt', label: 'Codex prompt', type: 'textarea' },
      { name: 'tags', label: 'Tags', type: 'text' },
      { name: 'notes', label: 'Notes', type: 'textarea' }
    ],
    empty: { name: '', category: 'general', status: 'active', priority: 'medium', due_date: '', local_path: '', repo_url: '', next_action: '', goal: '', blocker: '', frontend_command: '', backend_command: '', codex_prompt: '', tags: '', notes: '' }
  },
  projectTasks: {
    label: 'Project Tasks',
    path: '/api/project-tasks',
    titleField: 'title',
    detailsField: 'codex_prompt',
    completePath: (id) => `/api/project-tasks/${id}/complete`,
    columns: [
      { key: 'project_name', label: 'Project' }
    ],
    prepareSubmit: (item) => {
      const promptTitle = item.codex_prompt?.split('\n').find((line) => line.trim())?.trim();
      return { ...item, title: item.title || promptTitle || 'Project task' };
    },
    fields: [
      { name: 'project_name', label: 'Project name', type: 'text' },
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'due_date', label: 'Due date', type: 'date' },
      { name: 'priority', label: 'Priority', type: 'select', options: ['low', 'medium', 'high'] },
      { name: 'status', label: 'Status', type: 'select', options: ['open', 'completed'] },
      { name: 'codex_prompt', label: 'Codex prompt', type: 'textarea' },
      { name: 'notes', label: 'Notes', type: 'textarea' }
    ],
    empty: { title: '', project_name: '', due_date: '', priority: 'medium', status: 'open', codex_prompt: '', notes: '' }
  },
};
