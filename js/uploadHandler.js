// uploadHandler.js (main entry point)
import { loadConfig } from './configLoader.js';
import { validateFormFields } from './formFields.js';
import { buildUploadPayload } from './payloadBuilder.js';
import { uploadFileToS3WithProgress, uploadFileToS3MultiPart } from './uploadUtils.js';
import { showError, showSuccess } from './messageUI.js';

import { UserManager } from 'https://cdn.jsdelivr.net/npm/oidc-client-ts/+esm';

async function getAccessToken() {
  const baseUrl = new URL('.', import.meta.url);
  const config = await fetch(new URL('../config.json', import.meta.url)).then(res => res.json());
  const userManager = new UserManager({
    authority: config.OIDC_AUTHORITY,
    client_id: config.OIDC_CLIENT_ID,
    redirect_uri: new URL(config.OIDC_REDIRECT_URI_PATH, baseUrl).href,
    response_type: 'code',
    scope: config.OIDC_SCOPE
  });
  const user = await userManager.getUser();
  return user?.access_token;
}


async function setupDataOwnerDropdown(config) {
  const group = document.getElementById('data-owner-group');
  const select = document.getElementById('data_owner_id');

  try {
    const token = await getAccessToken();
    const response = await fetch(config.DATA_OWNERS_API_URL, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const owners = await response.json();

    select.innerHTML = '<option value="">Select a Data Owner</option>';
    owners.forEach(owner => {
      const option = document.createElement('option');
      option.value = owner.Key;
      option.textContent = `${owner.Value.Name} (${owner.Value.Email})`;
      select.appendChild(option);
    });

    new Choices(select, {
      searchEnabled: true,
      itemSelectText: '',
      placeholderValue: 'Select a Data Owner',
      shouldSort: false
    });

  } catch (error) {
    console.error('❌ Failed to load Data Owners:', error);
    select.remove();

    const fallbackInput = document.createElement('input');
    fallbackInput.type = 'text';
    fallbackInput.id = 'data_owner_id';
    fallbackInput.name = 'data_owner_id';
    fallbackInput.required = true;
    fallbackInput.placeholder = 'Enter Data Owner ID manually';
    fallbackInput.classList.add('manual-region-input');

    group.appendChild(fallbackInput);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // ✅ Restrict Captured Date to today or earlier
  const capturedDateInput = document.getElementById('data_captured_date');
  if (capturedDateInput) {
    const today = new Date().toISOString().split('T')[0];
    capturedDateInput.setAttribute('max', today);
  }

  const expiryDateInput = document.getElementById('data_expire_date');
  if (expiryDateInput) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    expiryDateInput.setAttribute('min', tomorrowStr);
  }
  
  const config = await loadConfig();
  await setupDataOwnerDropdown(config);
  // await populateRegionDropdown(config);


  function fetchWithTimeout(url, timeout = 3000) {
    return Promise.race([
      fetch(url),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out')), timeout)
      )
    ]);
  }

  const form = document.getElementById('dataForm');

  const Delta = Quill.import('delta');
  
  // Initialize Quill rich text editor for long_description
  const quill = new Quill('#long_description_editor', {
    theme: 'snow',
    placeholder: 'Enter detailed description here...',
    modules: {
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ align: [] }],
        [{ indent: '-1' }, { indent: '+1' }],
        [{ color: [] }],
        ['clean']
      ],
      clipboard: {
        matchers: [
          ['*', (node, delta) => {
            // Force pasted content to plain text
            return new Delta().insert(node.innerText || node.textContent);
          }]
        ]
      }
    }
  });

  const previewBtn = document.getElementById('preview-btn');
  const previewPanel = document.getElementById('quill-preview');
  const modal = document.getElementById('quill-modal');
  const modalClose = document.getElementById('modal-close');

  previewBtn?.addEventListener('click', () => {
    const html = quill.root.innerHTML;
    previewPanel.innerHTML = html;
    modal.style.display = 'block';
  });

  // Close modal when clicking X
  modalClose?.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  // Close modal when clicking outside the modal content
  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });

  const fileInput = document.getElementById('file_upload');
  const previewInput = document.getElementById('preview_upload');
  const fileNameField = document.getElementById('file_name');
  const fileFormatField = document.getElementById('file_format');
  const fileSizeField = document.getElementById('file_size');
  const dataOwnerIdField = document.getElementById('data_owner_id');
  const fileInfo = document.querySelector('#file-upload-area .file-info');
  const fileNameDisplay = fileInfo?.querySelector('.file-name');

  const overlay = document.getElementById('upload-overlay');
  const overlayProgress = document.getElementById('overlay-progress');
  const overlayText = document.getElementById('overlay-text');
  const cancelBtn = document.getElementById('cancel-upload-btn');

  const messageContainer = document.createElement('div');
  messageContainer.id = 'submission-message';
  messageContainer.className = 'submission-message';
  messageContainer.style.display = 'none';
  form.insertAdjacentElement('afterend', messageContainer);

  const abortUploadRef = { current: null, cancelled: false };

  cancelBtn.addEventListener('click', () => {
    abortUploadRef.cancelled = true;
    if (abortUploadRef.current) abortUploadRef.current.abort();
    overlayText.textContent = 'Upload cancelled.';
    overlayProgress.style.width = '0%';
    overlay.style.display = 'none';
    cancelBtn.style.display = 'none';
  });

  const submitBtn = form.querySelector('.submit-btn');
  const resetBtn = form.querySelector('.reset-btn');
  submitBtn.disabled = true;

  resetBtn.addEventListener('click', () => {
    // 🧹 Clear warnings and file info
    document.getElementById('file-size-warning').style.display = 'none';
    fileInfo.style.display = 'none';
    submitBtn.disabled = true;

    // 🧹 Clear Quill editor and hidden input
    if (quill) quill.setContents([]);
    document.getElementById('long_description').value = '';

    // ⬆️ Scroll form to top
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // 🗺️ Clear map and WKT field
    const wktTextarea = document.getElementById('wkt_output');
    if (wktTextarea) {
      wktTextarea.value = '';
      wktTextarea.classList.remove('error');
    }
    const validationMsg = document.getElementById('wkt-validation-error');
    if (validationMsg) validationMsg.style.display = 'none';
    if (window.drawnItems) window.drawnItems.clearLayers();

    // 🧹 Clear preview upload
    if (previewInput) previewInput.value = '';
    const previewInfo = document.querySelector('#preview-upload-area .preview-info');
    const previewFileName = previewInfo?.querySelector('.file-name');
    if (previewInfo) {
      previewInfo.style.display = 'none';
      if (previewFileName) previewFileName.textContent = '';
    }
  });


  if (dataOwnerIdField && !dataOwnerIdField.value) {
    dataOwnerIdField.value = 'b9e6e024-3777-11f0-9021-b7cf8b383095';
  }

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    const warning = document.getElementById('file-size-warning');
    if (file) {
      const extension = file.name.split('.').pop().toLowerCase();
      fileNameField.value = file.name;
      fileFormatField.value = extension.toUpperCase();
      fileSizeField.value = file.size;
      fileNameDisplay.textContent = file.name;
      fileInfo.style.display = 'block';

      const FIVE_GB = 5 * 1024 * 1024 * 1024;
      if (file.size > FIVE_GB) {
        warning.textContent = 'Warning: File size exceeds 5GB. Uploads over 5GB may fail.';
        warning.style.display = 'block';
        submitBtn.disabled = true;
      } else {
        warning.style.display = 'none';
        warning.textContent = '';
        submitBtn.disabled = false;
      }
    } else {
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
    abortUploadRef.cancelled = false;
    messageContainer.textContent = '';
    submitBtn.disabled = true;
    resetBtn.disabled = true;

    // Clear the previous result content from the overlay
    document.getElementById('upload-complete-details').innerHTML = '';

    const file = fileInput.files[0];
    if (!file) {
      showError('No file selected.', messageContainer);
      submitBtn.disabled = false;
      resetBtn.disabled = false;
      return;
    }

    document.getElementById('long_description').value = quill.root.innerHTML;

    if (file.size > 5 * 1024 * 1024 * 1024) {
      showError('Selected file is larger than 5GB. Please choose a smaller file.', messageContainer);
      submitBtn.disabled = false;
      resetBtn.disabled = false;
      return;
    }

    const missingFields = validateFormFields(form);
    if (missingFields.length > 0) {
      showError('Please complete all required fields before uploading.', messageContainer);
      submitBtn.disabled = false;
      resetBtn.disabled = false;
      return;
    }

    const priceField = document.getElementById('data_resell_price');
    const pricePattern = /^(0|[1-9]\d*)(\.\d{1,2})?$/;

    if (!pricePattern.test(priceField.value)) {
      showError('Please enter a valid price (e.g. 0, 1.20, 99, 200.19)', messageContainer);
      priceField.classList.add('error-border');
      priceField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      submitBtn.disabled = false;
      resetBtn.disabled = false;
      return;
    } else {
      priceField.classList.remove('error-border');
    }


    overlay.style.display = 'flex';
    cancelBtn.style.display = 'inline-block';
    overlayText.textContent = 'Uploading file...';
    overlayProgress.style.transition = 'width 0.5s ease';
    overlayProgress.style.width = '0%';
    overlayProgress.textContent = '0%';

    const allowedExtensions = ['pdf', 'zip', 'geotiff', 'tiff', 'png', 'jpeg', 'jpg', 'avi', 'csv', 'xlsx'];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      showError('Unsupported file type.', messageContainer);
      submitBtn.disabled = false;
      resetBtn.disabled = false;
      return;
    }

    const formData = new FormData(form);
    // Copy rich text HTML from Quill to hidden input
    document.getElementById('long_description').value = quill.root.innerHTML;

    const payload = buildUploadPayload(formData, file, previewInput);

    try {
      const token = await getAccessToken();
      const apiResponse = await fetch(config.UPLOAD_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });


      if (!apiResponse.ok) throw new Error(`UploadAPI error: ${apiResponse.statusText}`);
      const uploadResult = await apiResponse.json();

      if (uploadResult.multiPartUploadUrls?.PartUrls) {
        await uploadFileToS3MultiPart(
          uploadResult.multiPartUploadUrls.PartUrls,
          file,
          uploadResult.multiPartUploadUrls.UploadId,
          overlayText,
          overlayProgress,
          config.COMPLETE_MULTIPART_UPLOAD_URL,
          abortUploadRef
        );
      } else {
        await uploadFileToS3WithProgress(
          uploadResult.presignedUrl,
          file,
          overlayProgress,
          abortUploadRef
        );
      }

      const previewFile = previewInput?.files[0];
      if (previewFile && uploadResult.previewPreSignedUrl) {
        overlayText.textContent = `Uploading preview file (${previewFile.name})...`;
        overlayProgress.style.transition = 'width 0.5s ease';
        overlayProgress.style.width = '0%';
        overlayProgress.textContent = '0%';

        await uploadFileToS3WithProgress(
          uploadResult.previewPreSignedUrl,
          previewFile,
          overlayProgress,
          abortUploadRef
        );
      }


      overlayText.textContent = 'Upload complete.';
      overlayProgress.style.width = '100%';
      overlayProgress.textContent = '100%';
      cancelBtn.style.display = 'none';

      // Preserve long description content
      const longDescriptionHtml = quill.root.innerHTML;

      // Clear all fields except long description
      form.querySelectorAll('input, select, textarea').forEach(el => {
        if (el.id !== 'long_description') {
          if (el.type === 'checkbox' || el.type === 'radio') {
            el.checked = false;
          } else {
            el.value = '';
          }
        }
      });

      // Manually reset selects (for Choices.js support)
      const selects = form.querySelectorAll('select');
      selects.forEach(select => {
        if (select.id !== 'data_type') return;
        select.value = '';
        if (select.choices) select.choices.setChoiceByValue('');
      });

      // Restore long description content
      document.getElementById('long_description').value = longDescriptionHtml;
      quill.root.innerHTML = longDescriptionHtml;

      // Hide file info box
      if (fileInfo) fileInfo.style.display = 'none';

      // Clear preview file input and preview info
      if (previewInput) previewInput.value = '';
      const previewInfo = document.querySelector('#preview-upload-area .preview-info');
      const previewFileName = previewInfo?.querySelector('.file-name');
      if (previewInfo) {
        previewInfo.style.display = 'none';
        if (previewFileName) previewFileName.textContent = '';
      }

      // Clear WKT and reset validation
      const wktTextarea = document.getElementById('wkt_output');
      if (wktTextarea) {
        wktTextarea.value = '';
        wktTextarea.classList.remove('error');
      }
      const validationMsg = document.getElementById('wkt-validation-error');
      if (validationMsg) validationMsg.style.display = 'none';
      if (window.drawnItems) window.drawnItems.clearLayers();


      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      document.getElementById('upload-complete-details').innerHTML = `
        <h3 style="margin-top: 1rem;">✅ Upload Complete</h3>
        <p><strong>Product ID:</strong> ${uploadResult.productId}</p>
        <p><strong>File Name:</strong> ${file.name}</p>
        <p><strong>File Size:</strong> ${fileSizeMB} MB</p>
        ${previewFile ? `<p><strong>Preview File:</strong> ${previewFile.name}</p>` : `<p><em>No preview uploaded</em></p>`}
        <br><button id='close-overlay-btn' class='close-overlay-btn'>Close</button>`;

      document.getElementById('close-overlay-btn').addEventListener('click', () => {
        overlay.style.display = 'none';
      });

    } catch (err) {
      if (abortUploadRef.cancelled) {
        showError('Upload was cancelled.', messageContainer);
      } else {
        console.error(err);
        showError(err.message, messageContainer);
      }
      overlay.style.display = 'none';
    } finally {
      submitBtn.disabled = false;
      resetBtn.disabled = false;
    }
  });
});
