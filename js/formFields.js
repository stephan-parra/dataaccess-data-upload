export function validateFormFields(form) {
  const requiredFields = [
    'file_name', 'file_format', 'data_type', 'data_captured_date',
    'data_owner_id', 'product_name', 'data_resell_price',
    'short_description', 'wkt_output'
  ];
  const missing = [];
  requiredFields.forEach(id => {
    const field = document.getElementById(id);
    if (!field || !field.value.trim()) {
      missing.push(id);
      field?.classList.add('error-border');
    } else {
      field.classList.remove('error-border');
    }
  });
  if (missing.length) {
    document.getElementById(missing[0])?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  return missing;
}