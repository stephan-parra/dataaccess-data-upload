export function buildUploadPayload(formData, file, previewInput) {
  const tags = formData.get('tags')?.split(',').map(t => t.trim()) || [];
  const dataGeoShape = document.getElementById('wkt_output')?.value || '';
  const previewFile = previewInput?.files[0];
  return {
    DataOwnerId: formData.get('data_owner_id'),
    DataOwnerName: "PelicanCorp",
    FileName: file.name,
    PreviewFile: previewFile ? previewFile.name : '',
    FileSize: file.size,
    IsMultiPartUpload: file.size > 100 * 1024 * 1024,
    ProductName: formData.get('product_name'),
    ShortDescription: formData.get('short_description'),
    LongDescription: formData.get('long_description'),
    DateDataCaptured: new Date(formData.get('data_captured_date')).toISOString(),
    DateDataExpired: new Date(formData.get('data_expire_date')).toISOString(),
    DateDataUploaded: new Date().toISOString(),
    DataFormatType: formData.get('data_type'),
    Tags: tags,
    DataResellPrice: parseFloat(formData.get('data_resell_price') || 0),
    DataGeoShape: dataGeoShape
  };
}