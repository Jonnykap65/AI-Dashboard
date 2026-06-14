export default function EntityForm({ fields, value, onChange, onSubmit, onCancel, submitLabel }) {
  function setField(name, next) {
    onChange({ ...value, [name]: next });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
      {fields.map((field) => (
        <label key={field.name} className={`${field.type === 'textarea' ? 'md:col-span-2' : ''} grid gap-1`}>
          <span className="label">{field.label}</span>
          {field.type === 'select' ? (
            <select className="input" value={value[field.name] ?? ''} onChange={(event) => setField(field.name, event.target.value)}>
              {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          ) : field.type === 'textarea' ? (
            <textarea className="input min-h-28" value={value[field.name] ?? ''} onChange={(event) => setField(field.name, event.target.value)} />
          ) : field.type === 'checkbox' ? (
            <input className="h-5 w-5 rounded border-line text-pine" type="checkbox" checked={Boolean(value[field.name])} onChange={(event) => setField(field.name, event.target.checked)} />
          ) : (
            <input className="input" type={field.type} required={field.required} value={value[field.name] ?? ''} onChange={(event) => setField(field.name, field.type === 'number' ? Number(event.target.value) : event.target.value)} />
          )}
        </label>
      ))}
      <div className="flex gap-2 md:col-span-2">
        <button className="btn btn-primary" type="submit">{submitLabel}</button>
        <button className="btn" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

