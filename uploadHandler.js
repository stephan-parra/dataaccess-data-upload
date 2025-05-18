// uploadHandler.js
// Enhanced with progress overlay, product ID display, and multipart upload with parallel + cumulative progress

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
  const overlay = document.getElementById('upload-overlay');
  const overlayProgress = document.getElementById('overlay-progress');
  const overlayText = document.getElementById('overlay-text');
  const messageContainer = document.createElement('div');
  messageContainer.id = 'submission-message';
  messageContainer.className = 'submission-message';
  messageContainer.style.display = 'none';
  form.insertAdjacentElement('afterend', messageContainer);

  const submitBtn = form.querySelector('.submit-btn');
  const resetBtn = form.querySelector('.reset-btn');

  if (dataOwnerIdField && !dataOwnerIdField.value) {
    dataOwnerIdField.value = 'f2e4f1e1-8f18-4df0-891c-153b857e22b9';
  }

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
    submitBtn.disabled = true;
    resetBtn.disabled = true;

    const file = fileInput.files[0];
    if (!file) {
      showError('No file selected.');
      submitBtn.disabled = false;
      resetBtn.disabled = false;
      return;
    }

    const allowedExtensions = ['pdf', 'zip', 'geotiff', 'tiff', 'png', 'jpeg', 'jpg', 'avi', 'csv', 'xlsx'];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      showError('Unsupported file type. Please upload a PDF, ZIP, GeoTIFF, TIFF, PNG, JPEG, JPG, Excel, CSV or AVI file.');
      submitBtn.disabled = false;
      resetBtn.disabled = false;
      return;
    }

    const formData = new FormData(form);
    const payload = buildUploadPayload(formData, file);

    try {
      const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
      const uploadApiUrl = 'https://h3dgyj60ml.execute-api.ap-southeast-2.amazonaws.com/dev/upload';

      overlay.style.display = 'flex';
      overlayText.textContent = 'Uploading file...';
      overlayProgress.style.width = '0%';

      const apiResponse = await fetch(proxyUrl + uploadApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!apiResponse.ok) throw new Error(`UploadAPI error: ${apiResponse.statusText}`);

      const uploadResult = await apiResponse.json();

      if (uploadResult.multiPartUploadUrls?.PartUrls) {
        await uploadFileToS3MultiPart(uploadResult.multiPartUploadUrls.PartUrls, file);
      } else {
        await uploadFileToS3WithProgress(uploadResult.presignedUrl, file);
      }

      const previewFile = previewInput?.files[0];
      if (previewFile && uploadResult.previewPreSignedUrl) {
        await uploadFileToS3WithProgress(uploadResult.previewPreSignedUrl, previewFile);
      }

      overlayText.innerHTML = `Upload complete. Product ID: <strong>${uploadResult.productId}</strong><br><br><button id='close-overlay-btn' class='close-overlay-btn'>Close</button>`;
      document.getElementById('close-overlay-btn').addEventListener('click', () => {
        overlay.style.display = 'none';
      });
      form.reset();
      if (fileInfo) fileInfo.style.display = 'none';
    } catch (err) {
      console.error(err);
      showError(err.message);
      overlay.style.display = 'none';
    } finally {
      submitBtn.disabled = false;
      resetBtn.disabled = false;
    }
  });

  function buildUploadPayload(formData, file) {
    const tags = formData.get('tags')?.split(',').map(t => t.trim()) || [];
    const dataGeoShape = document.getElementById('wkt_output')?.value || '';
    const previewFile = previewInput?.files[0];
    return {
      DataOwnerId: formData.get('data_owner_id'),
      DataOwnerName: formData.get('data_owner_company_name'),
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
      DataRegion: formData.get('data_region'),
      DataFormatType: formData.get('data_type'),
      Tags: tags,
      DataResellPrice: parseFloat(formData.get('data_resell_price') || 0),
      DataGeoShape: dataGeoShape
    };
  }

  async function uploadFileToS3WithProgress(url, fileBlob) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url, true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          overlayProgress.style.width = `${percentComplete}%`;
          overlayProgress.textContent = `${percentComplete}%`;
        }
      };

      xhr.onload = () => {
        xhr.status === 200 ? resolve() : reject(new Error('S3 upload failed with status ' + xhr.status));
      };

      xhr.onerror = () => reject(new Error('S3 upload failed'));
      xhr.send(fileBlob);
    });
  }

  async function uploadFileToS3MultiPart(partUrls, fileBlob) {
    const chunkSize = 5 * 1024 * 1024; // 5MB
    const concurrency = 4;
    const totalParts = partUrls.length;
    let uploadedBytes = 0;
    let completed = 0;
    const totalSize = fileBlob.size;

    const queue = partUrls.map((url, index) => ({
      PartNumber: index + 1,
      Url: url,
      blob: fileBlob.slice(index * chunkSize, Math.min((index + 1) * chunkSize, fileBlob.size))
    }));

    const runUpload = async (part) => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', part.Url, true);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            uploadedBytes += event.loaded;
            const percent = Math.round((uploadedBytes / totalSize) * 100);
            overlayProgress.style.width = `${percent}%`;
            overlayProgress.textContent = `${percent}%`;
            overlayText.textContent = `Uploading part ${part.PartNumber} of ${totalParts} (${percent}%)`;
          }
        };

        xhr.onload = () => {
          completed++;
          xhr.status === 200 ? resolve() : reject(new Error('Failed part ' + part.PartNumber));
        };

        xhr.onerror = () => reject(new Error('Failed part ' + part.PartNumber));
        xhr.send(part.blob);
      });
    };

    const workers = Array(concurrency).fill(null).map(async () => {
      while (queue.length) {
        const part = queue.shift();
        if (part) await runUpload(part);
      }
    });

    await Promise.all(workers);
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
