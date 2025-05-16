// uploadHandler.js
// Combined logic to support UploadAPI metadata submission and S3 file uploads

// === DOM Ready Hook ===
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('dataForm');
  const fileInput = document.getElementById('file_upload');
  const fileInfo = document.querySelector('#file-upload-area .file-info');
  const fileNameDisplay = fileInfo?.querySelector('.file-name');
  const previewInput = document.getElementById('preview_upload');
  const fileNameField = document.getElementById('file_name');
  const fileFormatField = document.getElementById('file_format');
  const fileSizeField = document.getElementById('file_size');
  const dataOwnerIdField = document.getElementById('data_owner_id');
  const messageContainer = document.createElement('div');
  messageContainer.id = 'submission-message';
  messageContainer.className = 'submission-message';
  messageContainer.style.display = 'none';
  form.insertAdjacentElement('afterend', messageContainer);

  // Set static Data Owner ID
  if (dataOwnerIdField && !dataOwnerIdField.value) {
    dataOwnerIdField.value = 'f2e4f1e1-8f18-4df0-891c-153b857e55s7';
  }

  // Auto-fill file details when a file is selected
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) {
      const extension = file.name.split('.').pop().toLowerCase();
      fileNameField.value = file.name;
      fileFormatField.value = extension.toUpperCase();
      fileSizeField.value = file.size;

      if (fileInfo && fileNameDisplay) {
        fileNameDisplay.textContent = file.name;
        fileInfo.style.display = 'block';
      }
    }
  });

  const previewContainer = document.getElementById('preview-upload-area');
  const previewInfo = previewContainer?.querySelector('.preview-info');
  const previewFileName = previewContainer?.querySelector('.file-name');

  previewInput?.addEventListener('change', () => {
    const file = previewInput.files[0];
    if (file && previewInfo && previewFileName) {
      previewFileName.textContent = file.name;
      previewInfo.style.display = 'block';
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    messageContainer.textContent = '';

    const file = fileInput.files[0];
    if (!file) return showError('No file selected.');

    const allowedExtensions = ['pdf', 'zip', 'geotiff', 'tiff', 'png', 'jpeg', 'jpg', 'avi', 'csv', 'xlsx'];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      return showError('Unsupported file type. Please upload a PDF, ZIP, GeoTIFF, TIFF, PNG, JPEG, JPG, Excel, CSV or AVI file.');
    }

    const formData = new FormData(form);
    const payload = buildUploadPayload(formData, file);

    try {
      const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
      const uploadApiUrl = 'https://h3dgyj60ml.execute-api.ap-southeast-2.amazonaws.com/dev/upload';

      console.log("Payload to Upload API:", payload);

      const apiResponse = await fetch(proxyUrl + uploadApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });


      if (!apiResponse.ok) throw new Error(`UploadAPI error: ${apiResponse.statusText}`);

      const uploadResult = await apiResponse.json();

      await uploadFileToS3(uploadResult.presignedUrl, file);

      const previewFile = previewInput?.files[0];
      if (previewFile && uploadResult.previewPreSignedUrl) {
        await uploadFileToS3(uploadResult.previewPreSignedUrl, previewFile);
      }

      showSuccess(`Upload successful. Product ID: ${uploadResult.productId}`);
      form.reset();
      if (fileInfo) fileInfo.style.display = 'none';
    } catch (err) {
      console.error(err);
      showError(err.message);
    }
  });

  function buildUploadPayload(formData, file) {
    const tags = formData.get('tags')?.split(',').map(t => t.trim()) || [];
    const dataGeoShape = document.getElementById('wkt_output')?.value || '';
    const previewFile = previewInput?.files[0];
    const payload = {
      DataOwnerId: formData.get('data_owner_id'),
      DataOwnerName: formData.get('data_owner_company_name'),
      FileName: file.name,
      PreviewFile: previewFile ? previewFile.name : '',
      FileSize: file.size,
      IsMultiPartUpload: false,
      ProductName: formData.get('product_name'),
      ShortDescription: formData.get('short_description'),
      LongDescription: formData.get('long_description'),
      DateDataCaptured: new Date(formData.get('data_captured_date')).toISOString(),
      DateDataExpired: new Date(formData.get('data_expire_date')).toISOString(),
      DateDataUploaded: new Date().toISOString(),
      DataRegion: formData.get('data_region'),
      DataFormatType: formData.get('data_type'),
      Tags: tags,
      DataResellPrice: parseFloat(formData.get('data_resell_price') || 0),
      DataGeoShape: dataGeoShape
    };
    return payload;
  }

  async function uploadFileToS3(url, fileBlob) {
    const result = await fetch(url, {
      method: 'PUT',
      body: fileBlob
    });
    if (!result.ok) throw new Error('S3 upload failed');
  }

  function showError(message) {
    messageContainer.textContent = message;
    messageContainer.className = 'submission-message error';
    messageContainer.style.display = 'block';
  }

  function showSuccess(message) {
    messageContainer.textContent = message;
    messageContainer.className = 'submission-message success';
    messageContainer.style.display = 'block';
  }
});