// uploadHandler.js (main entry point)
import { loadConfig } from './configLoader.js';
import { validateFormFields } from './formFields.js';
import { buildUploadPayload } from './payloadBuilder.js';
import { uploadFileToS3WithProgress, uploadFileToS3MultiPart } from './uploadUtils.js';
import { showError, showSuccess } from './messageUI.js';


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
  // await populateRegionDropdown(config);

  function fetchWithTimeout(url, timeout = 3000) {
    return Promise.race([
      fetch(url),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out')), timeout)
      )
    ]);
  }

/*
  async function populateRegionDropdown(config, autoSelect = true) {
    const dropdown = document.getElementById('data_region');
    if (!dropdown) return;

    dropdown.innerHTML = `<option value="">Loading regions...</option>`;

    try {
      const response = await fetchWithTimeout(config.REGION_LOOKUP_URL, 3000);
      const regions = await response.json();

      const sortedRegions = Object.entries(regions)
        .filter(([code]) => code !== '#')
        .sort((a, b) => a[1].localeCompare(b[1]));

      dropdown.innerHTML = `<option value="">Select a region</option>`;
      for (const [code, name] of sortedRegions) {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = name;
        dropdown.appendChild(option);
      }

      // Apply Choices.js
      const choices = new Choices(dropdown, {
        searchEnabled: true,
        itemSelectText: '',
        placeholderValue: 'Select a region',
        shouldSort: false
      });

      // ✅ Try to auto-select region based on time zone
      if (autoSelect) {
        const timeZone = Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone;
        const inferredRegion = guessRegionFromTimeZone(timeZone);
        if (inferredRegion && regions[inferredRegion]) {
          dropdown.value = inferredRegion;
          choices.setChoiceByValue(inferredRegion);
        }
      }

    } catch (err) {
        console.error('Failed to load regions:', err);
        const container = dropdown.parentElement;

        // Remove the select dropdown
        if (dropdown) dropdown.remove();

        // Create a fallback input field
        const fallbackInput = document.createElement('input');
        fallbackInput.type = 'text';
        fallbackInput.id = 'data_region';
        fallbackInput.name = 'data_region';
        fallbackInput.required = true;
        fallbackInput.placeholder = 'Enter region manually';
        fallbackInput.classList.add('manual-region-input');

        container.appendChild(fallbackInput);
      }
  }

  function guessRegionFromTimeZone(timeZone) {
    if (!timeZone || typeof timeZone !== 'string') return null;

    const tzToRegionMap = {
      'Australia/Sydney': 'AU_NSW',
      'Australia/Melbourne': 'AU_VIC',
      'Australia/Perth': 'AU_WA',
      'Australia/Brisbane': 'AU_QLD',
      'Pacific/Auckland': 'NZ',
      'America/New_York': 'US_NY',
      'America/Los_Angeles': 'US_CA',
      'America/Chicago': 'US_TX',
      'America/Toronto': 'CA_ON',
      'Europe/London': 'UK',
      'Europe/Dublin': 'IE',
      'Asia/Singapore': 'SG',
    };

    return tzToRegionMap[timeZone] || null;
  }
  */

  const form = document.getElementById('dataForm');

  // Initialize Quill rich text editor for long_description
  const quill = new Quill('#long_description_editor', {
    theme: 'snow',
    placeholder: 'Enter detailed description here...',
    modules: {
      toolbar: [
        ['bold', 'italic', 'underline'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link', 'image'],
        ['clean']
      ]
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
      document.getElementById('file-size-warning').style.display = 'none';
      fileInfo.style.display = 'none';
      submitBtn.disabled = true;

      // 🧹 Clear the Quill editor content
      if (quill) {
        quill.setContents([]);
      }

      // 🧹 Clear hidden long_description input
      document.getElementById('long_description').value = '';

      // ⬆️ Scroll to top of the form
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // 🗺️ Clear the map and WKT text area
      const wktTextarea = document.getElementById('wkt_output');
      if (wktTextarea) {
        wktTextarea.value = '';
        wktTextarea.classList.remove('error');
      }

      // Hide validation error message if shown
      const validationMsg = document.getElementById('wkt-validation-error');
      if (validationMsg) {
        validationMsg.style.display = 'none';
      }

      // Remove drawn polygon from map (via global drawnItems)
      if (typeof drawnItems !== 'undefined') {
        drawnItems.clearLayers();
      }
    });

  if (dataOwnerIdField && !dataOwnerIdField.value) {
    dataOwnerIdField.value = 'f2e4f1e1-8f18-4df0-891c-153b857e22b9';
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
      const apiResponse = await fetch(config.UPLOAD_API_URL, {
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
      form.reset();
      if (fileInfo) fileInfo.style.display = 'none';

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
