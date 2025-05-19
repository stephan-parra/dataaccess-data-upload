// uploadHandler.js
// Updated: Supports Cancel. Pause/Resume removed.

let UPLOAD_API_URL = '';

async function loadConfig() {
  const response = await fetch('config.json');
  const config = await response.json();
  UPLOAD_API_URL = config.UPLOAD_API_URL;
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();

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
  const cancelBtn = document.getElementById('cancel-upload-btn');

  // Restrict Captured Date to today or earlier
  const capturedDateInput = document.getElementById('data_captured_date');
  if (capturedDateInput) {
    const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    capturedDateInput.setAttribute('max', today);
    console.log('Captured Date max set to:', today);
  }

  const messageContainer = document.createElement('div');
  messageContainer.id = 'submission-message';
  messageContainer.className = 'submission-message';
  messageContainer.style.display = 'none';
  form.insertAdjacentElement('afterend', messageContainer);

  let abortUpload = false;
  let currentXHR = null;

  cancelBtn.addEventListener('click', () => {
    abortUpload = true;
    if (currentXHR) {
      currentXHR.abort();
    }
    overlayText.textContent = 'Upload cancelled.';
    overlayProgress.style.width = '0%';
    overlay.style.display = 'none';
    cancelBtn.style.display = 'none';
  });

    const submitBtn = form.querySelector('.submit-btn');
    const resetBtn = form.querySelector('.reset-btn');
    submitBtn.disabled = true;

    resetBtn.addEventListener('click', () => {
    const fileSizeWarning = document.getElementById('file-size-warning');
    const fileInfo = document.querySelector('#file-upload-area .file-info');
    const submitBtn = form.querySelector('.submit-btn');

    if (fileSizeWarning) {
      fileSizeWarning.style.display = 'none';
      fileSizeWarning.textContent = '';
    }

    if (fileInfo) {
      fileInfo.style.display = 'none';
    }

    submitBtn.disabled = true;
  });


  if (dataOwnerIdField && !dataOwnerIdField.value) {
    dataOwnerIdField.value = 'f2e4f1e1-8f18-4df0-891c-153b857e22b9';
  }

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    const fileSizeWarning = document.getElementById('file-size-warning');
    const submitBtn = form.querySelector('.submit-btn');

    if (file) {
      const extension = file.name.split('.').pop().toLowerCase();
      fileNameField.value = file.name;
      fileFormatField.value = extension.toUpperCase();
      fileSizeField.value = file.size;

      if (fileInfo && fileNameDisplay) {
        fileNameDisplay.textContent = file.name;
        fileInfo.style.display = 'block';
      }
          // Show warning if file > 5GB
      const FIVE_GB = 5 * 1024 * 1024 * 1024;
      if (file.size > FIVE_GB) {
        fileSizeWarning.textContent = 'Warning: File size exceeds 5GB. Uploads over 5GB may fail.';
        fileSizeWarning.style.display = 'block';
        submitBtn.disabled = true;
      } else {
        fileSizeWarning.style.display = 'none';
        fileSizeWarning.textContent = '';
        submitBtn.disabled = false;
      }
    } else {
    // If no file is selected, disable the submit button
    submitBtn.disabled = true;
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
    abortUpload = false;
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

    if (file.size > 5 * 1024 * 1024 * 1024) {
      showError('Selected file is larger than 5GB. Please choose a smaller file.');
      submitBtn.disabled = false;
      resetBtn.disabled = false;
      overlay.style.display = 'none';
      return;
    }

      // ✅ VALIDATE FIELDS HERE
      const missingFields = validateFormFields(form);
      if (missingFields.length > 0) {
        showError('Please complete all required fields before uploading.');
        submitBtn.disabled = false;
        resetBtn.disabled = false;
        return;
      }

      // ✅ Only now show overlay
      completionDetails.innerHTML = ''; // Clear any old completion message
      overlay.style.display = 'flex';
      cancelBtn.style.display = 'inline-block';
      overlayText.textContent = 'Uploading file...';
      overlayProgress.style.transition = 'width 0.5s ease';
      overlayProgress.style.width = '0%';
      overlayProgress.textContent = '0%';

    const allowedExtensions = ['pdf', 'zip', 'geotiff', 'tiff', 'png', 'jpeg', 'jpg', 'avi', 'csv', 'xlsx'];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      showError('Unsupported file type.');
      submitBtn.disabled = false;
      resetBtn.disabled = false;
      return;
    }

    const formData = new FormData(form);
    const payload = buildUploadPayload(formData, file);

    try {
      overlay.style.display = 'flex';
      cancelBtn.style.display = 'inline-block';
      overlayText.textContent = 'Uploading file...';
      overlayProgress.style.transition = 'width 0.5s ease';
      overlayProgress.style.width = '0%';
      overlayProgress.textContent = '0%';

      const apiResponse = await fetch(UPLOAD_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!apiResponse.ok) throw new Error(`UploadAPI error: ${apiResponse.statusText}`);
      const uploadResult = await apiResponse.json();

      if (uploadResult.multiPartUploadUrls?.PartUrls) {
        await uploadFileToS3MultiPart(
          uploadResult.multiPartUploadUrls.PartUrls,
          file,
          uploadResult.multiPartUploadUrls.UploadId
        );
      } else {
        await uploadFileToS3WithProgress(uploadResult.presignedUrl, file);
      }

      const previewFile = previewInput?.files[0];
      if (previewFile && uploadResult.previewPreSignedUrl) {
        await uploadFileToS3WithProgress(uploadResult.previewPreSignedUrl, previewFile);
      }

      cancelBtn.style.display = 'none';

      // overlayText.innerHTML = `Upload complete. Product ID: <strong>${uploadResult.productId}</strong><br><br><button id='close-overlay-btn' class='close-overlay-btn'>Close</button>`;
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);

      const detailsHTML = `
        <h3 style="margin-top: 1rem;">✅ Upload Complete</h3>
        <p><strong>Product ID:</strong> ${uploadResult.productId}</p>
        <p><strong>File Name:</strong> ${file.name}</p>
        <p><strong>File Size:</strong> ${fileSizeMB} MB</p>
        ${previewFile ? `<p><strong>Preview File:</strong> ${previewFile.name}</p>` : `<p><em>No preview uploaded</em></p>`}
        <br>
        <button id='close-overlay-btn' class='close-overlay-btn'>Close</button>
      `;

      document.getElementById('upload-complete-details').innerHTML = detailsHTML;
      overlayText.textContent = 'Upload complete.';

      document.getElementById('close-overlay-btn').addEventListener('click', () => {
        overlay.style.display = 'none';
      });
      form.reset();
      if (fileInfo) fileInfo.style.display = 'none';
    } catch (err) {
      if (abortUpload) {
        showError('Upload was cancelled.');
      } else {
        console.error(err);
        showError(err.message);
      }
      overlay.style.display = 'none';
    } finally {
      submitBtn.disabled = false;
      resetBtn.disabled = false;
    }
  });

  async function uploadFileToS3MultiPart(partUrls, fileBlob, uploadId) {
    const chunkSize = 5 * 1024 * 1024;
    const totalParts = partUrls.length;
    let uploadedBytes = 0;
    const totalSize = fileBlob.size;
    const completedParts = [];

    for (let index = 0; index < totalParts; index++) {
      if (abortUpload) throw new Error('Upload cancelled by user.');

      const url = partUrls[index];
      const partNumber = index + 1;
      const start = index * chunkSize;
      const end = Math.min(start + chunkSize, fileBlob.size);
      const blob = fileBlob.slice(start, end);

      overlayText.textContent = `Uploading part ${partNumber} of ${totalParts}`;

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        currentXHR = xhr;
        xhr.open('PUT', url, true);

        xhr.onload = () => {
          if (xhr.status === 200) {
            uploadedBytes += blob.size;
            const etag = xhr.getResponseHeader('ETag');
            completedParts.push({ PartNumber: partNumber, ETag: etag });
            const percent = Math.round((uploadedBytes / totalSize) * 100);
            overlayProgress.style.width = `${percent}%`;
            overlayProgress.textContent = `${percent}%`;
            resolve();
          } else {
            reject(new Error(`Failed part ${partNumber}`));
          }
        };

        xhr.onerror = () => reject(new Error(`Failed part ${partNumber}`));
        xhr.send(blob);
      });
    }

    // Finalize upload
    const key = partUrls[0].split('?')[0].split('.com/')[1];
    const completeResponse = await fetch(UPLOAD_API_URL + '/completemultipartupload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        UploadId: uploadId,
        Key: key,
        Parts: completedParts
      })
    });

    if (!completeResponse.ok) throw new Error('Failed to complete multipart upload');

    overlayProgress.style.width = '100%';
    overlayProgress.textContent = '100%';
    overlayText.textContent = 'Upload complete. Finalizing...';
  }

  function uploadFileToS3WithProgress(url, fileBlob) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      currentXHR = xhr;
      xhr.open('PUT', url, true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          overlayProgress.style.width = `${percent}%`;
          overlayProgress.textContent = `${percent}%`;
        }
      };

      xhr.onload = () => {
        if (abortUpload) {
          reject(new Error('Upload cancelled by user.'));
        } else {
          xhr.status === 200 ? resolve() : reject(new Error('S3 upload failed with status ' + xhr.status));
        }
      };

      xhr.onerror = () => reject(new Error('S3 upload failed'));

      if (abortUpload) {
        xhr.abort();
        reject(new Error('Upload cancelled by user.'));
        return;
      }

      xhr.send(fileBlob);
    });
  }

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

  function validateFormFields(form) {
    const requiredFields = [
      'file_name',
      'file_format',
      'data_type',
      'data_captured_date',
      'data_owner_company_name',
      'data_owner_id',
      'data_region',
      'number_of_files',
      'product_name',
      'data_resell_price',
      'short_description',
      'wkt_output'
    ];

    const missing = [];

    requiredFields.forEach(id => {
      const field = document.getElementById(id);
      if (!field || !field.value || field.value.trim() === '') {
        missing.push(id);
        if (field) {
          field.classList.add('error-border');
        }
      } else {
        field.classList.remove('error-border');
      }
    });

    if (missing.length > 0) {
      const first = document.getElementById(missing[0]);
      if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return missing;
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
